const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { getGithubInfo } = require('../controllers/githubController');

// GET /api/verification-requests/:id/github-info (Instructor only, TON-119)
router.get('/:id/github-info', protect, restrictTo('instructor'), getGithubInfo);

module.exports = router;
