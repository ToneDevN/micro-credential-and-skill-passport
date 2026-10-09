const mongoose = require('mongoose');

const courseSkillSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
    },
    skill_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MicroSkill',
      required: [true, 'Skill ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate skill in same course
courseSkillSchema.index({ course_id: 1, skill_id: 1 }, { unique: true });

const CourseSkill = mongoose.model('CourseSkill', courseSkillSchema);

module.exports = CourseSkill;
