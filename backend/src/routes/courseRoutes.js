const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const {
  validateCreateCourse,
  validateUpdateCourse,
  validateCreateSkill,
  validateUpdateSkill,
} = require('../middleware/validator');
const {
  getCourses,
  getCourseById,
  getPublicCourseSkills,
  getMyCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const {
  getCourseSkills,
  addSkillToCourse,
  updateSkill,
  deleteSkill,
} = require('../controllers/skillController');
const {
  enrollCourse,
  unenrollCourse,
  getEnrolledStudents,
} = require('../controllers/enrollmentController');

// GET /api/courses or /api/v1/courses (Public, optional student auth for enrollmentStatus, UC-30)
router.get('/', optionalAuth, getCourses);

// GET /api/courses/my or /api/v1/courses/my (Instructor only)
router.get('/my', protect, restrictTo('instructor'), getMyCourses);

// GET /api/courses/:id or /api/v1/courses/:id (Public)
router.get('/:id', getCourseById);

// GET /api/courses/:courseId/public-skills (Public & student exploration)
router.get('/:courseId/public-skills', getPublicCourseSkills);

// GET /api/courses/:courseId/enrolled-students (Instructor only, UC-34, TON-128)
router.get(
  '/:courseId/enrolled-students',
  protect,
  restrictTo('instructor'),
  getEnrolledStudents
);

// POST /api/courses/:courseId/enroll (Student only, UC-31)
router.post('/:courseId/enroll', protect, restrictTo('student'), enrollCourse);

// PUT /api/courses/:courseId/unenroll (Student only, UC-33, TON-127)
router.put('/:courseId/unenroll', protect, restrictTo('student'), unenrollCourse);

// DELETE /api/courses/:courseId/enroll (Student only, backward-compatibility alias)
router.delete('/:courseId/enroll', protect, restrictTo('student'), unenrollCourse);

// GET /api/courses/:courseId/skills or /api/v1/courses/:courseId/skills (Instructor only, TON-84)
router.get('/:courseId/skills', protect, restrictTo('instructor'), getCourseSkills);

// POST /api/courses/:courseId/skills (Instructor only, TON-84)
router.post('/:courseId/skills', protect, restrictTo('instructor'), validateCreateSkill, addSkillToCourse);

// PUT /api/courses/:courseId/skills/:skillId (Instructor only, TON-84)
router.put('/:courseId/skills/:skillId', protect, restrictTo('instructor'), validateUpdateSkill, updateSkill);

// DELETE /api/courses/:courseId/skills/:skillId (Instructor only, TON-84)
router.delete('/:courseId/skills/:skillId', protect, restrictTo('instructor'), deleteSkill);

// POST /api/courses or /api/v1/courses (Instructor only)
router.post('/', protect, restrictTo('instructor'), validateCreateCourse, createCourse);

// PUT /api/courses/:id or /api/v1/courses/:id (Instructor only)
router.put('/:id', protect, restrictTo('instructor'), validateUpdateCourse, updateCourse);

// DELETE /api/courses/:id or /api/v1/courses/:id (Instructor only)
router.delete('/:id', protect, restrictTo('instructor'), deleteCourse);

module.exports = router;
