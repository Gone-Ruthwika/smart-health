const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const notifService = require('../services/notificationService');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await notifService.getUserNotifications(req.user.id, 30);
  const unread = await notifService.getUnreadCount(req.user.id);
  res.json({ success: true, notifications, unread });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  await notifService.markAllRead(req.user.id);
  res.json({ success: true });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await notifService.markRead(req.params.id, req.user.id);
  res.json({ success: true });
}));

module.exports = router;
