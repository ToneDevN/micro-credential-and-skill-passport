const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMe } = require('../controllers/authController');
const { updateProfile, changePassword } = require('../controllers/userController');
const { disconnectGithub } = require('../controllers/githubAuthController');
const { getMyRepos } = require('../controllers/githubController');

// All /users/me routes require authentication
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/me/password', protect, changePassword);
router.delete('/me/github', protect, disconnectGithub);
router.get('/me/github/repos', protect, getMyRepos);

module.exports = router;
