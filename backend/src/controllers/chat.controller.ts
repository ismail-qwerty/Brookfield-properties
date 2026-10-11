import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service.js';
import { ResponseUtil } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';

const queryString = (value: unknown) => (typeof value === 'string' ? value : undefined);

// A photo never changes once sent (a delete removes it), so the browser may
// keep it for good and never ask the database for it again.
const sendImage = (
  res: Response,
  image: { contentType: string | null; body: Buffer | null; redirect: string | null }
) => {
  if (image.redirect) return res.redirect(image.redirect);
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  res.type(image.contentType || 'application/octet-stream').send(image.body);
};

export class ChatController {
  // Guest chat: no account, identified by the token their browser holds.
  static async getGuestConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.body?.token || req.query.token || '');
      const conversation = await ChatService.getGuestConversation(token);
      ResponseUtil.success(res, conversation, 'Conversation retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getGuestMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.query.token || '');
      const messages = await ChatService.getGuestMessages(token, queryString(req.query.after), queryString(req.query.deleted_after));
      ResponseUtil.success(res, messages, 'Messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getGuestMessageImage(req: Request, res: Response, next: NextFunction) {
    try {
      const image = await ChatService.getGuestMessageImage(String(req.query.token || ''), req.params.messageId);
      sendImage(res, image);
    } catch (error) {
      next(error);
    }
  }

  static async sendGuestMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, message } = req.body || {};
      const saved = await ChatService.sendGuestMessage(String(token || ''), message);
      ResponseUtil.success(res, saved, 'Message sent', 201);
    } catch (error) {
      next(error);
    }
  }

  // User: Get or create conversation
  static async getUserConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const conversation = await ChatService.getUserConversation(userId);
      ResponseUtil.success(res, conversation, 'Conversation retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId;
      const messages = await ChatService.getMessages(
        conversationId,
        (req as AuthRequest).user,
        queryString(req.query.after),
        queryString(req.query.deleted_after)
      );
      ResponseUtil.success(res, messages, 'Messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getMessageImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId, messageId } = req.params;
      const image = await ChatService.getMessageImage(conversationId, messageId, (req as AuthRequest).user);
      sendImage(res, image);
    } catch (error) {
      next(error);
    }
  }

  // Send message
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId;
      const { message, image_url } = req.body;

      const newMessage = await ChatService.sendMessage(conversationId, (req as AuthRequest).user, message, image_url);
      ResponseUtil.success(res, newMessage, 'Message sent', 201);
    } catch (error) {
      next(error);
    }
  }

  static async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId, messageId } = req.params;
      const result = await ChatService.deleteMessage(conversationId, messageId, (req as AuthRequest).user);
      ResponseUtil.success(res, result, 'Message deleted');
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId;
      await ChatService.markAsRead(conversationId, (req as AuthRequest).user);
      ResponseUtil.success(res, null, 'Messages marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user.id;
      const count = await ChatService.getUnreadCount(userId);
      ResponseUtil.success(res, count, 'Unread count retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getAllConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const conversations = await ChatService.getAllConversations(status as string);
      ResponseUtil.success(res, conversations, 'Conversations retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async assignConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId;
      const agentId = (req as AuthRequest).user.id;
      const conversation = await ChatService.assignConversation(conversationId, agentId);
      ResponseUtil.success(res, conversation, 'Conversation assigned');
    } catch (error) {
      next(error);
    }
  }

  static async listCannedResponses(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await ChatService.listCannedResponses();
      ResponseUtil.success(res, items, 'Saved messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async createCannedResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, body } = req.body;
      const item = await ChatService.createCannedResponse(title, body, (req as AuthRequest).user.id);
      ResponseUtil.success(res, item, 'Saved message created', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateCannedResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, body } = req.body;
      const item = await ChatService.updateCannedResponse(req.params.id, title, body);
      ResponseUtil.success(res, item, 'Saved message updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCannedResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ChatService.deleteCannedResponse(req.params.id);
      ResponseUtil.success(res, result, 'Saved message deleted');
    } catch (error) {
      next(error);
    }
  }

  static async closeConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId;
      const conversation = await ChatService.closeConversation(conversationId);
      ResponseUtil.success(res, conversation, 'Conversation closed');
    } catch (error) {
      next(error);
    }
  }
}
