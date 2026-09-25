const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getMyNotifications, createNotification, markAsRead, markAllAsRead, deleteNotification, getUnreadCount } = require('../controllers/notification.controller');

router.use(protect);
router.get('/', getMyNotifications);
router.post('/', authorize('admin'), createNotification);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', authorize('admin'), deleteNotification);

module.exports = router;
