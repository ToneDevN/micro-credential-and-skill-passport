const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    skill_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MicroSkill',
      index: true,
      default: null,
    },
    student_skill_status_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentSkillStatus',
      default: null,
    },
    skill_name: {
      type: String,
      trim: true,
      default: '',
    },
    course_name: {
      type: String,
      trim: true,
      default: '',
    },
    issued_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true, strict: false }
);

const Badge = mongoose.model('Badge', badgeSchema);

module.exports = {
  badgeSchema,
  Badge,
};
