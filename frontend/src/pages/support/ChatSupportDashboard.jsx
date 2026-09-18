import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Skeleton, SkeletonRegion } from '../../components/ui';
import useChatMessages from '../../hooks/useChatMessages';
import { getCachedConversations, setCachedConversations } from '../../utils/chatCache';

// The agent console is used for hours at a stretch, so unlike the customer
// chat (which follows the site's black-and-white brand) it uses a soft,
// messenger-style palette modeled on WhatsApp's light theme: no pure black or
// white surfaces, muted text, and a single calm green accent.
const C = {
  appBg: '#dfe3e6',
  panel: '#ffffff',
  bar: '#f0f2f5',
  divider: '#e9edef',
  hover: '#f5f6f6',
  selected: '#f0f2f5',
  text: '#111b21',
  subtext: '#667781',
  icon: '#54656f',
  accent: '#00a884',
  accentDark: '#008069',
  accentSoft: '#e7fce3',
  chatBg: '#efeae2',
  outgoing: '#d9fdd3',
  incoming: '#ffffff',
  unread: '#25d366',
};

// Waiting and in-progress chats live in one list; closed ones are archive.
const STATUS_TABS = [
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
];

const AVATAR_COLORS = ['#6bcbef', '#e5a50a', '#ff8e4f', '#35cd96', '#a88bfc', '#e5739c', '#53a7e8', '#f2786b'];

function Avatar({ name = '?', size = 44 }) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  const hash = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      aria-hidden="true"
      className="rounded-full flex items-center justify-center flex-shrink-0 font-medium text-white select-none"
      style={{ width: size, height: size, background: AVATAR_COLORS[hash % AVATAR_COLORS.length], fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Like a messenger list: time for today, "Yesterday", otherwise a short date.
function listStamp(iso) {
  const label = dayLabel(iso);
  if (label === 'Today') return timeOf(iso);
  if (label === 'Yesterday') return label;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// Short double beep for a newly arrived customer message. Generated rather
// than shipped as an audio file, and silently ignored if the browser blocks
// audio until the agent has interacted with the page.
function playNewMessageChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const play = (startAt, freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.2);
    };
    play(ctx.currentTime, 880);
    play(ctx.currentTime + 0.16, 1170);
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Audio is a nicety; never let it break the console.
  }
}

function Ticks({ pending }) {
  if (pending) {
    return (
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-label="Sending">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 4.8V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 11" className="w-4 h-3" aria-label="Sent">
      <path d="M1 5.8l3.4 3.4L11 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bubble({ msg, mine, onDelete }) {
  const hasImage = msg.message_type === 'image' && msg.image_url;
  const caption = hasImage ? (msg.message !== 'Sent an image' ? msg.message : null) : msg.message;
  const [menuOpen, setMenuOpen] = useState(false);
  const holdTimer = useRef(null);

  // Deleted messages stay in place as a tombstone so the thread still reads in
  // order, matching what both sides see.
  if (msg.deleted_at) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} px-[6%] md:px-[8%]`}>
        <div
          className="max-w-[85%] md:max-w-[65%] rounded-[8px] pl-2.5 pr-3 py-1.5 flex items-center gap-1.5"
          style={{ background: mine ? C.outgoing : C.incoming, boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)', opacity: 0.75 }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke={C.subtext} strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M6 18L18 6" strokeLinecap="round" />
          </svg>
          <span className="text-[13.5px] italic" style={{ color: C.subtext }}>This message was deleted</span>
        </div>
      </div>
    );
  }

  // Hover on a desktop, press and hold on a touch screen.
  const startHold = () => {
    holdTimer.current = setTimeout(() => setMenuOpen(true), 450);
  };
  const cancelHold = () => clearTimeout(holdTimer.current);

  return (
    <div
      className={`group relative flex ${mine ? 'justify-end' : 'justify-start'} px-[6%] md:px-[8%]`}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchMove={cancelHold}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className={`absolute z-20 top-1 ${mine ? 'right-[8%]' : 'left-[8%]'} rounded-[8px] overflow-hidden`}
            style={{ background: C.panel, boxShadow: '0 4px 14px rgba(11,20,26,0.2)' }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete?.(msg);
              }}
              className="block w-full text-left px-4 py-2.5 text-[14px] whitespace-nowrap hover:bg-black/5"
              style={{ color: '#c0392b' }}
            >
              Delete message
            </button>
          </div>
        </>
      )}

      {/* Three dots, shown on hover next to the bubble */}
      <button
        type="button"
        aria-label="Message options"
        onClick={() => setMenuOpen((v) => !v)}
        className={`self-center mx-1 w-7 h-7 rounded-full items-center justify-center hidden group-hover:flex hover:bg-black/5 ${mine ? 'order-first' : 'order-last'}`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill={C.icon} aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      <div
        className={`relative max-w-[85%] md:max-w-[65%] rounded-[8px] ${mine ? 'rounded-tr-[2px]' : 'rounded-tl-[2px]'} ${
          hasImage ? 'p-1' : 'pl-2.5 pr-2 pt-1.5 pb-1.5'
        } ${msg.pending ? 'opacity-80' : ''}`}
        style={{ background: mine ? C.outgoing : C.incoming, boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
      >
        {hasImage && (
          <img
            src={msg.image_url}
            alt="Shared attachment"
            className="block max-w-full max-h-72 rounded-[6px] cursor-pointer"
            onClick={() => window.open(msg.image_url, '_blank')}
          />
        )}
        {caption && (
          <p
            className={`text-[14.2px] leading-[19px] whitespace-pre-wrap break-words ${hasImage ? 'px-1.5 pt-1.5' : ''}`}
            style={{ color: C.text }}
          >
            {caption}
            {/* Reserves room so the timestamp can sit on the last line. */}
            <span className="inline-block w-[64px]" aria-hidden="true" />
          </p>
        )}
        <span
          className={`flex items-center gap-1 text-[11px] leading-none tnum ${
            caption ? 'absolute right-2 bottom-1.5' : 'justify-end px-1.5 pt-1'
          }`}
          style={{ color: C.subtext }}
        >
          {msg.pending ? 'Sending' : timeOf(msg.created_at)}
          {mine && <Ticks pending={msg.pending} />}
        </span>
      </div>
    </div>
  );
}

export default function ChatSupportDashboard() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState(() => getCachedConversations() || []);
  const [selectedConv, setSelectedConv] = useState(null);
  const {
    messages,
    loaded: messagesLoaded,
    send,
    remove,
  } = useChatMessages(selectedConv?.id, { userId: user?.id, markRead: true, cache: true });
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [filter, setFilter] = useState('Active');
  const [search, setSearch] = useState('');
  // Cached rows render at once; only a cold start shows skeletons.
  const [loading, setLoading] = useState(() => !getCachedConversations());
  const [canned, setCanned] = useState([]);
  const [slash, setSlash] = useState(null);
  const [showCanned, setShowCanned] = useState(false);
  const [cannedDraft, setCannedDraft] = useState({ title: '', body: '' });
  const [cannedError, setCannedError] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const unreadSeenRef = useRef(null);
  const selectedIdRef = useRef(null);

  selectedIdRef.current = selectedConv?.id || null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Reset the count so switching conversations always scrolls to the
  // latest message of the newly opened thread.
  useEffect(() => {
    prevMessageCountRef.current = 0;
  }, [selectedConv?.id]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/support/conversations?status=${filter}`);
      const list = data.data || [];
      setConversations(list);
      if (filter === 'Active') setCachedConversations(list);

      // Alert on anything that arrived since the last poll, except in the
      // thread currently on screen (which is being read anyway).
      const seen = unreadSeenRef.current;
      const next = new Map(list.map((c) => [String(c.id), c.unread_count || 0]));
      if (seen) {
        const gotNew = [...next.entries()].some(
          ([id, count]) => count > (seen.get(id) || 0) && id !== String(selectedIdRef.current)
        );
        if (gotNew) playNewMessageChime();
      }
      unreadSeenRef.current = next;
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(!(filter === 'Active' && getCachedConversations()));
    fetchConversations();
    const convInterval = setInterval(fetchConversations, 3000);
    return () => clearInterval(convInterval);
  }, [fetchConversations, filter]);

  // Saved messages are small and rarely change, so they load once.
  const loadCanned = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/support/canned');
      setCanned(data.data || []);
    } catch (error) {
      console.error('Failed to fetch saved messages:', error);
    }
  }, []);

  useEffect(() => {
    loadCanned();
  }, [loadCanned]);

  // Unread total drives the tab title, so a background tab still shows it.
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Chat Support` : 'Chat Support';
    return () => {
      document.title = 'Blackstone';
    };
  }, [totalUnread]);

  // Messages load as soon as the thread is selected; claiming an unassigned
  // conversation happens alongside rather than blocking that.
  const handleSelectConversation = async (conv) => {
    setSelectedConv(conv);
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)));

    if (!conv.support_agent_id) {
      try {
        await api.put(`/chat/support/conversations/${conv.id}/assign`);
        fetchConversations();
      } catch (error) {
        console.error('Failed to assign:', error);
      }
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetComposerHeight = () => {
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedConv) return;
    if (selectedImage && !imagePreview) return; // still being read from disk

    const text = newMessage;
    // The preview already holds the image as a data URL, so there's nothing
    // left to read before sending.
    const imageUrl = selectedImage ? imagePreview : null;
    setNewMessage('');
    setSlash(null);
    resetComposerHeight();
    handleRemoveImage();

    try {
      await send({ text, imageUrl });
    } catch (error) {
      console.error('Failed to send:', error);
      setNewMessage(text);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleDeleteMessage = async (msg) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await remove(msg.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete message');
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConv) return;
    try {
      await api.put(`/chat/support/conversations/${selectedConv.id}/close`);
      setSelectedConv(null);
      fetchConversations();
    } catch (error) {
      console.error('Failed to close:', error);
    }
  };

  // Composer: grows with the text, and watches for a "/shortcut" being typed.
  const handleComposerChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;

    const upToCursor = value.slice(0, el.selectionStart);
    const match = upToCursor.match(/(?:^|\s)\/([\w-]*)$/);
    setSlash(match ? { query: match[1].toLowerCase(), index: 0 } : null);
  };

  const slashMatches = slash
    ? canned.filter((c) => c.title.toLowerCase().includes(slash.query)).slice(0, 6)
    : [];

  const applyCanned = (item) => {
    const el = inputRef.current;
    const cursor = el ? el.selectionStart : newMessage.length;
    const before = newMessage.slice(0, cursor).replace(/(?:^|\s)\/[\w-]*$/, (m) => (m.startsWith(' ') ? ' ' : ''));
    const after = newMessage.slice(cursor);
    const next = `${before}${item.body}${after}`;
    setNewMessage(next);
    setSlash(null);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = (before + item.body).length;
      el.setSelectionRange(caret, caret);
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
    });
  };

  const handleComposerKeyDown = (e) => {
    if (slash && slashMatches.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlash({ ...slash, index: (slash.index + 1) % slashMatches.length });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlash({ ...slash, index: (slash.index - 1 + slashMatches.length) % slashMatches.length });
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyCanned(slashMatches[slash.index] || slashMatches[0]);
        return;
      }
      if (e.key === 'Escape') {
        setSlash(null);
        return;
      }
    }

    // Enter sends, Shift+Enter starts a new line.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const saveCanned = async (e) => {
    e.preventDefault();
    setCannedError('');
    try {
      await api.post('/chat/support/canned', cannedDraft);
      setCannedDraft({ title: '', body: '' });
      loadCanned();
    } catch (error) {
      setCannedError(error.response?.data?.error || 'Failed to save message');
    }
  };

  const deleteCanned = async (id) => {
    try {
      await api.delete(`/chat/support/canned/${id}`);
      loadCanned();
    } catch (error) {
      console.error('Failed to delete saved message:', error);
    }
  };

  const query = search.trim().toLowerCase();
  const visibleConversations = query
    ? conversations.filter(
        (c) =>
          c.user?.username?.toLowerCase().includes(query) ||
          c.user?.email?.toLowerCase().includes(query) ||
          c.guest_label?.toLowerCase().includes(query)
      )
    : conversations;

  const canSend = !!newMessage.trim() || !!selectedImage;

  return (
    <div className="h-screen flex md:p-4 lg:px-10 lg:py-5" style={{ background: C.appBg, color: C.text }}>
      <div className="flex-1 flex min-w-0 overflow-hidden md:rounded-[4px] shadow-[0_6px_18px_rgba(11,20,26,0.08)]">
        {/* Sidebar: hidden on phones while a chat is open, like a messenger */}
        <aside
          className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[360px] lg:w-[400px] flex-shrink-0 border-r`}
          style={{ background: C.panel, borderColor: C.divider }}
        >
          <div className="h-[60px] px-4 flex items-center justify-between flex-shrink-0" style={{ background: C.bar }}>
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name="Chat Support" size={40} />
              <div className="min-w-0">
                <div className="text-[15px] font-medium truncate" style={{ color: C.text }}>
                  Chat Support
                </div>
                <div className="text-[12.5px] truncate" style={{ color: C.subtext }}>
                  {totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'}` : 'Support console'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowCanned(true)}
                title="Saved messages"
                aria-label="Saved messages"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={C.icon} strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 3h12a1 1 0 011 1v16l-7-4-7 4V4a1 1 0 011-1z" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={logout}
                className="text-[13px] font-medium px-3 py-1.5 rounded-full transition-colors hover:bg-black/5"
                style={{ color: C.icon }}
              >
                Log out
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-2 pb-1.5 flex-shrink-0">
            <label className="flex items-center gap-3 h-[35px] px-3 rounded-[8px]" style={{ background: C.bar }}>
              <svg viewBox="0 0 24 24" className="w-[17px] h-[17px] flex-shrink-0" fill="none" stroke={C.icon} strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email"
                aria-label="Search conversations"
                className="flex-1 min-w-0 bg-transparent text-[14px] focus:outline-none placeholder:text-[#667781]"
                style={{ color: C.text }}
              />
            </label>
          </div>

          {/* Status filter chips */}
          <div className="px-3 pb-2 flex gap-2 flex-shrink-0 border-b" style={{ borderColor: C.divider }}>
            {STATUS_TABS.map((tab) => {
              const active = filter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  aria-pressed={active}
                  className="h-8 px-3.5 rounded-full text-[14px] transition-colors"
                  style={active ? { background: C.accentSoft, color: C.accentDark } : { background: C.bar, color: C.icon }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SkeletonRegion label="Loading conversations">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 h-[72px]">
                    <Skeleton className="w-[49px] h-[49px] rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0 py-3 border-b" style={{ borderColor: C.divider }}>
                      <div className="flex justify-between items-center mb-2 gap-3">
                        <Skeleton className={`h-4 ${i % 2 ? 'w-24' : 'w-32'}`} />
                        <Skeleton className="h-3 w-10 flex-shrink-0" />
                      </div>
                      <Skeleton className={`h-3.5 ${i % 3 ? 'w-44' : 'w-52'}`} />
                    </div>
                  </div>
                ))}
              </SkeletonRegion>
            ) : visibleConversations.length === 0 ? (
              <div className="px-8 py-14 text-center text-[14px]" style={{ color: C.subtext }}>
                {query ? 'No conversations match your search.' : `No ${filter.toLowerCase()} conversations.`}
              </div>
            ) : (
              visibleConversations.map((conv) => {
                const active = selectedConv?.id === conv.id;
                const name = conv.user?.username || conv.guest_label || 'Guest';
                const unread = active ? 0 : conv.unread_count || 0;
                const preview = conv.last_message
                  ? `${conv.last_message.from_customer ? '' : 'You: '}${conv.last_message.text || ''}`
                  : conv.user?.email || 'Not signed in';
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className="w-full text-left flex items-center gap-3 pl-3 h-[72px] transition-colors"
                    style={{ background: active ? C.selected : undefined }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.hover; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ''; }}
                  >
                    <Avatar name={name} size={49} />
                    <div className="flex-1 min-w-0 h-full flex flex-col justify-center pr-4 border-b" style={{ borderColor: C.divider }}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[16px] truncate" style={{ color: C.text }}>
                          {name}
                        </span>
                        <span
                          className="text-[12px] tnum flex-shrink-0"
                          style={{ color: unread ? C.accent : C.subtext }}
                        >
                          {listStamp(conv.last_message?.created_at || conv.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-0.5">
                        <span className="text-[14px] truncate" style={{ color: C.subtext }}>
                          {preview}
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          {!conv.support_agent_id && conv.status === 'Open' && (
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                              style={{ background: C.accentSoft, color: C.accentDark }}
                            >
                              New
                            </span>
                          )}
                          {unread > 0 && (
                            <span
                              className="min-w-[20px] h-5 px-1.5 rounded-full text-[12px] font-medium text-white flex items-center justify-center tnum"
                              style={{ background: C.unread }}
                            >
                              {unread}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Conversation */}
        <main className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {selectedConv ? (
            <>
              <div
                className="h-[60px] px-4 flex items-center justify-between gap-3 flex-shrink-0 border-l"
                style={{ background: C.bar, borderColor: C.divider }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedConv(null)}
                    aria-label="Back to conversations"
                    className="md:hidden -ml-1 w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={C.icon} strokeWidth="2" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <Avatar name={selectedConv.user?.username || selectedConv.guest_label || 'Guest'} size={40} />
                  <div className="min-w-0">
                    <div className="text-[16px] truncate" style={{ color: C.text }}>
                      {selectedConv.user?.username || selectedConv.guest_label || 'Guest'}
                    </div>
                    <div className="text-[13px] truncate" style={{ color: C.subtext }}>
                      {selectedConv.user?.email || 'Not signed in'}
                    </div>
                  </div>
                </div>
                {selectedConv.status !== 'Closed' && (
                  <button
                    onClick={handleCloseConversation}
                    className="flex-shrink-0 h-9 px-4 rounded-full text-[14px] font-medium border transition-colors hover:bg-white"
                    style={{ color: C.accentDark, borderColor: '#d1d7db' }}
                  >
                    Close chat
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto py-3" style={{ background: C.chatBg }}>
                {!messagesLoaded ? (
                  <SkeletonRegion label="Loading messages" className="space-y-2 px-[8%] pt-4">
                    {[['justify-start', 'w-64'], ['justify-end', 'w-44'], ['justify-start', 'w-56']].map(([align, width], i) => (
                      <div key={i} className={`flex ${align}`}>
                        <Skeleton className={`h-[42px] ${width} rounded-[8px]`} />
                      </div>
                    ))}
                  </SkeletonRegion>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center pt-6">
                    <span
                      className="text-[12.5px] px-3 py-1.5 rounded-[8px]"
                      style={{ background: '#fff8c4', color: '#54656f', boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
                    >
                      No messages in this conversation yet.
                    </span>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const prev = messages[i - 1];
                    const newDay = !prev || !sameDay(new Date(prev.created_at), new Date(msg.created_at));
                    // Consecutive messages from the same sender sit closer together.
                    const grouped = prev && !newDay && prev.sender_id === msg.sender_id;
                    return (
                      <div key={msg.id} className={i === 0 ? '' : grouped ? 'mt-0.5' : 'mt-2.5'}>
                        {newDay && (
                          <div className="flex justify-center my-3">
                            <span
                              className="text-[12.5px] px-3 py-1.5 rounded-[8px] uppercase tracking-wide"
                              style={{ background: C.incoming, color: C.icon, boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)' }}
                            >
                              {dayLabel(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <Bubble msg={msg} mine={msg.sender_id === user?.id} onDelete={handleDeleteMessage} />
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="relative flex-shrink-0 px-4 py-2.5" style={{ background: C.bar }}>
                {/* Saved message picker, opened by typing "/" */}
                {slash && slashMatches.length > 0 && (
                  <div
                    className="absolute left-4 right-4 bottom-[calc(100%-6px)] mb-1 rounded-[10px] overflow-hidden z-20"
                    style={{ background: C.panel, boxShadow: '0 8px 24px rgba(11,20,26,0.18)' }}
                  >
                    <div className="px-3 py-2 text-[12px] border-b" style={{ color: C.subtext, borderColor: C.divider }}>
                      Saved messages {slash.query ? `matching "${slash.query}"` : ''} · Enter to insert
                    </div>
                    {slashMatches.map((item, i) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyCanned(item);
                        }}
                        onMouseEnter={() => setSlash((s) => (s ? { ...s, index: i } : s))}
                        className="w-full text-left px-3 py-2.5 transition-colors"
                        style={{ background: i === slash.index ? C.selected : undefined }}
                      >
                        <div className="text-[14px] font-medium" style={{ color: C.text }}>
                          /{item.title}
                        </div>
                        <div className="text-[13px] truncate" style={{ color: C.subtext }}>
                          {item.body}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {imagePreview && (
                  <div className="mb-2.5 relative inline-block">
                    <img src={imagePreview} alt="Attachment preview" className="max-h-32 rounded-[8px] bg-white p-1 shadow-sm" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      aria-label="Remove attachment"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-[12px]"
                      style={{ background: C.icon }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="support-image-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/5"
                    title="Attach image"
                    aria-label="Attach image"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke={C.icon} strokeWidth={1.8} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={newMessage}
                    onChange={handleComposerChange}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Type a message, or / for a saved one"
                    aria-label="Message"
                    className="flex-1 min-w-0 py-[11px] px-4 rounded-[18px] bg-white text-[15px] leading-[20px] resize-none focus:outline-none placeholder:text-[#667781]"
                    style={{ color: C.text, maxHeight: 132 }}
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="Send"
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: canSend ? C.accent : 'transparent' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" aria-hidden="true">
                      <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" fill={canSend ? '#ffffff' : '#8696a0'} />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center text-center px-10 border-l"
              style={{ background: '#f8f9fa', borderColor: C.divider, borderBottom: `6px solid ${C.accent}` }}
            >
              <div
                className="w-[88px] h-[88px] rounded-full flex items-center justify-center mb-7"
                style={{ background: C.accentSoft }}
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke={C.accentDark} strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h2 className="font-sans text-[26px] font-light mb-3" style={{ color: '#41525d' }}>
                Chat Support
              </h2>
              <p className="text-[14px] max-w-[440px] leading-relaxed" style={{ color: C.subtext }}>
                Select a conversation from the list to read and reply. Waiting and in progress chats share one list,
                and unread counts appear on the right of each row.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Saved messages manager */}
      {showCanned && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(11,20,26,0.55)' }}
          onClick={() => setShowCanned(false)}
        >
          <div
            className="w-full max-w-lg rounded-[10px] overflow-hidden"
            style={{ background: C.panel }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[56px] px-5 flex items-center justify-between" style={{ background: C.bar }}>
              <span className="text-[16px]" style={{ color: C.text }}>Saved messages</span>
              <button
                onClick={() => setShowCanned(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5"
                style={{ color: C.icon }}
              >
                ✕
              </button>
            </div>

            <div className="max-h-[42vh] overflow-y-auto">
              {canned.length === 0 ? (
                <p className="px-5 py-8 text-center text-[14px]" style={{ color: C.subtext }}>
                  No saved messages yet. Add one below, then type / in the chat to use it.
                </p>
              ) : (
                canned.map((item) => (
                  <div key={item.id} className="px-5 py-3 border-b flex items-start gap-3" style={{ borderColor: C.divider }}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium" style={{ color: C.text }}>/{item.title}</div>
                      <p className="text-[13px] whitespace-pre-wrap" style={{ color: C.subtext }}>{item.body}</p>
                    </div>
                    <button
                      onClick={() => deleteCanned(item.id)}
                      className="text-[13px] flex-shrink-0 hover:underline"
                      style={{ color: '#c0392b' }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={saveCanned} className="px-5 py-4 border-t space-y-3" style={{ borderColor: C.divider }}>
              {cannedError && <p className="text-[13px]" style={{ color: '#c0392b' }}>{cannedError}</p>}
              <input
                type="text"
                value={cannedDraft.title}
                onChange={(e) => setCannedDraft({ ...cannedDraft, title: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                placeholder="Shortcut, e.g. welcome"
                maxLength={60}
                required
                className="w-full h-10 px-3 rounded-[8px] text-[14px] focus:outline-none"
                style={{ background: C.bar, color: C.text }}
              />
              <textarea
                value={cannedDraft.body}
                onChange={(e) => setCannedDraft({ ...cannedDraft, body: e.target.value })}
                placeholder="Message text"
                rows={3}
                required
                className="w-full px-3 py-2 rounded-[8px] text-[14px] resize-none focus:outline-none"
                style={{ background: C.bar, color: C.text }}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCannedDraft({ title: '', body: newMessage })}
                  className="h-9 px-4 rounded-full text-[14px]"
                  style={{ color: C.icon }}
                >
                  Use current draft
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-full text-[14px] font-medium text-white"
                  style={{ background: C.accent }}
                >
                  Save message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
