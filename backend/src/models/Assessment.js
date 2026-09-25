const mongoose = require('mongoose');
const { ASSESSMENT_CATEGORIES } = require('../config/constants');

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingSession',
      default: null,
    },
    category: {
      type: String,
      enum: Object.values(ASSESSMENT_CATEGORIES),
      required: [true, 'Category is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Evaluator reference is required'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks is required'],
      min: 1,
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required'],
      min: 0,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate percentage before save
assessmentSchema.pre('save', function (next) {
  if (this.maxMarks && this.maxMarks > 0) {
    this.percentage = parseFloat(((this.marksObtained / this.maxMarks) * 100).toFixed(2));
  }
  next();
});

assessmentSchema.index({ student: 1, category: 1 });
assessmentSchema.index({ session: 1 });
assessmentSchema.index({ student: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
