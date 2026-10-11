const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMe } = require('../controllers/authController');
const { disconnectGithub } = require('../controllers/githubAuthController');
const { getMyRepos } = require('../controllers/githubController');

// All /users/me routes require authentication
router.get('/me', protect, getMe);
router.delete('/me/github', protect, disconnectGithub);
router.get('/me/github/repos', protect, getMyRepos);

module.exports = router;
