const mongoose = require('mongoose');

/**
 * AcademicConfig — stores admin-managed departments and batches.
 * type: 'department' | 'batch'
 * Seeded with MCA department on first run via bootstrap.
 */
const academicConfigSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['department', 'batch'],
      required: [true, 'Type is required (department or batch)'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique name per type
academicConfigSchema.index({ type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicConfig', academicConfigSchema);
