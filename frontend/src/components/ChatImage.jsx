import { useEffect, useRef, useState } from 'react';
import { chatImagePath, loadChatImage } from '../utils/chatImages';

// A photo in a chat bubble. A message still sending carries its own preview;
// anything else is fetched on its own once it comes near the screen, so
// opening a long thread never downloads every photo in it.
export default function ChatImage({ msg, guestToken = null, className = '' }) {
  const [src, setSrc] = useState(msg.image_url || null);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (msg.image_url || !msg.id || String(msg.id).startsWith('temp-')) return undefined;
    let cancelled = false;
    const path = chatImagePath(msg, guestToken);

    const start = () =>
      loadChatImage(path)
        .then((url) => !cancelled && setSrc(url))
        .catch(() => !cancelled && setFailed(true));

    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      start();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // The message id and its preview are what identify the photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg.id, msg.image_url, guestToken]);

  const shown = msg.image_url || src;

  if (shown) {
    return (
      <img
        src={shown}
        alt="Shared attachment"
        className={`${className} cursor-pointer`}
        onClick={() => window.open(shown, '_blank')}
      />
    );
  }

  return (
    <div
      ref={boxRef}
      className={`${className} w-56 h-40 flex items-center justify-center text-[12px] ${failed ? '' : 'animate-pulse'}`}
      style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)' }}
    >
      {failed ? 'Photo unavailable' : 'Loading photo…'}
    </div>
  );
}
