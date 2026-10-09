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
  },
  {
    timestamps: true,
  }
);

// Index to query badge by student_skill_status_id efficiently
studentPassportSchema.index({ 'badges.student_skill_status_id': 1 });

const StudentPassport = mongoose.model('StudentPassport', studentPassportSchema);

module.exports = StudentPassport;
