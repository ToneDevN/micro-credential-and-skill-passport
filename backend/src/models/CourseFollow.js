const mongoose = require('mongoose');

const courseFollowSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
    },
    followed_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: student can follow a course only once (TON-223)
courseFollowSchema.index({ student_id: 1, course_id: 1 }, { unique: true });

const CourseFollow = mongoose.model('CourseFollow', courseFollowSchema);

module.exports = CourseFollow;
