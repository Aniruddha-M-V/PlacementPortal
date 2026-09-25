const mongoose = require('mongoose');
const { RESUME_STATUS } = require('../config/constants');

const resumeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // bytes
    },
    mimeType: {
      type: String,
    },
    version: {
      type: Number,
      default: 1,
    },
    reviewStatus: {
      type: String,
      enum: Object.values(RESUME_STATUS),
      default: RESUME_STATUS.PENDING,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    isLatest: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

resumeSchema.index({ student: 1, isLatest: 1 });
resumeSchema.index({ reviewStatus: 1 });

module.exports = mongoose.model('Resume', resumeSchema);
