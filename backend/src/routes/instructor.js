const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('instructor'));

router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Instructor Dashboard',
    user: req.user,
  });
});

module.exports = router;
