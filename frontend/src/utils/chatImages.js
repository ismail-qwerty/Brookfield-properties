import api from './api';

// Phone photos run to several megabytes and are stored with the message, so
// they are scaled down before sending: 1280px on the long side is plenty for
// a chat bubble or a full-screen view, at a fraction of the size.
const MAX_SIDE = 1280;
const QUALITY = 0.82;

// What the server accepts in one message (its JSON body limit is 10 MB).
export const MAX_IMAGE_CHARS = 7_000_000;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const decode = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function compressImage(file) {
  const original = await readAsDataUrl(file);
  // Animated GIFs would lose their animation, and small files gain nothing.
  if (file.type === 'image/gif' || file.size < 200 * 1024) return original;

  try {
    const img = await decode(original);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    // JPEG has no transparency; keep transparent PNGs readable on white.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL('image/jpeg', QUALITY);
    return compressed.length < original.length ? compressed : original;
  } catch {
    // A format the browser can't draw (HEIC on some browsers): send as is.
    return original;
  }
}

// Message lists arrive without their photos; each photo is fetched on its own
// the first time it scrolls into view and kept for the rest of the visit (the
// browser's cache keeps it across visits too).
const loaded = new Map();

export function loadChatImage(path) {
  if (!loaded.has(path)) {
    const request = api
      .get(path, { responseType: 'blob', timeout: 30000 })
      .then(({ data }) => URL.createObjectURL(data));
    request.catch(() => loaded.delete(path));
    loaded.set(path, request);
  }
  return loaded.get(path);
}

export const chatImagePath = (msg, guestToken) =>
  guestToken
    ? `/chat/guest/messages/${msg.id}/image?token=${encodeURIComponent(guestToken)}`
    : `/chat/conversations/${msg.conversation_id}/messages/${msg.id}/image`;
