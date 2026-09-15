import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Skeleton, SkeletonRegion } from './ui';

export default function FloatingChatButton() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const [panelHeight, setPanelHeight] = useState(560);
  const [showGreeting, setShowGreeting] = useState(false);

  const isAdminOrSupport = user?.user_type === 'Admin' || user?.user_type === 'ChatSupport';
  const isHiddenPage = location.pathname === '/support' || location.pathname.startsWith('/administration');

  const dismissGreeting = () => {
    setShowGreeting(false);
    try { sessionStorage.setItem('chat_greeting_dismissed', '1'); } catch { /* storage unavailable */ }
  };

  // Proactively surface a friendly greeting bubble above the launcher a
  // moment after the page loads, once per browser session, so the chat
  // entry point doesn't rely on the user noticing a plain icon.
  useEffect(() => {
    if (!user || isAdminOrSupport || isHiddenPage) return;
    let dismissed = false;
    try { dismissed = !!sessionStorage.getItem('chat_greeting_dismissed'); } catch { /* storage unavailable */ }
    if (dismissed) return;
    const timer = setTimeout(() => setShowGreeting(true), 1500);
    return () => clearTimeout(timer);
  }, [user, isAdminOrSupport, isHiddenPage]);

  // Listen for external open trigger (from Contact nav buttons)
  useEffect(() => {
    const handler = () => { setOpen(true); dismissGreeting(); };
    window.addEventListener('open-chat-widget', handler);
    return () => window.removeEventListener('open-chat-widget', handler);
  }, []);

  // Poll unread count when widget is closed
  useEffect(() => {
    if (!user || isAdminOrSupport || isHiddenPage) return;
    const interval = setInterval(async () => {
      if (!open) {
        try {
          const { data } = await api.get('/chat/unread-count');
          setUnreadCount(data.data || 0);
        } catch {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, open, isHiddenPage]);

  // Init chat when widget opens
  useEffect(() => {
    if (open && !conversation) {
      initChat();
    }
    if (open && conversation?.id) {
      startPolling(conversation.id);
    }
    if (!open) {
      stopPolling();
    }
    return () => stopPolling();
  }, [open, conversation?.id]);

  useEffect(() => {
    if (open && messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, open]);

  // Keep the panel from ever extending above the visible viewport (or
  // underneath the site's own sticky header) on short windows.
  useEffect(() => {
    if (!open) return;
    const recalc = () => {
      const header = document.querySelector('header');
      const topClearance = Math.max(16, (header?.getBoundingClientRect().bottom || 0) + 16);
      const available = window.innerHeight - 96 - topClearance; // 96 = bottom-24 offset
      setPanelHeight(Math.max(320, Math.min(560, available)));
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [open]);

  const initChat = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/chat/conversation');
      setConversation(data.data);
      await fetchMessages(data.data.id);
    } catch (e) {
      console.error('Chat init failed', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    if (!convId) return;
    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(data.data || []);
      setUnreadCount(0);
      await api.put(`/chat/conversations/${convId}/read`);
    } catch {}
  };

  const startPolling = (convId) => {
    stopPolling();
    pollRef.current = setInterval(() => fetchMessages(convId), 2000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !conversation) return;
    setSending(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        const reader = new FileReader();
        imageUrl = await new Promise((res, rej) => {
          reader.onloadend = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(selectedImage);
        });
      }
      await api.post(`/chat/conversations/${conversation.id}/messages`, {
        message: newMessage || 'Sent an image',
        image_url: imageUrl,
      });
      setNewMessage('');
      handleRemoveImage();
      await fetchMessages(conversation.id);
    } catch {
      alert('Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (!user || isAdminOrSupport || isHiddenPage) return null;

  const isActive = conversation?.status === 'InProgress';

  return (
    <>
      {/* Proactive greeting bubble */}
      <div
        className={`fixed bottom-24 right-6 z-40 w-[270px] max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out ${
          showGreeting && !open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <div className="relative bg-white rounded-[18px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] border border-black/5 pl-5 pr-9 py-4">
          <button
            onClick={dismissGreeting}
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[var(--ink-45)] hover:text-black hover:bg-[var(--paper-alt)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button onClick={() => { setOpen(true); dismissGreeting(); }} className="text-left w-full">
            <p className="font-serif text-[15px] text-black leading-snug mb-1">Hi, how can we help?</p>
            <p className="text-[12.5px] text-[var(--ink-45)] leading-relaxed">Our team is online and ready to answer any questions.</p>
          </button>
          <div className="absolute -bottom-[7px] right-8 w-3.5 h-3.5 bg-white rotate-45 border-r border-b border-black/5"></div>
        </div>
      </div>

      {/* Launcher */}
      <button
        onClick={() => { setOpen((o) => !o); dismissGreeting(); }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-black text-white flex items-center justify-center transition-all duration-200 hover:scale-105 hover:bg-[var(--ink-70)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
        title="Customer Support"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-medium rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-[20px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden origin-bottom-right transition-all duration-200 ease-out ${
          open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3 pointer-events-none'
        }`}
        style={{ height: panelHeight }}
      >
        {/* Header */}
        <div className="bg-black text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="font-serif text-[14px]">B</span>
            </div>
            <div className="min-w-0">
              <p className="font-serif text-[15px] leading-tight truncate">Blackstone Support</p>
              <p className="text-[11px] text-white/55 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                {isActive ? 'Agent responding' : 'Online'}
              </p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[var(--paper-alt)]">
          {loading ? (
            <SkeletonRegion label="Loading conversation" className="space-y-3">
              {[
                ['justify-start', 'w-44', 'rounded-bl-[4px]'],
                ['justify-end', 'w-32', 'rounded-br-[4px]'],
                ['justify-start', 'w-52', 'rounded-bl-[4px]'],
              ].map(([align, width, corner], i) => (
                <div key={i} className={`flex ${align}`}>
                  <Skeleton className={`h-[54px] ${width} rounded-[16px] ${corner}`} />
                </div>
              ))}
            </SkeletonRegion>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <svg className="w-9 h-9 mb-3 text-[var(--ink-25)]" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <p className="text-[13px] text-[var(--ink-45)]">How can we help you today?</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-[16px] ${
                    msg.sender_id === user?.id
                      ? 'bg-black text-white rounded-br-[4px]'
                      : 'bg-white text-black rounded-bl-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                  }`}
                >
                  {msg.message_type === 'image' && msg.image_url ? (
                    <>
                      <img src={msg.image_url} alt="Shared" className="max-w-full h-auto max-h-40 mb-1.5 cursor-pointer" onClick={() => window.open(msg.image_url, '_blank')} />
                      {msg.message !== 'Sent an image' && <p>{msg.message}</p>}
                    </>
                  ) : (
                    <p className="break-words">{msg.message}</p>
                  )}
                  <p className={`text-[10px] mt-1 tnum ${msg.sender_id === user?.id ? 'text-white/60' : 'text-[var(--ink-45)]'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-[var(--rule)] bg-white px-3.5 py-3 flex-shrink-0">
          {imagePreview && (
            <div className="mb-2.5 relative inline-block">
              <img src={imagePreview} alt="preview" className="max-h-16 rounded-[10px] border border-[var(--rule)]" />
              <button type="button" onClick={handleRemoveImage} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[var(--ink-45)] hover:text-black hover:bg-[var(--paper-alt)] transition-colors" disabled={sending}>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 text-[13px] px-4 py-2.5 rounded-full bg-[var(--paper-alt)] border border-transparent focus:outline-none focus:border-black focus:bg-white transition-colors"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !selectedImage)}
              className="w-9 h-9 rounded-full bg-black hover:bg-[var(--ink-70)] disabled:opacity-30 text-white flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
