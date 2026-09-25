const mongoose = require('mongoose');
const { ACTIVITY_TYPES } = require('../config/constants');

const participantSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    attended: {
      type: Boolean,
      default: false,
    },
    certificateUrl: {
      type: String,
      default: null,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: [true, 'Activity type is required'],
    },
    organizer: {
      type: String,
      trim: true,
    },
    venue: {
      type: String,
      trim: true,
    },
    mode: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      default: 'offline',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    // HH:MM 24-hour strings e.g. "09:00", "17:30"
    startTime: { type: String, default: '00:00', trim: true },
    endTime:   { type: String, default: '23:59', trim: true },
    duration: {
      type: Number, // in hours
      min: 0,
      default: 0,
    },
    registrationDeadline: {
      type: Date,
    },
    maxParticipants: {
      type: Number,
      min: 1,
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ status: 1 });
activitySchema.index({ startDate: 1 });
activitySchema.index({ title: 'text' });

module.exports = mongoose.model('Activity', activitySchema);
