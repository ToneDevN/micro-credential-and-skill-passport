const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { completeEnrollment } = require('../controllers/enrollmentController');

// TON-222: Disable Enrollment API routes for v1 (return 503)
// POST   /api/enrollments          # Enroll in course
// DELETE /api/enrollments/:id      # Unenroll
// GET    /api/enrollments/me       # My enrolled courses
router.post('/', (req, res) => {
  res.status(503).json({ message: 'Enrollment feature coming in v2' });
});

router.delete('/:id', (req, res) => {
  res.status(503).json({ message: 'Enrollment feature coming in v2' });
});

router.get('/me', (req, res) => {
  res.status(503).json({ message: 'Enrollment feature coming in v2' });
});

router.get('/my', (req, res) => {
  res.status(503).json({ message: 'Enrollment feature coming in v2' });
});

router.get('/', (req, res) => {
  res.status(503).json({ message: 'Enrollment feature coming in v2' });
});

// Preserved for controller tests / v2 (PUT /api/enrollments/:id/complete)
router.put('/:id/complete', protect, restrictTo('instructor'), completeEnrollment);

module.exports = router;

