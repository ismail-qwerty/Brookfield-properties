import { supabaseAdmin } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export class ChatService {
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
  static async getMessages(
    conversationId: string,
    user: { id: string; user_type?: string },
    after?: string
  ) {
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

    // The access check and the fetch are independent round trips to the
    // database, so run them together; nothing is returned unless access passes.
    const [{ data: conv }, { data: messages, error }] = await Promise.all([
      supabaseAdmin
        .from('chat_conversations')
        .select('user_id, support_agent_id')
        .eq('id', conversationId)
        .single(),
      messagesQuery,
    ]);

    // Support staff can read any thread — including one not yet assigned, which
    // is exactly the moment an agent first opens it.
    const isStaff = user.user_type === 'ChatSupport' || user.user_type === 'Admin';
    if (!conv || (!isStaff && conv.user_id !== user.id && conv.support_agent_id !== user.id)) {
      throw new AppError(403, 'Access denied');
    }

    if (error) {
      throw new AppError(500, 'Failed to fetch messages');
    }

    return messages;
  }

  // Send a message
  static async sendMessage(conversationId: string, senderId: string, message: string, imageUrl?: string) {
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: senderId,
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

  // Support agent: Get all conversations
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

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(500, 'Failed to fetch conversations');
    }

    return data;
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

  // Mark messages as read
  static async markAsRead(conversationId: string, userId: string) {
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);

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
