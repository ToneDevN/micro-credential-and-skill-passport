const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getMyPassport,
  getMySkillMap,
  getPassportByStudentId,
} = require('../controllers/passportController');
const {
  sharePassport,
  regenerateSharePassport,
  revokeSharePassport,
  getPublicPassport,
} = require('../controllers/passportShareController');

// Student passport endpoints
router.get('/', protect, restrictTo('student'), getMyPassport);
router.get('/my', protect, restrictTo('student'), getMyPassport);
router.get('/my/skill-map', protect, restrictTo('student'), getMySkillMap);

// Share passport endpoints (UC-44, TON-151)
router.post('/share', protect, restrictTo('student'), sharePassport);
router.post('/share/regenerate', protect, restrictTo('student'), regenerateSharePassport);
router.delete('/share', protect, restrictTo('student'), revokeSharePassport);

// Public passport view by slug (UC-45, TON-151) — must be before /:studentId
router.get('/public/:slug', getPublicPassport);

// Public student passport endpoint by studentId
router.get('/:studentId', getPassportByStudentId);

module.exports = router;
