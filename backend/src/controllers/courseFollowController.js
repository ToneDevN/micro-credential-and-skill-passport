const mongoose = require('mongoose');
const { CourseFollow, Course } = require('../models');

/**
 * @desc    Follow a course (Student shortcut/bookmark)
 * @route   POST /api/course-follows or /api/v1/course-follows
 * @access  Private (Student only, TON-223)
 */
const followCourse = async (req, res, next) => {
  try {
    const courseId = req.body.course_id || req.body.courseId;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Valid course ID is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const student_id = req.user._id || req.user.id;

    // Check if already followed
    const existing = await CourseFollow.findOne({ student_id, course_id: courseId });
    if (existing) {
      return res.status(409).json({
        message: 'You are already following this course',
        follow: existing,
      });
    }

    const follow = await CourseFollow.create({
      student_id,
      course_id: courseId,
      followed_at: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Successfully followed course',
      follow,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You are already following this course' });
    }
    next(error);
  }
};

/**
 * @desc    Unfollow a course
 * @route   DELETE /api/course-follows/:courseId or /api/v1/course-follows/:courseId
 * @access  Private (Student only, TON-223)
 */
const unfollowCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Valid course ID is required' });
    }

    const student_id = req.user._id || req.user.id;

    const follow = await CourseFollow.findOneAndDelete({
      student_id,
      course_id: courseId,
    });

    if (!follow) {
      return res.status(404).json({ message: 'Course follow not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully unfollowed course',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current student's followed courses
 * @route   GET /api/course-follows/me or /api/v1/course-follows/me
 * @access  Private (Student only, TON-223)
 */
const getMyFollowedCourses = async (req, res, next) => {
  try {
    const student_id = req.user._id || req.user.id;

    const follows = await CourseFollow.find({ student_id })
      .populate('course_id')
      .sort({ followed_at: -1 });

    res.status(200).json({
      success: true,
      count: follows.length,
      followedCourses: follows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  followCourse,
  unfollowCourse,
  getMyFollowedCourses,
};
