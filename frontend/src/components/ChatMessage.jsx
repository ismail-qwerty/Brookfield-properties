// One chat bubble, shared by the floating widget, the Support page and the
// agent console so all three stay readable and identical.
//
// Text colors are set on the <p> elements themselves: the base stylesheet
// gives every <p> a dark grey, which silently overrode the bubble's inherited
// white and left sent messages grey-on-black.
export default function ChatMessage({ msg, mine, compact = false }) {
  const hasImage = msg.message_type === 'image' && msg.image_url;
  const caption = hasImage ? (msg.message !== 'Sent an image' ? msg.message : null) : msg.message;
  const time = msg.pending
    ? 'Sending…'
    : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
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
