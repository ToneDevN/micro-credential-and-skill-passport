const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('student'));

router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Student Dashboard',
    user: req.user,
  });
});

module.exports = router;
