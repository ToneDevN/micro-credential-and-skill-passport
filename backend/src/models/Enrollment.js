const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'dropped', 'completed'],
        message: '{VALUE} is not a valid enrollment status',
      },
      default: 'active',
    },
    enrolled_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate enrollments
enrollmentSchema.index({ student_id: 1, course_id: 1 }, { unique: true });

// Pre-save hook: auto-populate completed_at when status is marked completed
enrollmentSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completed_at) {
    this.completed_at = new Date();
  }
  next();
});

// Post-save hook: auto-create not_started StudentSkillStatus for each CourseSkill in the course
enrollmentSchema.post('save', async function (doc) {
  try {
    const CourseSkill = mongoose.model('CourseSkill');
    const StudentSkillStatus = mongoose.model('StudentSkillStatus');

    const courseSkills = await CourseSkill.find({ course_id: doc.course_id });
    for (const cs of courseSkills) {
      await StudentSkillStatus.updateOne(
        { student_id: doc.student_id, course_skill_id: cs._id },
        { $setOnInsert: { status: 'not_started' } },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('[Enrollment hook error]:', err.message);
  }
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
