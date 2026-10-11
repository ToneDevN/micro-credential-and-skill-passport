const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  connectGithub,
  githubCallback,
} = require('../controllers/githubAuthController');

router.get('/connect', protect, connectGithub);
router.get('/callback', githubCallback);

module.exports = router;
