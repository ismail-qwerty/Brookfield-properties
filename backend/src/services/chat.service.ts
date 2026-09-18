import { supabaseAdmin } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { isSupportStaff } from '../middleware/auth.middleware.js';
import { User } from '../types/index.js';

type ChatUser = Pick<User, 'id' | 'user_type'>;

// A conversation belongs to its customer and its assigned agent; support staff
// may act on any of them (an agent opens a thread before it's assigned).
const canAccessConversation = (
  conv: { user_id: string; support_agent_id: string | null } | null,
  user: ChatUser
) => !!conv && (isSupportStaff(user) || conv.user_id === user.id || conv.support_agent_id === user.id);

const fetchConversationAccess = (conversationId: string) =>
  supabaseAdmin
    .from('chat_conversations')
    .select('user_id, support_agent_id')
    .eq('id', conversationId)
    .single();

// Throws before the caller touches anything, so no write happens without access.
const assertConversationAccess = async (conversationId: string, user: ChatUser) => {
  const { data: conv } = await fetchConversationAccess(conversationId);
  if (!canAccessConversation(conv, user)) {
    throw new AppError(403, 'Access denied');
  }
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

    if (existing) return existing;

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

    return created;
  }

  private static async guestConversationOrThrow(token: string) {
    assertGuestToken(token);
    const { data: conv } = await supabaseAdmin
      .from('chat_conversations')
      .select('id, guest_token')
      .eq('guest_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conv) throw new AppError(404, 'Chat not found');
    return conv;
  }

  static async getGuestMessages(token: string, after?: string) {
    const conv = await this.guestConversationOrThrow(token);

    let query = supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (after) query = query.gt('created_at', after);

    // As for signed-in members: a message deleted earlier in the thread has to
    // reach the guest too, and it sits behind their cursor.
    const [{ data, error }, deleted] = await Promise.all([
      query,
      after
        ? supabaseAdmin.from('chat_messages').select('*').eq('conversation_id', conv.id).gt('deleted_at', after)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    if (error) throw new AppError(500, 'Failed to fetch messages');

    const seen = new Set((data || []).map((m) => m.id));
    const merged = [...(data || []), ...((deleted?.data || []).filter((m: any) => !seen.has(m.id)))];

    // Guests never see who replied, only that support did.
    return merged.map((m) => ({ ...m, sender: m.from_guest ? null : { username: SUPPORT_DISPLAY_NAME } }));
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
        .select('*')
        .single(),
      supabaseAdmin
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conv.id),
    ]);

    if (error) throw new AppError(500, 'Failed to send message');

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

    return newConv;
  }

  // Get messages for a conversation. With `after` (an ISO timestamp), returns
  // only newer messages, so polling clients don't re-download the whole thread
  // (including base64 image attachments) on every tick.
  static async getMessages(conversationId: string, user: ChatUser, after?: string) {
    let messagesQuery = supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:users!sender_id(id, username, user_type)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (after) {
      messagesQuery = messagesQuery.gt('created_at', after);
    }

    // Polls ask only for newer messages, so a message deleted further up the
    // thread would never reach the other side. Fetch those separately.
    const deletedQuery = after
      ? supabaseAdmin
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .gt('deleted_at', after)
      : null;

    // Reading is side-effect free, so the access check and the fetch can run
    // together; nothing is returned unless access passes.
    const [{ data: conv }, { data: messages, error }, deletedResult] = await Promise.all([
      fetchConversationAccess(conversationId),
      messagesQuery,
      deletedQuery,
    ]);

    if (!canAccessConversation(conv, user)) {
      throw new AppError(403, 'Access denied');
    }

    if (error) {
      throw new AppError(500, 'Failed to fetch messages');
    }

    const seen = new Set((messages || []).map((m) => m.id));
    const merged = [...(messages || []), ...((deletedResult?.data || []).filter((m) => !seen.has(m.id)))];

    return maskStaffSenders(merged, user);
  }

  // Send a message
  static async sendMessage(conversationId: string, sender: ChatUser, message: string, imageUrl?: string) {
    await assertConversationAccess(conversationId, sender);

    const messageData: any = {
      conversation_id: conversationId,
      sender_id: sender.id,
    };

    if (imageUrl) {
      messageData.message_type = 'image';
      messageData.image_url = imageUrl;
      messageData.message = message || 'Sent an image';
    } else {
      messageData.message_type = 'text';
      messageData.message = message.trim();
    }

    // Bumping the conversation's timestamp doesn't depend on the insert, so do
    // both at once instead of making the sender wait for two round trips.
    const [{ data, error }] = await Promise.all([
      supabaseAdmin
        .from('chat_messages')
        .insert(messageData)
        .select('*, sender:users!sender_id(id, username, user_type)')
        .single(),
      supabaseAdmin
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId),
    ]);

    if (error) {
      throw new AppError(500, 'Failed to send message');
    }

    return data;
  }

  // Support agent: Get all conversations. `status` accepts a real status or
  // 'Active', which merges the waiting and in-progress queues into one list.
  // Each row carries its last message and the agent's unread count so the
  // console can show previews and badges without a request per conversation.
  static async getAllConversations(status?: string) {
    let query = supabaseAdmin
      .from('chat_conversations')
      .select(`
        *,
        user:users!user_id(id, username, email),
        support_agent:users!support_agent_id(id, username),
        messages:chat_messages(count)
      `)
      .order('updated_at', { ascending: false });

    if (status === 'Active') {
      query = query.in('status', ['Open', 'InProgress']);
    } else if (status) {
      query = query.eq('status', status);
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

    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({
        deleted_at: new Date().toISOString(),
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

    return { id: messageId, deleted: true };
  }

  // Mark messages as read
  static async markAsRead(conversationId: string, user: ChatUser) {
    await assertConversationAccess(conversationId, user);

    // `neq` alone would skip guest messages, whose sender_id is null.
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .or(`sender_id.neq.${user.id},sender_id.is.null`);

    if (error) {
      throw new AppError(500, 'Failed to mark messages as read');
    }

    return { success: true };
  }

  // Get unread count for user
  static async getUnreadCount(userId: string) {
    const { data: conversations } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['Open', 'InProgress']);

    if (!conversations || conversations.length === 0) {
      return 0;
    }

    const conversationIds = conversations.map((c) => c.id);

    const { count, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      return 0;
    }

    return count || 0;
  }
}
