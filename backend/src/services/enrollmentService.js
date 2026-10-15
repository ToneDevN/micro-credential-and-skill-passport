const {
  Enrollment,
  Course,
  CourseSkill,
  StudentSkillStatus,
} = require('../models');
const notificationService = require('./notificationService');

/**
 * Checks if a student has earned all micro-skills in a course.
 * If so, flips active Enrollment.status to 'completed', sets completed_at,
 * and creates a 'course_completed' Notification.
 *
 * @param {string|import('mongoose').Types.ObjectId} studentId
 * @param {string|import('mongoose').Types.ObjectId} courseId
 * @returns {Promise<{ completed: boolean, enrollment?: any }>}
 */
async function checkAndCompleteCourse(studentId, courseId) {
  // 1. Find active enrollment
  const activeEnrollment = await Enrollment.findOne({
    student_id: studentId,
    course_id: courseId,
    status: 'active',
  });

  // Not enrolled or already completed/dropped -> silent no-op
  if (!activeEnrollment) {
    return { completed: false };
  }

  // 2. Count total micro-skills in the course
  const courseSkills = await CourseSkill.find({ course_id: courseId });
  const totalSkillsCount = courseSkills.length;

  if (totalSkillsCount === 0) {
    return { completed: false };
  }

  // 3. Count approved skill statuses for this student in this course
  const courseSkillIds = courseSkills.map((cs) => cs._id);
  const approvedSkillsCount = await StudentSkillStatus.countDocuments({
    student_id: studentId,
    course_skill_id: { $in: courseSkillIds },
    status: 'approved',
  });

  // 4. If all skills certified, mark course as completed
  if (approvedSkillsCount >= totalSkillsCount) {
    const now = new Date();
    activeEnrollment.status = 'completed';
    activeEnrollment.completed_at = now;
    await activeEnrollment.save();

    // Fetch course name for notification
    const course = await Course.findById(courseId);
    const courseName = course?.name || 'Unknown Course';

    // Send course_completed notification (UC-50 / TON-144)
    await notificationService.create(
      studentId,
      'course_completed',
      `ยินดีด้วย! คุณผ่านวิชา ${courseName} ครบทุกทักษะแล้ว`,
      courseId
    );

    return { completed: true, enrollment: activeEnrollment };
  }

  return { completed: false };
}

module.exports = {
  checkAndCompleteCourse,
};
