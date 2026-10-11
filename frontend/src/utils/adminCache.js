// Last-seen admin data, kept for this browser tab so admin pages paint
// instantly (coming back from a member's page, say) while a background
// refresh brings them up to date. Purely a display cache: the server is
// always the source of truth, and a miss just means a normal load. Session
// storage empties when the tab closes, and logout clears it too.
const KEY = 'adminCache.v1';
const MAX_ENTRIES = 20;

const memory = new Map();

const persist = () => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...memory.entries()]));
  } catch {
    // Quota or private mode: the in-memory copy still works for this visit.
  }
};

try {
  for (const [key, value] of JSON.parse(sessionStorage.getItem(KEY) || '[]')) memory.set(key, value);
} catch {
  // Unreadable or unavailable storage: start empty.
}

export const getAdminCache = (key) => memory.get(key) || null;

export const setAdminCache = (key, value) => {
  memory.delete(key);
  memory.set(key, value);
  while (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value);
  persist();
};

export const clearAdminCache = () => {
  memory.clear();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do; the cache is best effort.
  }
};
