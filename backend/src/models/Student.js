const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    // Linked user account (optional — students may not all have logins)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Personal Details
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    photo: {
      type: String,
      default: null,
    },

    // Academic Details
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    batch: {
      type: String,
      required: [true, 'Batch is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    backlogs: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Placement Profile
    skills: {
      type: [String],
      default: [],
    },
    linkedIn: {
      type: String,
      trim: true,
      default: null,
    },
    github: {
      type: String,
      trim: true,
      default: null,
    },
    portfolio: {
      type: String,
      trim: true,
      default: null,
    },
    placementStatus: {
      type: String,
      enum: ['not_placed', 'placed', 'opted_out'],
      default: 'not_placed',
    },
    isPlacementEligible: {
      type: Boolean,
      default: false,
    },
    eligibilityReasons: {
      type: [String],
      default: [],
    },

    // Archive
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
studentSchema.index({ batch: 1, department: 1 });
studentSchema.index({ department: 1, semester: 1 });
studentSchema.index({ isArchived: 1 });
studentSchema.index({ name: 'text', email: 'text', rollNumber: 'text' });

module.exports = mongoose.model('Student', studentSchema);
