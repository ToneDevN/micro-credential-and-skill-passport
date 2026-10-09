const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  validateSubmitVerification,
  validateUpdateVerification,
  validateRejectVerification,
} = require('../middleware/validator');
const {
  submitRequest,
  editRequest,
  cancelRequest,
  resubmitRequest,
  getMyRequests,
} = require('../controllers/verificationController');
const {
  getInstructorRequests,
  approveRequest,
  rejectRequest,
} = require('../controllers/reviewController');

// --- Instructor Review Routes (TON-87) ---
// Must be mounted before parameterized /:id routes
router.get(
  '/instructor',
  protect,
  restrictTo('instructor'),
  getInstructorRequests
);

router.put(
  '/:id/approve',
  protect,
  restrictTo('instructor'),
  approveRequest
);

router.put(
  '/:id/reject',
  protect,
  restrictTo('instructor'),
  validateRejectVerification,
  rejectRequest
);

// --- Student Verification Routes (TON-45) ---
router.post(
  '/',
  protect,
  restrictTo('student'),
  validateSubmitVerification,
  submitRequest
);

router.get('/my', protect, restrictTo('student'), getMyRequests);

router.put(
  '/:id',
  protect,
  restrictTo('student'),
  validateUpdateVerification,
  editRequest
);

router.delete('/:id', protect, restrictTo('student'), cancelRequest);

router.post(
  '/:id/resubmit',
  protect,
  restrictTo('student'),
  validateUpdateVerification,
  resubmitRequest
);

module.exports = router;
