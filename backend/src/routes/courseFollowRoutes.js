const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  followCourse,
  unfollowCourse,
  getMyFollowedCourses,
} = require('../controllers/courseFollowController');

router.use(protect, restrictTo('student'));

// POST /api/course-follows (Student follows course)
router.post('/', followCourse);

// DELETE /api/course-follows/:courseId (Student unfollows course)
router.delete('/:courseId', unfollowCourse);

// GET /api/course-follows/me (Student gets followed courses)
router.get('/me', getMyFollowedCourses);

module.exports = router;
