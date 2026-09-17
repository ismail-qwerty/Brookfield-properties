// Last-known conversations and messages, kept in localStorage so the console
// paints instantly on load (and when switching threads) while the network
// refresh happens in the background. Purely a display cache: the server is
// always the source of truth, and a failed read just means a normal load.
const KEY = 'supportChatCache.v1';
const MAX_MESSAGES = 80;
const MAX_THREADS = 30;

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

const write = (data) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota or private mode: the cache is optional, so ignore it.
  }
};

export const getCachedConversations = () => read().conversations || null;

export const setCachedConversations = (conversations) => {
  const data = read();
  data.conversations = conversations;
  write(data);
};

export const getCachedMessages = (conversationId) =>
  (read().threads || {})[conversationId] || null;

export const setCachedMessages = (conversationId, messages) => {
  const data = read();
  const threads = data.threads || {};
  // Drop anything still sending, and keep only the tail of long threads.
  threads[conversationId] = messages.filter((m) => !m.pending).slice(-MAX_MESSAGES);

  const ids = Object.keys(threads);
  if (ids.length > MAX_THREADS) {
    for (const id of ids.slice(0, ids.length - MAX_THREADS)) delete threads[id];
  }

  data.threads = threads;
  write(data);
};

export const clearChatCache = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do; the cache is best effort.
  }
};
