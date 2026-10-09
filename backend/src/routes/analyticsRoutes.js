const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getAnalyticsOverview,
  getSkillAnalytics,
} = require('../controllers/analyticsController');

// All analytics endpoints require instructor role
router.get(
  '/overview',
  protect,
  restrictTo('instructor'),
  getAnalyticsOverview
);

router.get(
  '/skills',
  protect,
  restrictTo('instructor'),
  getSkillAnalytics
);

module.exports = router;
