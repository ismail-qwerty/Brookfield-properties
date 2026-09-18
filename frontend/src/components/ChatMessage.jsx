import { useState, useRef } from 'react';

// One chat bubble for the customer-facing chat (floating widget and Support
// page), so both stay readable and identical. The agent console deliberately
// uses its own softer, messenger-style bubbles.
//
// Text colors are set on the <p> elements themselves: the base stylesheet
// gives every <p> a dark grey, which silently overrode the bubble's inherited
// white and left sent messages grey-on-black.
export default function ChatMessage({ msg, mine, compact = false, onDelete }) {
  const hasImage = msg.message_type === 'image' && msg.image_url;
  const caption = hasImage ? (msg.message !== 'Sent an image' ? msg.message : null) : msg.message;
  const time = msg.pending
    ? 'Sending…'
    : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [menuOpen, setMenuOpen] = useState(false);
  const holdTimer = useRef(null);

  // A deleted message keeps its place in the thread, as a plain note.
  if (msg.deleted_at) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`${compact ? 'max-w-[82%] px-3.5 py-2' : 'max-w-[78%] md:max-w-md px-4 py-2.5'} rounded-[18px] border border-dashed`}
          style={{ borderColor: 'var(--rule)' }}
        >
          <p className="text-[13px] italic" style={{ color: 'var(--ink-45)' }}>This message was deleted</p>
        </div>
      </div>
    );
  }

  const startHold = () => {
    if (!onDelete || !mine) return;
    holdTimer.current = setTimeout(() => setMenuOpen(true), 450);
  };
  const cancelHold = () => clearTimeout(holdTimer.current);

  return (
    <div
      className={`group relative flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchMove={cancelHold}
      onContextMenu={(e) => {
        if (!onDelete || !mine) return;
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      {onDelete && mine && (
        <button
          type="button"
          aria-label="Message options"
          onClick={() => setMenuOpen((v) => !v)}
          className="order-first w-6 h-6 rounded-full items-center justify-center hidden group-hover:flex hover:bg-[var(--paper-alt)] flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="var(--ink-45)" aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      )}
      {menuOpen && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
          <div className="absolute z-20 right-8 top-0 bg-white rounded-[10px] overflow-hidden shadow-[0_4px_14px_rgba(0,0,0,0.18)]">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(msg);
              }}
              className="block w-full text-left px-4 py-2 text-[13px] whitespace-nowrap hover:bg-[var(--paper-alt)]"
              style={{ color: '#c0392b' }}
            >
              Delete message
            </button>
          </div>
        </>
      )}
      <div
        className={`${compact ? 'max-w-[82%] px-3.5 py-2.5' : 'max-w-[78%] md:max-w-md px-4 py-3'} rounded-[18px] transition-opacity ${
          mine
            ? 'bg-[#111111] rounded-br-[6px]'
            : 'bg-white border border-[#e4e4e4] rounded-bl-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
        } ${msg.pending ? 'opacity-60' : ''}`}
      >
        {hasImage && (
          <img
            src={msg.image_url}
            alt="Shared attachment"
            className={`max-w-full h-auto rounded-[12px] cursor-pointer ${compact ? 'max-h-40' : 'max-h-64'} ${caption ? 'mb-2' : ''}`}
            onClick={() => window.open(msg.image_url, '_blank')}
          />
        )}
        {caption && (
          <p
            className={`${compact ? 'text-[14px]' : 'text-[15px]'} leading-relaxed whitespace-pre-wrap break-words ${
              mine ? 'text-white' : 'text-[#111111]'
            }`}
          >
            {caption}
          </p>
        )}
        <p className={`text-[11px] mt-1 tnum ${mine ? 'text-white/70 text-right' : 'text-[#6b6b6b]'}`}>{time}</p>
      </div>
    </div>
  );
}
