const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

const recipientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      default: NOTIFICATION_TYPES.INFO,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipients: {
      type: [recipientSchema],
      default: [],
    },
    // Broadcast to a role instead of individuals
    targetRole: {
      type: String,
      enum: ['admin', 'faculty', 'student', 'all'],
      default: null,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    // Optional link to a related resource
    relatedModule: {
      type: String,
      default: null,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Deduplication key: e.g. "session:<id>:upcoming" — unique sparse prevents duplicates
    statusKey: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ 'recipients.user': 1, 'recipients.isRead': 1 });
notificationSchema.index({ createdAt: -1 });
// Unique sparse index on statusKey — enforces one notification per event per status.
// The index was created via migration with name 'statusKey_1_unique'.
// Mongoose will reuse the existing index; adding it here keeps schema in sync.
notificationSchema.index({ statusKey: 1 }, { unique: true, sparse: true, name: 'statusKey_1_unique' });

module.exports = mongoose.model('Notification', notificationSchema);
