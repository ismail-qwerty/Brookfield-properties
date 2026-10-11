import { supabaseAdmin } from '../config/database.js';
import { User } from '../types/index.js';

// Every authenticated request needs the caller's row (status and role), and
// the chat widgets poll every few seconds, so reading it from the database on
// each request was one of the biggest sources of load. Rows are kept briefly
// in memory; anything that changes a user's status or role calls
// invalidateUser, so that change still applies on their very next request.
const TTL_MS = 30_000;
const cache = new Map<string, { user: User; expires: number }>();

export async function getCachedUser(id: string): Promise<User | null> {
  const key = String(id);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.user;

  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', key).single();
  if (error || !data) {
    cache.delete(key);
    return null;
  }

  if (cache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  }
  cache.set(key, { user: data as User, expires: Date.now() + TTL_MS });
  return data as User;
}

export function invalidateUser(id: string | number) {
  cache.delete(String(id));
}
