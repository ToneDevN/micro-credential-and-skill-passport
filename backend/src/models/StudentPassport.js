const mongoose = require('mongoose');
const { badgeSchema } = require('./Badge');

const studentPassportSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      unique: true,
      index: true,
    },
    badges: {
      type: [badgeSchema],
      default: [],
    },
    public_slug: {
      type: String,
      default: null,
    },
    is_public: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index to query badge by student_skill_status_id efficiently
studentPassportSchema.index({ 'badges.student_skill_status_id': 1 });

// Partial unique index for public_slug only when it is a non-null string
studentPassportSchema.index(
  { public_slug: 1 },
  { unique: true, partialFilterExpression: { public_slug: { $type: 'string' } } }
);

const StudentPassport = mongoose.model('StudentPassport', studentPassportSchema);

module.exports = StudentPassport;
