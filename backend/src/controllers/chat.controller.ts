import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service.js';
import { ResponseUtil } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';

export class ChatController {
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
      const userId = (req as AuthRequest).user.id;
      const messages = await ChatService.getMessages(conversationId, userId);
      ResponseUtil.success(res, messages, 'Messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Send message
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId;
      const userId = (req as AuthRequest).user.id;
      const { message, image_url } = req.body;

      const newMessage = await ChatService.sendMessage(conversationId, userId, message, image_url);
      ResponseUtil.success(res, newMessage, 'Message sent', 201);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.conversationId;
      const userId = (req as AuthRequest).user.id;
      await ChatService.markAsRead(conversationId, userId);
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
