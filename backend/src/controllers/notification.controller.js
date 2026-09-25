const Notification = require('../models/Notification');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/apiResponse');

// Build query filter for notifications visible to the given user
function getUserNotificationFilter(user) {
  return {
    $or: [
      { 'recipients.user': user._id },
      { isGlobal: true },
      { targetRole: user.role },
      { targetRole: 'all' },
    ],
  };
}

// Build query filter for notifications that are UNREAD for the given user
function getUserUnreadFilter(user) {
  return {
    $and: [
      getUserNotificationFilter(user),
      {
        recipients: {
          $not: {
            $elemMatch: { user: user._id, isRead: true },
          },
        },
      },
    ],
  };
}

// GET /api/notifications — for current user
const getMyNotifications = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const userId = req.user._id;
  const filter = getUserNotificationFilter(req.user);

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  // Annotate isRead for this user
  const annotated = notifications.map((n) => {
    const obj = n.toObject();
    const recipientEntry = n.recipients.find(
      (r) => r.user && r.user.toString() === userId.toString()
    );
    obj.isRead = recipientEntry ? Boolean(recipientEntry.isRead) : false;
    return obj;
  });

  const unreadCount = await Notification.countDocuments(getUserUnreadFilter(req.user));

  return sendSuccess(
    res,
    { notifications: annotated, unreadCount },
    'Notifications fetched',
    200,
    buildPaginationMeta(total, page, limit)
  );
};

// POST /api/notifications
const createNotification = async (req, res) => {
  const { title, message, type, targetRole, recipientIds, isGlobal } = req.body;

  const recipients = Array.isArray(recipientIds)
    ? recipientIds.map((id) => ({ user: id, isRead: false }))
    : [];

  const notification = await Notification.create({
    title, message, type, targetRole, isGlobal,
    sender: req.user._id,
    recipients,
  });

  return sendCreated(res, notification, 'Notification sent');
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  const userId = req.user._id;
  const notification = await Notification.findById(req.params.id);
  if (!notification) return sendNotFound(res, 'Notification not found');

  const recipientIndex = notification.recipients.findIndex(
    (r) => r.user && r.user.toString() === userId.toString()
  );

  if (recipientIndex > -1) {
    notification.recipients[recipientIndex].isRead = true;
    notification.recipients[recipientIndex].readAt = new Date();
  } else {
    // Add read receipt for global/role notification
    notification.recipients.push({ user: userId, isRead: true, readAt: new Date() });
  }

  await notification.save();
  return sendSuccess(res, null, 'Marked as read');
};

// PUT /api/notifications/mark-all-read
const markAllAsRead = async (req, res) => {
  const now = new Date();
  const userId = req.user._id;

  const unreadNotifications = await Notification.find(getUserUnreadFilter(req.user));

  if (unreadNotifications.length > 0) {
    const ops = unreadNotifications.map((notif) => {
      const hasUserEntry = notif.recipients.some(
        (r) => r.user && r.user.toString() === userId.toString()
      );
      if (hasUserEntry) {
        return {
          updateOne: {
            filter: { _id: notif._id, 'recipients.user': userId },
            update: { $set: { 'recipients.$.isRead': true, 'recipients.$.readAt': now } },
          },
        };
      } else {
        return {
          updateOne: {
            filter: { _id: notif._id },
            update: { $push: { recipients: { user: userId, isRead: true, readAt: now } } },
          },
        };
      }
    });

    await Notification.bulkWrite(ops);
  }

  return sendSuccess(res, null, 'All notifications marked as read');
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return sendNotFound(res, 'Notification not found');
  await notification.deleteOne();
  return sendSuccess(res, null, 'Notification deleted');
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  const count = await Notification.countDocuments(getUserUnreadFilter(req.user));
  return sendSuccess(res, { count });
};

module.exports = { getMyNotifications, createNotification, markAsRead, markAllAsRead, deleteNotification, getUnreadCount };
