const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  validateCreateSkill,
  validateUpdateSkill,
} = require('../middleware/validator');
const {
  searchSkills,
  getCourseSkills,
  addSkillToCourse,
  updateSkill,
  deleteSkill,
} = require('../controllers/skillController');

// GET /api/skills/search or /api/v1/skills/search
router.get('/search', searchSkills);

// Course-scoped skills routes (TON-84)
router.get('/courses/:courseId/skills', protect, restrictTo('instructor'), getCourseSkills);
router.post('/courses/:courseId/skills', protect, restrictTo('instructor'), validateCreateSkill, addSkillToCourse);
router.put('/courses/:courseId/skills/:skillId', protect, restrictTo('instructor'), validateUpdateSkill, updateSkill);
router.delete('/courses/:courseId/skills/:skillId', protect, restrictTo('instructor'), deleteSkill);

module.exports = router;
