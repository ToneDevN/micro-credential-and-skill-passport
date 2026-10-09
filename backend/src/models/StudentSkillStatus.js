const mongoose = require('mongoose');

const studentSkillStatusSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    course_skill_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseSkill',
      required: [true, 'CourseSkill ID is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['not_started', 'pending', 'approved', 'rejected', 'expired'],
        message: '{VALUE} is not a valid skill status',
      },
      default: 'not_started',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate status per student per course skill
studentSkillStatusSchema.index(
  { student_id: 1, course_skill_id: 1 },
  { unique: true }
);

const StudentSkillStatus = mongoose.model(
  'StudentSkillStatus',
  studentSkillStatusSchema
);

module.exports = StudentSkillStatus;
