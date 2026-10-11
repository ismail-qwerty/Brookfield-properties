import { supabaseAdmin } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { isSupportStaff } from '../middleware/auth.middleware.js';
import { User } from '../types/index.js';

type ChatUser = Pick<User, 'id' | 'user_type'>;

// A conversation belongs to its customer and its assigned agent; support staff
// may act on any of them (an agent opens a thread before it's assigned).
type ConversationAccess = { user_id: string; support_agent_id: string | null };

const canAccessConversation = (conv: ConversationAccess | null, user: ChatUser) =>
  !!conv && (isSupportStaff(user) || String(conv.user_id) === String(user.id) || String(conv.support_agent_id) === String(user.id));

// --- In-memory bookkeeping that lets idle polls skip the database ----------
//
// Open chats poll every few seconds. This server writes every chat message, so
// it can tell when a thread has nothing new and answer without a query. Every
// entry expires, so a restart or a second server instance only ever costs a
// fresh read, never a missed message.
const STATE_TTL_MS = 30_000;
const ACCESS_TTL_MS = 5 * 60_000;

// A conversation's owner never changes and only staff (who may open any
// thread) are ever assigned, so access can be remembered.
const accessCache = new Map<string, { conv: ConversationAccess; expires: number }>();

// Upper bounds on the newest created_at and deleted_at in each thread, in
// microseconds. A poll whose cursors are already past both has nothing to get.
const threadState = new Map<string, { created: number; deleted: number; expires: number }>();

// Guest token -> their conversation id, so guest polls skip the lookup.
const guestConvCache = new Map<string, { id: string; expires: number }>();

// The support console's conversation list, shared by every agent and
// rebuilt only after a chat changes (or when it expires).
const listCache = new Map<string, { data: any[]; expires: number }>();
const LIST_TTL_MS = 15_000;

const invalidateConversationList = () => listCache.clear();

// Timestamps come back from the database without a zone, in UTC. Date.parse
// would read those as local time and drops microseconds, so both are handled
// here to keep every comparison exact.
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?$/;

const toMicros = (iso: string | null | undefined): number => {
  if (!iso) return 0;
  const withZone = /(Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`;
  const ms = Date.parse(withZone);
  if (Number.isNaN(ms)) return 0;
  const frac = iso.match(/\.(\d+)/)?.[1] || '';
  return ms * 1000 + Number((frac + '000000').slice(3, 6));
};

// `after` cursors come from the query string and end up inside a PostgREST
// filter, so only a plain timestamp is accepted.
const parseCursor = (value?: string) => (value && TIMESTAMP_RE.test(value) ? value : undefined);

const fetchConversationAccess = async (conversationId: string): Promise<ConversationAccess | null> => {
  const key = String(conversationId);
  const hit = accessCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.conv;

  const { data } = await supabaseAdmin
    .from('chat_conversations')
    .select('user_id, support_agent_id')
    .eq('id', conversationId)
    .single();

  if (!data) return null;
  accessCache.set(key, { conv: data, expires: Date.now() + ACCESS_TTL_MS });
  return data;
};

// Throws before the caller touches anything, so no write happens without access.
const assertConversationAccess = async (conversationId: string, user: ChatUser) => {
  const conv = await fetchConversationAccess(conversationId);
  if (!canAccessConversation(conv, user)) {
    throw new AppError(403, 'Access denied');
  }
};

const isThreadQuiet = (conversationId: string, after?: string, deletedAfter?: string) => {
  const state = threadState.get(String(conversationId));
  if (!state || state.expires <= Date.now()) return false;
  // Without a cursor the client wants the whole thread, which is only
  // known to be empty, never known to be unchanged.
  if (!after) return state.created === 0 && state.deleted === 0;
  return toMicros(after) >= state.created && toMicros(deletedAfter || after) >= state.deleted;
};

const recordFetch = (conversationId: string, rows: any[], after?: string, deletedAfter?: string) => {
  let created = after ? toMicros(after) : 0;
  let deleted = after ? toMicros(deletedAfter || after) : 0;
  for (const m of rows) {
    created = Math.max(created, toMicros(m.created_at));
    deleted = Math.max(deleted, toMicros(m.deleted_at));
  }
  threadState.set(String(conversationId), { created, deleted, expires: Date.now() + STATE_TTL_MS });
};

const recordWrite = (conversationId: string, { created, deleted }: { created?: string; deleted?: string }) => {
  invalidateConversationList();
  const state = threadState.get(String(conversationId));
  if (!state) return;
  if (created) state.created = Math.max(state.created, toMicros(created));
  if (deleted) state.deleted = Math.max(state.deleted, toMicros(deleted));
};

// Message rows without image_url: photos are stored inline as data URLs of a
// megabyte or more each, so lists never carry them. Clients load each photo
// on its own (see getMessageImage) and the browser keeps it.
const MESSAGE_COLUMNS =
  'id, conversation_id, message, is_read, created_at, message_type, sender_id, from_guest, deleted_at, deleted_by';

const withoutImage = <T extends Record<string, any>>(row: T) => {
  const { image_url, ...rest } = row;
  return rest;
};

// Polls ask only for what changed since their cursors: messages created after
// `after`, or deleted after `deletedAfter` (a delete further up the thread
// still has to reach the other side).
const changedSince = (query: any, after?: string, deletedAfter?: string) =>
  after ? query.or(`created_at.gt."${after}",deleted_at.gt."${deletedAfter || after}"`) : query;

const decodeDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  return { contentType: match[1], body: Buffer.from(match[2], 'base64') };
};

// Members only ever see replies from "Chat Support", never the agent's own
// username, including in the raw API response.
const SUPPORT_DISPLAY_NAME = 'Chat Support';

const maskStaffSenders = <T extends { sender?: { id: string; username: string; user_type: string } | null }>(
  messages: T[] | null,
  viewer: ChatUser
): T[] => {
  if (!messages || isSupportStaff(viewer)) return messages || [];
  return messages.map((m) =>
    m.sender && String(m.sender.id) !== String(viewer.id)
      ? { ...m, sender: { ...m.sender, username: SUPPORT_DISPLAY_NAME } }
      : m
  );
};

// A signed-out visitor is identified only by a random token their browser
// keeps. It is the secret that grants access to that one conversation, so it
// has to look like one we issued before anything is read or written.
const GUEST_TOKEN_RE = /^[a-f0-9]{32}$/i;

const assertGuestToken = (token: string) => {
  if (!token || !GUEST_TOKEN_RE.test(token)) {
    throw new AppError(400, 'Invalid guest session');
  }
};

export class ChatService {
  // Guest chat: create or resume the conversation belonging to this token.
  static async getGuestConversation(token: string) {
    assertGuestToken(token);

    const { data: existing } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('guest_token', token)
      .in('status', ['Open', 'InProgress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      guestConvCache.set(token, { id: existing.id, expires: Date.now() + ACCESS_TTL_MS });
      return existing;
    }

    // Short readable label so the agent sees "Guest 4F2A" rather than a token.
    const label = `Guest ${token.slice(0, 4).toUpperCase()}`;
    const { data: created, error } = await supabaseAdmin
      .from('chat_conversations')
      .insert({ guest_token: token, guest_label: label, status: 'Open' })
      .select('*')
      .single();

    if (error) {
      throw new AppError(500, 'Failed to start chat');
    }

    guestConvCache.set(token, { id: created.id, expires: Date.now() + ACCESS_TTL_MS });
    invalidateConversationList();
    return created;
  }

  private static async guestConversationOrThrow(token: string) {
    assertGuestToken(token);
    const hit = guestConvCache.get(token);
    if (hit && hit.expires > Date.now()) return { id: hit.id };

    const { data: conv } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('guest_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conv) throw new AppError(404, 'Chat not found');
    guestConvCache.set(token, { id: conv.id, expires: Date.now() + ACCESS_TTL_MS });
    return conv;
  }

  static async getGuestMessages(token: string, after?: string, deletedAfter?: string) {
    const conv = await this.guestConversationOrThrow(token);
    const since = parseCursor(after);
    const deletedSince = parseCursor(deletedAfter);

    if (isThreadQuiet(conv.id, since, deletedSince)) return [];

    const { data, error } = await changedSince(
      supabaseAdmin
        .from('chat_messages')
        .select(MESSAGE_COLUMNS)
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true }),
      since,
      deletedSince
    );

    if (error) throw new AppError(500, 'Failed to fetch messages');
    recordFetch(conv.id, data || [], since, deletedSince);

    // Guests never see who replied, only that support did.
    return (data || []).map((m: any) => ({ ...m, sender: m.from_guest ? null : { username: SUPPORT_DISPLAY_NAME } }));
  }

  static async getGuestMessageImage(token: string, messageId: string) {
    const conv = await this.guestConversationOrThrow(token);
    return this.loadImage(conv.id, messageId);
  }

  static async sendGuestMessage(token: string, message: string) {
    const conv = await this.guestConversationOrThrow(token);
    const text = (message || '').trim();

    if (!text) throw new AppError(400, 'Message is required');
    if (text.length > 2000) throw new AppError(400, 'Message is too long');

    const [{ data, error }] = await Promise.all([
      supabaseAdmin
        .from('chat_messages')
        .insert({ conversation_id: conv.id, sender_id: null, from_guest: true, message_type: 'text', message: text })
        .select(MESSAGE_COLUMNS)
        .single(),
      supabaseAdmin
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conv.id),
    ]);

    if (error || !data) throw new AppError(500, 'Failed to send message');
    recordWrite(conv.id, { created: (data as any).created_at });

    return data;
  }

  // User creates or gets existing conversation
  static async getUserConversation(userId: string) {
    // Check for existing open conversation
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['Open', 'InProgress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing && !existingError) {
      return existing;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabaseAdmin
      .from('chat_conversations')
      .insert({
        user_id: userId,
        status: 'Open',
      })
      .select()
      .single();

    if (createError) {
      throw new AppError(500, 'Failed to create conversation');
    }

    invalidateConversationList();
    return newConv;
  }

  // Get messages for a conversation. With `after` (an ISO timestamp), returns
  // only what changed since, so polling clients don't re-download the thread;
  // when nothing has changed the answer comes from memory with no query.
  static async getMessages(conversationId: string, user: ChatUser, after?: string, deletedAfter?: string) {
    await assertConversationAccess(conversationId, user);

    const since = parseCursor(after);
    const deletedSince = parseCursor(deletedAfter);
    if (isThreadQuiet(conversationId, since, deletedSince)) return [];

    const { data: messages, error } = await changedSince(
      supabaseAdmin
        .from('chat_messages')
        .select(`${MESSAGE_COLUMNS}, sender:users!sender_id(id, username, user_type)`)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
      since,
      deletedSince
    );

    if (error) {
      throw new AppError(500, 'Failed to fetch messages');
    }

    recordFetch(conversationId, messages || [], since, deletedSince);
    return maskStaffSenders(messages || [], user);
  }

  // One photo, on its own. Message lists leave photos out (see
  // MESSAGE_COLUMNS), so each is read once and then cached by the browser.
  static async getMessageImage(conversationId: string, messageId: string, user: ChatUser) {
    await assertConversationAccess(conversationId, user);
    return this.loadImage(conversationId, messageId);
  }

  private static async loadImage(conversationId: string, messageId: string) {
    const { data } = await supabaseAdmin
      .from('chat_messages')
      .select('image_url, deleted_at')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (!data?.image_url || data.deleted_at) {
      throw new AppError(404, 'Image not found');
    }

    const inline = decodeDataUrl(data.image_url);
    return inline ? { ...inline, redirect: null } : { contentType: null, body: null, redirect: data.image_url as string };
  }

  // Send a message
  static async sendMessage(conversationId: string, sender: ChatUser, message: string, imageUrl?: string) {
    await assertConversationAccess(conversationId, sender);

    const messageData: any = {
      conversation_id: conversationId,
      sender_id: sender.id,
    };

    if (imageUrl) {
      if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(imageUrl) && !/^https:\/\//i.test(imageUrl)) {
        throw new AppError(400, 'Unsupported image');
      }
      messageData.message_type = 'image';
      messageData.image_url = imageUrl;
      messageData.message = message || 'Sent an image';
    } else {
      messageData.message_type = 'text';
      messageData.message = (message || '').trim();
      if (!messageData.message) throw new AppError(400, 'Message is required');
    }

    // Bumping the conversation's timestamp doesn't depend on the insert, so do
    // both at once instead of making the sender wait for two round trips.
    const [{ data, error }] = await Promise.all([
      supabaseAdmin
        .from('chat_messages')
        .insert(messageData)
        .select(`${MESSAGE_COLUMNS}, sender:users!sender_id(id, username, user_type)`)
        .single(),
      supabaseAdmin
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId),
    ]);

    if (error || !data) {
      throw new AppError(500, 'Failed to send message');
    }

    recordWrite(conversationId, { created: (data as any).created_at });
    return data;
  }

  // Support agent: Get all conversations. `status` accepts a real status or
  // 'Active', which merges the waiting and in-progress queues into one list.
  // Each row carries its last message and the agent's unread count so the
  // console can show previews and badges without a request per conversation.
  // Every open console polls this, so the result is shared between agents and
  // only rebuilt after a chat changes.
  static async getAllConversations(status?: string) {
    const key = status || 'all';
    const hit = listCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.data;

    const data = await this.buildConversationList(status);
    listCache.set(key, { data, expires: Date.now() + LIST_TTL_MS });
    return data;
  }

  private static async buildConversationList(status?: string) {
    let query = supabaseAdmin
      .from('chat_conversations')
      .select(`
        *,
        user:users!user_id(id, username, email),
        support_agent:users!support_agent_id(id, username)
      `)
      .order('updated_at', { ascending: false });

    if (status === 'Active') {
      query = query.in('status', ['Open', 'InProgress']);
    } else if (status) {
      query = query.eq('status', status);
    }

    // The closed archive only grows; the newest ones are what agents look up.
    if (status === 'Closed') {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(500, 'Failed to fetch conversations');
    }

    const conversations = data || [];
    if (conversations.length === 0) return conversations;

    const ids = conversations.map((c) => c.id);
    const { data: recent } = await supabaseAdmin
      .from('chat_messages')
      .select('conversation_id, message, message_type, created_at, sender_id, is_read, from_guest, deleted_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(1000);

    const lastByConv = new Map<string, any>();
    const unreadByConv = new Map<string, number>();
    const customerIds = new Map(conversations.map((c) => [c.id, String(c.user_id)]));

    const fromCustomer = (m: any, convId: string) =>
      m.from_guest === true || String(m.sender_id) === customerIds.get(convId);

    for (const m of recent || []) {
      const convId = String(m.conversation_id);
      if (!lastByConv.has(convId)) lastByConv.set(convId, m);
      // Unread for the agent means the customer wrote it and nobody has opened it.
      if (!m.is_read && fromCustomer(m, convId)) {
        unreadByConv.set(convId, (unreadByConv.get(convId) || 0) + 1);
      }
    }

    return conversations.map((c) => {
      const last = lastByConv.get(String(c.id));
      return {
        ...c,
        unread_count: unreadByConv.get(String(c.id)) || 0,
        last_message: last
          ? {
              text: last.deleted_at ? 'Message deleted' : last.message_type === 'image' ? 'Photo' : last.message,
              created_at: last.created_at,
              from_customer: fromCustomer(last, String(c.id)),
            }
          : null,
      };
    });
  }

  // Canned responses: shared across the support team, inserted in the composer
  // by typing "/" followed by the title.
  static async listCannedResponses() {
    const { data, error } = await supabaseAdmin
      .from('canned_responses')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      throw new AppError(500, 'Failed to fetch saved messages');
    }

    return data || [];
  }

  static async createCannedResponse(title: string, body: string, createdBy: string) {
    const clean = { title: title.trim(), body: body.trim() };
    if (!clean.title || !clean.body) {
      throw new AppError(400, 'Title and message are both required');
    }

    const { data, error } = await supabaseAdmin
      .from('canned_responses')
      .insert({ ...clean, created_by: createdBy })
      .select('*')
      .single();

    if (error) {
      // 23505 is the unique index on lower(title).
      if ((error as any).code === '23505') {
        throw new AppError(400, 'A saved message with that title already exists');
      }
      throw new AppError(500, 'Failed to save message');
    }

    return data;
  }

  static async updateCannedResponse(id: string, title: string, body: string) {
    const { data, error } = await supabaseAdmin
      .from('canned_responses')
      .update({ title: title.trim(), body: body.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new AppError(404, 'Saved message not found');
    }

    return data;
  }

  static async deleteCannedResponse(id: string) {
    const { error } = await supabaseAdmin.from('canned_responses').delete().eq('id', id);

    if (error) {
      throw new AppError(500, 'Failed to delete saved message');
    }

    return { id };
  }

  // Support agent: Assign conversation to self
  static async assignConversation(conversationId: string, agentId: string) {
    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .update({
        support_agent_id: agentId,
        status: 'InProgress',
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      throw new AppError(500, 'Failed to assign conversation');
    }

    accessCache.delete(String(conversationId));
    invalidateConversationList();
    return data;
  }

  // Close conversation
  static async closeConversation(conversationId: string) {
    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .update({
        status: 'Closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      throw new AppError(500, 'Failed to close conversation');
    }

    invalidateConversationList();
    return data;
  }

  // Delete a message: kept as a tombstone rather than removed, so the thread
  // still reads in order and the audit trail survives. Anyone may delete their
  // own; support staff may also delete messages in threads they handle.
  static async deleteMessage(conversationId: string, messageId: string, user: ChatUser) {
    await assertConversationAccess(conversationId, user);

    const { data: message } = await supabaseAdmin
      .from('chat_messages')
      .select('id, sender_id, conversation_id, deleted_at')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();

    if (!message) {
      throw new AppError(404, 'Message not found');
    }

    const isOwn = message.sender_id !== null && String(message.sender_id) === String(user.id);
    if (!isOwn && !isSupportStaff(user)) {
      throw new AppError(403, 'You can only delete your own messages');
    }

    if (message.deleted_at) {
      return { id: messageId, already_deleted: true };
    }

    const deletedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({
        deleted_at: deletedAt,
        deleted_by: user.id,
        // The original text and any attachment go with it.
        message: '',
        image_url: null,
        message_type: 'text',
      })
      .eq('id', messageId);

    if (error) {
      throw new AppError(500, 'Failed to delete message');
    }

    recordWrite(conversationId, { deleted: deletedAt });
    return { id: messageId, deleted: true };
  }

  // Mark messages as read. Only rows still unread are touched: rewriting every
  // message in the thread on each call was a large share of the disk writes.
  static async markAsRead(conversationId: string, user: ChatUser) {
    await assertConversationAccess(conversationId, user);

    // `neq` alone would skip guest messages, whose sender_id is null.
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .or(`sender_id.neq.${user.id},sender_id.is.null`);

    if (error) {
      throw new AppError(500, 'Failed to mark messages as read');
    }

    // Unread badges in the console come from the shared list.
    invalidateConversationList();
    return { success: true };
  }

  // Get unread count for user: one query, joined through their open conversations.
  static async getUnreadCount(userId: string) {
    const { count, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id, chat_conversations!inner(user_id, status)', { count: 'exact', head: true })
      .eq('chat_conversations.user_id', userId)
      .in('chat_conversations.status', ['Open', 'InProgress'])
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      return 0;
    }

    return count || 0;
  }
}
