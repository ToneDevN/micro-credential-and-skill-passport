const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getMyPassport,
  getMySkillMap,
  getPassportByStudentId,
} = require('../controllers/passportController');

// Student passport endpoints
router.get('/', protect, restrictTo('student'), getMyPassport);
router.get('/my', protect, restrictTo('student'), getMyPassport);
router.get('/my/skill-map', protect, restrictTo('student'), getMySkillMap);

// Public student passport endpoint
router.get('/:studentId', getPassportByStudentId);

module.exports = router;
