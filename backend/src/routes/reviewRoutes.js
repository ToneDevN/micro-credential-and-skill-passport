const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { validateRejectVerification } = require('../middleware/validator');
const {
  getInstructorRequests,
  approveRequest,
  rejectRequest,
} = require('../controllers/reviewController');

router.get('/verification-requests/instructor', protect, restrictTo('instructor'), getInstructorRequests);
router.put('/verification-requests/:id/approve', protect, restrictTo('instructor'), approveRequest);
router.put('/verification-requests/:id/reject', protect, restrictTo('instructor'), validateRejectVerification, rejectRequest);

module.exports = router;
