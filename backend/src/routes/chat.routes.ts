import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { authenticate, requireSupportStaff } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/conversation', ChatController.getUserConversation);
router.get('/conversations/:conversationId/messages', ChatController.getMessages);
router.post('/conversations/:conversationId/messages', ChatController.sendMessage);
router.put('/conversations/:conversationId/read', ChatController.markAsRead);
router.get('/unread-count', ChatController.getUnreadCount);

// Support agent routes: these expose every customer's conversations and
// contact details, so they're limited to support staff.
router.get('/support/conversations', requireSupportStaff, ChatController.getAllConversations);
router.put('/support/conversations/:conversationId/assign', requireSupportStaff, ChatController.assignConversation);
router.put('/support/conversations/:conversationId/close', requireSupportStaff, ChatController.closeConversation);

// Canned responses, shared by the support team
router.get('/support/canned', requireSupportStaff, ChatController.listCannedResponses);
router.post('/support/canned', requireSupportStaff, ChatController.createCannedResponse);
router.put('/support/canned/:id', requireSupportStaff, ChatController.updateCannedResponse);
router.delete('/support/canned/:id', requireSupportStaff, ChatController.deleteCannedResponse);

export default router;
