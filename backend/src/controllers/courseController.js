const mongoose = require('mongoose');
const {
  Course,
  CourseSkill,
  StudentSkillStatus,
  StudentPassport,
} = require('../models');

/**
 * @desc    Get all courses with optional search and skill counts
 * @route   GET /api/courses or /api/v1/courses
 * @access  Public
 */
const getCourses = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const rawCourses = await Course.find(filter)
      .populate('instructor_id', 'name')
      .sort({ createdAt: -1 });

    const courses = await Promise.all(
      rawCourses.map(async (course) => {
        const skillCount = await CourseSkill.countDocuments({
          course_id: course._id,
        });

        return {
          _id: course._id,
          name: course.name,
          description: course.description,
          instructor: course.instructor_id
            ? {
                _id: course.instructor_id._id,
                name: course.instructor_id.name,
              }
            : null,
          skillCount,
          createdAt: course.createdAt,
        };
      })
    );

    res.status(200).json({ courses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get skills linked to a specific course
 * @route   GET /api/courses/:courseId/skills or /api/v1/courses/:courseId/skills
 * @access  Public
 */
const getCourseSkills = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const course = await Course.findById(courseId).populate(
      'instructor_id',
      'name'
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const courseSkills = await CourseSkill.find({ course_id: courseId }).populate(
      'skill_id'
    );

    const skills = courseSkills
      .filter((cs) => cs.skill_id)
      .map((cs) => ({
        _id: cs.skill_id._id,
        courseSkillId: cs._id,
        course_skill_id: cs._id,
        name: cs.skill_id.name,
        description: cs.skill_id.description,
        criteria: cs.skill_id.criteria,
      }));

    res.status(200).json({
      course: {
        _id: course._id,
        name: course.name,
        description: course.description,
        instructor: course.instructor_id
          ? {
              _id: course.instructor_id._id,
              name: course.instructor_id.name,
            }
          : null,
      },
      skills,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get course by ID
 * @route   GET /api/courses/:id or /api/v1/courses/:id
 * @access  Public
 */
const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = await Course.findById(id).populate('instructor_id', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const skillCount = await CourseSkill.countDocuments({
      course_id: course._id,
    });

    res.status(200).json({
      course: {
        _id: course._id,
        name: course.name,
        description: course.description,
        instructor: course.instructor_id
          ? {
              _id: course.instructor_id._id,
              name: course.instructor_id.name,
            }
          : null,
        instructor_id: course.instructor_id?._id || course.instructor_id,
        skillCount,
        createdAt: course.createdAt,
        created_at: course.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List all courses belonging to the authenticated instructor
 * @route   GET /api/courses/my or /api/v1/courses/my
 * @access  Private (Instructor only)
 */
const getMyCourses = async (req, res, next) => {
  try {
    const instructorId = req.user._id || req.user.id;

    const rawCourses = await Course.find({
      instructor_id: instructorId,
    }).sort({ createdAt: -1 });

    const courses = await Promise.all(
      rawCourses.map(async (course) => {
        const skillCount = await CourseSkill.countDocuments({
          course_id: course._id,
        });

        return {
          _id: course._id,
          name: course.name,
          description: course.description,
          instructor_id: course.instructor_id,
          createdAt: course.createdAt,
          created_at: course.createdAt,
          skillCount,
        };
      })
    );

    res.status(200).json({ courses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses or /api/v1/courses
 * @access  Private (Instructor only)
 */
const createCourse = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const instructorId = req.user._id || req.user.id;

    const course = await Course.create({
      name: name.trim(),
      description: description.trim(),
      instructor_id: instructorId,
    });

    res.status(201).json({
      course: {
        _id: course._id,
        name: course.name,
        description: course.description,
        instructor_id: course.instructor_id,
        createdAt: course.createdAt,
        created_at: course.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing course
 * @route   PUT /api/courses/:id or /api/v1/courses/:id
 * @access  Private (Instructor only)
 */
const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const instructorId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Ownership check
    if (course.instructor_id.toString() !== instructorId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to modify this course',
      });
    }

    if (name !== undefined) {
      course.name = name.trim();
    }
    if (description !== undefined) {
      course.description = description.trim();
    }

    await course.save();

    res.status(200).json({
      course: {
        _id: course._id,
        name: course.name,
        description: course.description,
        instructor_id: course.instructor_id,
        createdAt: course.createdAt,
        created_at: course.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a course (blocked if approved badges exist)
 * @route   DELETE /api/courses/:id or /api/v1/courses/:id
 * @access  Private (Instructor only)
 */
const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const instructorId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Ownership check
    if (course.instructor_id.toString() !== instructorId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to delete this course',
      });
    }

    // Check for approved badges under this course
    const courseSkills = await CourseSkill.find({ course_id: course._id }).select(
      '_id'
    );
    const courseSkillIds = courseSkills.map((cs) => cs._id);

    const approvedStatus = await StudentSkillStatus.findOne({
      course_skill_id: { $in: courseSkillIds },
      status: 'approved',
    });

    const approvedBadge = await StudentPassport.findOne({
      'badges.course_name': course.name,
    });

    if (approvedStatus || approvedBadge) {
      return res.status(400).json({
        message: 'Cannot delete course with approved badges',
      });
    }

    // Delete associated CourseSkill entries
    await CourseSkill.deleteMany({ course_id: course._id });

    // Delete course
    await Course.findByIdAndDelete(course._id);

    res.status(200).json({
      message: 'Course deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  getCourseSkills,
  getPublicCourseSkills: getCourseSkills,
  getMyCourses,
  createCourse,
  updateCourse,
  deleteCourse,
};
