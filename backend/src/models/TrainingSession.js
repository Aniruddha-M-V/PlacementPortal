const mongoose = require('mongoose');
const { SESSION_STATUS } = require('../config/constants');

const scheduleSlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "11:00"
  },
  { _id: false }
);

const trainingSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    // Who conducts it
    trainer: {
      type: String, // External trainer name
      trim: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      default: null,
    },
    // Who attends it
    batch: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    semester: {
      type: Number,
    },
    section: {
      type: String,
      trim: true,
    },
    // Scheduling
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
    schedule: {
      type: [scheduleSlotSchema],
      default: [],
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
    totalHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.UPCOMING,
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

trainingSessionSchema.index({ status: 1 });
trainingSessionSchema.index({ batch: 1, department: 1 });
trainingSessionSchema.index({ startDate: 1, endDate: 1 });
trainingSessionSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('TrainingSession', trainingSessionSchema);
