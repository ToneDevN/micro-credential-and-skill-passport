const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  completeEnrollment,
  getStudentEnrollments,
} = require('../controllers/enrollmentController');

// PUT /api/enrollments/:id/complete (Instructor only, TON-116)
router.put('/:id/complete', protect, restrictTo('instructor'), completeEnrollment);

// GET /api/enrollments/my (Student only)
router.get('/my', protect, restrictTo('student'), getStudentEnrollments);

module.exports = router;
