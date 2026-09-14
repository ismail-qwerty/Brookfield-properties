import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

export default function ChatSupportDashboard() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [filter, setFilter] = useState('Open');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevMessageCountRef = useRef(0);

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

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  useEffect(() => {
    // Poll conversations every 3 seconds
    const convInterval = setInterval(fetchConversations, 3000);
    return () => clearInterval(convInterval);
  }, [filter]);

  useEffect(() => {
    // Poll messages every 2 seconds when a conversation is selected
    if (selectedConv?.id) {
      const msgInterval = setInterval(() => fetchMessages(selectedConv.id), 2000);
      return () => clearInterval(msgInterval);
    }
  }, [selectedConv?.id]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get(`/chat/support/conversations?status=${filter}`);
      setConversations(data.data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(data.data || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSelectConversation = async (conv) => {
    setSelectedConv(conv);
    await fetchMessages(conv.id);
    
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedConv) return;

    try {
      setUploading(true);
      let imageUrl = null;
      
      if (selectedImage) {
        // Convert image to base64
        const reader = new FileReader();
        imageUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
      }

      await api.post(`/chat/conversations/${selectedConv.id}/messages`, {
        message: newMessage || 'Sent an image',
        image_url: imageUrl,
      });
      
      setNewMessage('');
      handleRemoveImage();
      await fetchMessages(selectedConv.id);
    } catch (error) {
      console.error('Failed to send:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConv) return;
    try {
      await api.put(`/chat/support/conversations/${selectedConv.id}/close`);
      setSelectedConv(null);
      setMessages([]);
      fetchConversations();
    } catch (error) {
      console.error('Failed to close:', error);
    }
  };

  const statusTabs = ['Open', 'InProgress', 'Closed'];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-black flex-shrink-0">
        <div className="flex items-center justify-between h-20 px-8">
          <div className="flex items-baseline gap-4">
            <span className="font-serif text-[20px] text-white leading-tight">Blackstone</span>
            <span className="eyebrow-light hidden sm:inline">Support Console</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[13px] text-white/60">{user?.username}</span>
            <button
              onClick={logout}
              className="text-[13px] tracking-wide text-white/60 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[340px_1fr] min-h-0">
        {/* Conversations */}
        <div className="border-r flex flex-col min-h-0" style={{ borderColor: 'var(--rule)' }}>
          <div className="px-6 py-5 border-b flex-shrink-0" style={{ borderColor: 'var(--rule)' }}>
            <div className="eyebrow mb-4">Conversations</div>
            <div className="flex gap-5">
              {statusTabs.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`relative text-[13px] tracking-wide pb-2 transition-colors ${
                    filter === status
                      ? 'text-black after:absolute after:left-0 after:-bottom-px after:h-px after:w-full after:bg-black'
                      : 'text-[var(--ink-45)] hover:text-black'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-10 text-center text-[14px] text-[var(--ink-45)]">No conversations</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`px-6 py-4 border-b cursor-pointer transition-colors ${
                    selectedConv?.id === conv.id ? 'bg-[var(--paper-alt)]' : 'hover:bg-[var(--paper-alt)]'
                  }`}
                  style={{
                    borderColor: 'var(--rule)',
                    borderLeft: selectedConv?.id === conv.id ? '2px solid black' : '2px solid transparent',
                  }}
                >
                  <div className="flex justify-between items-baseline mb-1 gap-3">
                    <span className="text-[14px] font-normal truncate">{conv.user?.username}</span>
                    <span className="text-[11px] text-[var(--ink-45)] tnum flex-shrink-0">
                      {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--ink-45)] truncate">{conv.user?.email}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="flex flex-col min-h-0">
          {selectedConv ? (
            <>
              <div className="px-6 py-5 flex items-center justify-between bg-black text-white flex-shrink-0">
                <div>
                  <p className="font-serif text-[16px] leading-tight">{selectedConv.user?.username}</p>
                  <p className="text-[12px] text-white/55 mt-0.5">{selectedConv.user?.email}</p>
                </div>
                <button onClick={handleCloseConversation} className="btn-on-dark">
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[var(--paper-alt)]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 text-[14px] leading-relaxed rounded-[16px] ${
                        msg.sender_id === user?.id
                          ? 'bg-black text-white rounded-br-[4px]'
                          : 'bg-white text-black rounded-bl-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                      }`}
                    >
                      {msg.message_type === 'image' && msg.image_url ? (
                        <>
                          <img
                            src={msg.image_url}
                            alt="Shared"
                            className="max-w-full h-auto max-h-64 mb-2 cursor-pointer"
                            onClick={() => window.open(msg.image_url, '_blank')}
                          />
                          {msg.message !== 'Sent an image' && <p>{msg.message}</p>}
                        </>
                      ) : (
                        <p className="break-words">{msg.message}</p>
                      )}
                      <p className={`text-[11px] mt-1.5 tnum ${msg.sender_id === user?.id ? 'text-white/60' : 'text-[var(--ink-45)]'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--rule)' }}>
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
                    id="support-image-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-[var(--ink-45)] hover:text-black hover:bg-[var(--paper-alt)] disabled:opacity-50 transition-colors"
                    disabled={uploading}
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
                    placeholder="Type response..."
                    className="flex-1 px-4 py-3 rounded-full bg-[var(--paper-alt)] border border-transparent focus:outline-none focus:border-black focus:bg-white transition-colors text-[14px]"
                    disabled={uploading}
                  />
                  <button
                    type="submit"
                    disabled={uploading || (!newMessage.trim() && !selectedImage)}
                    className="w-11 h-11 rounded-full bg-black text-white hover:bg-[var(--ink-70)] disabled:opacity-30 flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <svg className="w-10 h-10 mb-3 text-[var(--ink-25)]" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <p className="text-[14px] text-[var(--ink-45)]">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
