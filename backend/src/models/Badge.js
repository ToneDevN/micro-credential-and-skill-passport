const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    student_skill_status_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentSkillStatus',
      required: [true, 'StudentSkillStatus ID is required'],
    },
    skill_name: {
      type: String,
      required: [true, 'Skill name snapshot is required'],
      trim: true,
    },
    course_name: {
      type: String,
      required: [true, 'Course name snapshot is required'],
      trim: true,
    },
    issued_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const Badge = mongoose.model('Badge', badgeSchema);

module.exports = {
  badgeSchema,
  Badge,
};
