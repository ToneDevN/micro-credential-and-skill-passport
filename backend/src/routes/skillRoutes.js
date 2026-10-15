const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const {
  validateCreateSkill,
  validateUpdateSkill,
} = require('../middleware/validator');
const {
  getSkills,
  searchSkills,
  getCourseSkills,
  addSkillToCourse,
  updateSkill,
  deleteSkill,
  openSkillVerification,
  closeSkillVerification,
} = require('../controllers/skillController');
const { getPublicCourseSkills } = require('../controllers/courseController');

// Open / Close Skill for verification (TON-224)
router.patch('/:id/open', protect, restrictTo('instructor'), openSkillVerification);
router.patch('/:id/close', protect, restrictTo('instructor'), closeSkillVerification);

// GET /api/skills or /api/v1/skills (TON-160)
router.get('/', optionalAuth, getSkills);

// GET /api/skills/search or /api/v1/skills/search
router.get('/search', optionalAuth, searchSkills);

// GET /api/skills/course/:courseId (Student & public exploration alias)
router.get('/course/:courseId', optionalAuth, getPublicCourseSkills);

// Course-scoped skills routes (TON-84)
router.get('/courses/:courseId/skills', protect, restrictTo('instructor'), getCourseSkills);
router.post('/courses/:courseId/skills', protect, restrictTo('instructor'), validateCreateSkill, addSkillToCourse);
router.put('/courses/:courseId/skills/:skillId', protect, restrictTo('instructor'), validateUpdateSkill, updateSkill);
router.delete('/courses/:courseId/skills/:skillId', protect, restrictTo('instructor'), deleteSkill);

module.exports = router;
