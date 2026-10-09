const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getMyPassport,
  getMySkillMap,
} = require('../controllers/passportController');

// All passport endpoints are student-scoped
router.get('/my', protect, restrictTo('student'), getMyPassport);
router.get('/my/skill-map', protect, restrictTo('student'), getMySkillMap);

module.exports = router;
