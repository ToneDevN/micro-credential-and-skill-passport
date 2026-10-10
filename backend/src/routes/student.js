const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');

const { getStudentEnrollments } = require('../controllers/enrollmentController');

router.use(protect, restrictTo('student'));

// GET /api/students/me/enrollments or /api/student/me/enrollments (TON-116)
router.get('/me/enrollments', getStudentEnrollments);
router.get('/enrollments', getStudentEnrollments);

router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Student Dashboard',
    user: req.user,
  });
});

module.exports = router;
