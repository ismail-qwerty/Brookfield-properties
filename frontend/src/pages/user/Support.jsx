import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Skeleton, SkeletonRegion } from '../../components/ui';
import ChatMessage from '../../components/ChatMessage';
import useChatMessages from '../../hooks/useChatMessages';
import ChatSupportDashboard from '../support/ChatSupportDashboard';

export default function Support() {
  const { user } = useAuth();

  // If user is ChatSupport, show the admin dashboard
  if (user?.user_type === 'ChatSupport') {
    return <ChatSupportDashboard />;
  }

  // Otherwise show regular user chat interface
  return <UserChatInterface />;
}

function UserChatInterface() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [conversationFailed, setConversationFailed] = useState(false);
  const { messages, loaded, send } = useChatMessages(conversation?.id, { userId: user?.id, markRead: true });
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const loading = !conversationFailed && !loaded;

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initChat = async () => {
    try {
      const { data } = await api.get('/chat/conversation');
      setConversation(data.data);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setConversationFailed(true);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !conversation) return;
    if (selectedImage && !imagePreview) return; // still being read from disk

    const text = newMessage;
    const imageUrl = selectedImage ? imagePreview : null;
    setNewMessage('');
    handleRemoveImage();

    try {
      await send({ text, imageUrl });
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(text);
      alert('Failed to send message. Please try again.');
    }
  };

  const isActive = conversation?.status === 'InProgress';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal top bar — this route renders outside the main layout */}
      <header className="bg-black flex-shrink-0">
        <div className="wrap flex items-center justify-between h-20">
          <Link to="/dashboard" className="font-serif text-[22px] text-white leading-tight">
            Blackstone
          </Link>
          <Link to="/dashboard" className="text-[13px] tracking-wide text-white/60 hover:text-white transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="page-head flex-shrink-0">
        <div className="wrap">
          <div className="eyebrow-light mb-5">Help Center</div>
          <h1 className="display text-white">Customer Support</h1>
          <p className="lede-light mt-4 max-w-xl">
            Our concierge team is on hand to help with your account, transactions and portfolio questions.
          </p>
        </div>
      </div>

        <div className="wrap section-tight">
          <div className="grid lg:grid-cols-[1fr_280px] gap-10">
            {/* Chat Panel */}
            <div className="rounded-[20px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col" style={{ height: 600 }}>
              <div className="bg-black text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <span className="font-serif text-[16px]">B</span>
                  </div>
                  <div>
                    <p className="font-serif text-[16px] leading-tight text-white">Chat Support</p>
                    <p className="text-[12px] text-white/55 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {isActive ? 'Agent responding' : 'Online'}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-white/55">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Active
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3 bg-[#f4f4f5]">
                {loading ? (
                  <SkeletonRegion label="Loading conversation" className="space-y-4">
                    {['justify-start w-56', 'justify-end w-40', 'justify-start w-64', 'justify-end w-48'].map((cls, i) => {
                      const [align, width] = cls.split(' ');
                      const mine = align === 'justify-end';
                      return (
                        <div key={i} className={`flex ${align}`}>
                          <Skeleton
                            className={`h-[62px] ${width} rounded-[16px] ${mine ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
                          />
                        </div>
                      );
                    })}
                  </SkeletonRegion>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <svg className="w-10 h-10 mb-3 text-[var(--ink-25)]" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                    <p className="text-[14px] text-[var(--ink-45)]">Start a conversation with our support team</p>
                  </div>
                ) : (
                  messages.map((msg) => <ChatMessage key={msg.id} msg={msg} mine={msg.sender_id === user?.id} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="border-t bg-white px-6 py-4 flex-shrink-0" style={{ borderColor: 'var(--rule)' }}>
                {imagePreview && (
                  <div className="mb-3 relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-h-32 rounded-[10px] border" style={{ borderColor: 'var(--rule)' }} />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center hover:bg-[var(--ink-70)]"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-[var(--ink-45)] hover:text-black hover:bg-[var(--paper-alt)] disabled:opacity-50 transition-colors"
                    disabled={!conversation}
                    title="Attach image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-full bg-[var(--paper-alt)] border border-transparent text-[#111111] placeholder:text-[#8a8a8a] focus:outline-none focus:border-black focus:bg-white transition-colors text-[15px]"
                    disabled={!conversation}
                  />
                  <button
                    type="submit"
                    disabled={!conversation || (!newMessage.trim() && !selectedImage)}
                    className="w-11 h-11 rounded-full bg-black text-white hover:bg-[var(--ink-70)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <aside>
              <div className="eyebrow mb-6">Good To Know</div>
              <ul className="space-y-5 text-[14px]" style={{ color: 'var(--ink-70)' }}>
                <li className="pb-5 border-b" style={{ borderColor: 'var(--rule)' }}>
                  Average response time is under 5 minutes during business hours.
                </li>
                <li className="pb-5 border-b" style={{ borderColor: 'var(--rule)' }}>
                  Mention "URGENT" in your message if the matter is time-sensitive.
                </li>
                <li>
                  Include your transaction ID for faster resolution.
                </li>
              </ul>
            </aside>
          </div>
        </div>
    </div>
  );
}
