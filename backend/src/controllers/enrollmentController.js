const mongoose = require('mongoose');
const {
  Course,
  CourseSkill,
  Enrollment,
  StudentSkillStatus,
  VerificationRequest,
} = require('../models');

/**
 * @desc    Student enrolls in a course (UC-31)
 * @route   POST /api/courses/:courseId/enroll or /api/v1/courses/:courseId/enroll
 * @access  Private (Student only)
 */
const enrollCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const existingEnrollment = await Enrollment.findOne({
      student_id: studentId,
      course_id: courseId,
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return res.status(409).json({ message: 'Already enrolled in this course' });
      }
      if (existingEnrollment.status === 'dropped') {
        existingEnrollment.status = 'active';
        existingEnrollment.enrolled_at = new Date();
        existingEnrollment.completed_at = null;
        await existingEnrollment.save();

        return res.status(201).json({
          success: true,
          enrollment: existingEnrollment,
        });
      }
      return res.status(409).json({ message: 'Already enrolled in this course' });
    }

    const enrollment = await Enrollment.create({
      student_id: studentId,
      course_id: course._id,
      status: 'active',
      enrolled_at: new Date(),
    });

    res.status(201).json({
      success: true,
      enrollment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Already enrolled in this course' });
    }
    next(error);
  }
};

/**
 * @desc    Student unenrolls from a course (soft delete to 'dropped') (UC-33)
 * @route   PUT /api/courses/:courseId/unenroll or DELETE /api/courses/:courseId/enroll
 * @access  Private (Student only)
 */
const unenrollCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    const enrollment = await Enrollment.findOne({
      student_id: studentId,
      course_id: courseId,
    });

    if (!enrollment || enrollment.status === 'dropped') {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Precondition: check if student has a Pending verification request in this course
    const courseSkills = await CourseSkill.find({ course_id: courseId });
    const courseSkillIds = courseSkills.map((cs) => cs._id);

    const studentStatuses = await StudentSkillStatus.find({
      student_id: studentId,
      course_skill_id: { $in: courseSkillIds },
    });
    const statusIds = studentStatuses.map((s) => s._id);

    const pendingRequest = await VerificationRequest.findOne({
      student_skill_status_id: { $in: statusIds },
      status: 'pending',
    });

    if (pendingRequest) {
      return res.status(400).json({
        message: 'ไม่สามารถถอนได้ เนื่องจากมีคำขอรับรองทักษะที่รออยู่ กรุณายกเลิกคำขอก่อน',
      });
    }

    // Soft delete: status becomes 'dropped', record is kept, badges remain untouched
    enrollment.status = 'dropped';
    await enrollment.save();

    res.status(200).json({
      success: true,
      enrollment,
      message: 'ถอนการลงทะเบียนสำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List student's active enrolled courses with per-course skill progress (UC-32)
 * @route   GET /api/students/me/enrollments or /api/v1/students/me/enrollments
 * @access  Private (Student only)
 */
const getStudentEnrollments = async (req, res, next) => {
  try {
    const studentId = req.user._id || req.user.id;

    // Filter only active enrollments (dropped enrollments are excluded)
    const enrollments = await Enrollment.find({
      student_id: studentId,
      status: 'active',
    })
      .populate('course_id')
      .sort({ enrolled_at: -1 });

    const results = await Promise.all(
      enrollments.map(async (enr) => {
        const course = enr.course_id;
        if (!course) return null;

        const courseSkills = await CourseSkill.find({ course_id: course._id });
        const totalCount = courseSkills.length;
        const courseSkillIds = courseSkills.map((cs) => cs._id);

        const earnedCount = await StudentSkillStatus.countDocuments({
          student_id: studentId,
          course_skill_id: { $in: courseSkillIds },
          status: 'approved',
        });

        return {
          _id: enr._id,
          course: {
            _id: course._id,
            name: course.name,
            description: course.description,
            instructor_id: course.instructor_id,
          },
          status: enr.status,
          earnedCount,
          totalCount,
          enrolled_at: enr.enrolled_at,
          completed_at: enr.completed_at,
        };
      })
    );

    const filteredResults = results.filter(Boolean);

    res.status(200).json({
      success: true,
      enrollments: filteredResults,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor manually marks enrollment complete
 * @route   PUT /api/enrollments/:id/complete or /api/v1/enrollments/:id/complete
 * @access  Private (Instructor only)
 */
const completeEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    enrollment.status = 'completed';
    enrollment.completed_at = new Date();
    await enrollment.save();

    res.status(200).json({
      success: true,
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Instructor views students enrolled in their course (UC-34)
 * @route   GET /api/courses/:courseId/enrolled-students
 * @access  Private (Instructor only)
 */
const getEnrolledStudents = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const instructorId = (req.user._id || req.user.id).toString();

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify course belongs to instructor
    const courseInstructorId = (
      course.instructor_id?._id || course.instructor_id
    ).toString();
    if (courseInstructorId !== instructorId) {
      return res.status(403).json({
        message: 'Forbidden: You do not own this course',
      });
    }

    // Find active enrollments only
    const enrollments = await Enrollment.find({
      course_id: courseId,
      status: 'active',
    })
      .populate('student_id', '_id name email')
      .sort({ enrolled_at: -1 });

    const courseSkills = await CourseSkill.find({ course_id: courseId });
    const courseSkillIds = courseSkills.map((cs) => cs._id);

    const students = await Promise.all(
      enrollments.map(async (enr) => {
        const student = enr.student_id;
        if (!student) return null;

        const studentStatuses = await StudentSkillStatus.find({
          student_id: student._id,
          course_skill_id: { $in: courseSkillIds },
        });

        const statusIds = studentStatuses.map((s) => s._id);

        const badgeCount = studentStatuses.filter(
          (s) => s.status === 'approved'
        ).length;

        const pendingCount = await VerificationRequest.countDocuments({
          student_skill_status_id: { $in: statusIds },
          status: 'pending',
        });

        return {
          student: {
            _id: student._id,
            name: student.name,
            email: student.email,
          },
          enrolled_at: enr.enrolled_at,
          badgeCount,
          pendingCount,
        };
      })
    );

    const filteredStudents = students.filter(Boolean);

    res.status(200).json({
      students: filteredStudents,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrollCourse,
  unenrollCourse,
  getStudentEnrollments,
  completeEnrollment,
  getEnrolledStudents,
};
