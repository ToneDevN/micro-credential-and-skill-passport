const mongoose = require('mongoose');
const {
  VerificationRequest,
  StudentSkillStatus,
  CourseSkill,
  Course,
  MicroSkill,
  StudentPassport,
  Enrollment,
} = require('../models');
const notificationService = require('../services/notificationService');


/**
 * @desc    Get verification requests for courses taught by the authenticated instructor
 * @route   GET /api/verification-requests/instructor or /api/v1/verification-requests/instructor
 * @access  Private (Instructor only)
 */
const getInstructorRequests = async (req, res, next) => {
  try {
    const instructorId = req.user._id || req.user.id;
    const { status = 'pending', courseId, sort = 'date_desc' } = req.query;

    // 1. Find all courses owned by this instructor
    const instructorCourses = await Course.find({
      instructor_id: instructorId,
    }).select('_id name');

    const instructorCourseIds = instructorCourses.map((c) => c._id);

    // If instructor has no courses, return empty immediately
    if (instructorCourseIds.length === 0) {
      return res.status(200).json({
        requests: [],
        filters: { courses: [] },
        total: 0,
      });
    }

    // 2. Find CourseSkill entries belonging to instructor's courses
    let targetCourseIds = instructorCourseIds;
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: 'Invalid course ID format' });
      }
      // If courseId does not belong to this instructor, return empty
      const isOwned = instructorCourseIds.some(
        (id) => id.toString() === courseId.toString()
      );
      if (!isOwned) {
        return res.status(200).json({
          requests: [],
          filters: {
            courses: instructorCourses.map((c) => ({
              _id: c._id,
              name: c.name,
            })),
          },
          total: 0,
        });
      }
      targetCourseIds = [courseId];
    }

    const courseSkills = await CourseSkill.find({
      course_id: { $in: targetCourseIds },
    });
    const courseSkillIds = courseSkills.map((cs) => cs._id);

    // 3. Find StudentSkillStatus entries for these CourseSkills
    const studentSkillStatuses = await StudentSkillStatus.find({
      course_skill_id: { $in: courseSkillIds },
    });
    const statusIds = studentSkillStatuses.map((s) => s._id);

    // 4. Build query for VerificationRequest
    const query = {
      student_skill_status_id: { $in: statusIds },
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    // 5. Query and sort
    const sortDirection = sort === 'date_asc' ? 1 : -1;
    const rawRequests = await VerificationRequest.find(query)
      .populate({
        path: 'student_skill_status_id',
        populate: [
          { path: 'student_id', select: '_id name email' },
          {
            path: 'course_skill_id',
            populate: [
              { path: 'course_id', select: '_id name' },
              { path: 'skill_id', select: '_id name' },
            ],
          },
        ],
      })
      .sort({ submitted_at: sortDirection });

    // 6. Format responses
    const requests = rawRequests
      .filter((vr) => vr.student_skill_status_id)
      .map((vr) => {
        const sss = vr.student_skill_status_id;
        const student = sss.student_id || {};
        const cs = sss.course_skill_id || {};
        const course = cs.course_id || {};
        const skill = cs.skill_id || {};

        return {
          _id: vr._id,
          student: {
            _id: student._id,
            name: student.name || 'Unknown Student',
            email: student.email || '',
          },
          skill: {
            _id: skill._id,
            name: skill.name || 'Unknown Skill',
          },
          course: {
            _id: course._id,
            name: course.name || 'Unknown Course',
          },
          evidence_url: vr.evidence_url,
          status: vr.status,
          feedback: vr.feedback,
          submitted_at: vr.submitted_at,
          reviewed_at: vr.reviewed_at,
        };
      });

    res.status(200).json({
      requests,
      filters: {
        courses: instructorCourses.map((c) => ({
          _id: c._id,
          name: c.name,
        })),
      },
      total: requests.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a verification request and issue digital badge into student passport
 * @route   PUT /api/verification-requests/:id/approve or /api/v1/verification-requests/:id/approve
 * @access  Private (Instructor only)
 */
const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const instructorId = (req.user._id || req.user.id).toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid verification request ID format' });
    }

    const verificationRequest = await VerificationRequest.findById(id).populate({
      path: 'student_skill_status_id',
      populate: {
        path: 'course_skill_id',
        populate: [
          { path: 'course_id', select: '_id name instructor_id' },
          { path: 'skill_id', select: '_id name' },
        ],
      },
    });

    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const studentSkillStatus = verificationRequest.student_skill_status_id;
    if (!studentSkillStatus) {
      return res.status(404).json({ message: 'Associated skill status not found' });
    }

    const courseSkill = studentSkillStatus.course_skill_id;
    if (!courseSkill || !courseSkill.course_id) {
      return res.status(404).json({ message: 'Associated course not found' });
    }

    const course = courseSkill.course_id;
    const courseInstructorId = (course.instructor_id?._id || course.instructor_id).toString();

    // Verify instructor ownership of the course
    if (courseInstructorId !== instructorId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    // Only pending requests can be approved
    if (verificationRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Can only approve pending requests' });
    }

    const now = new Date();

    // 1. Update VerificationRequest
    verificationRequest.status = 'approved';
    verificationRequest.reviewed_by = req.user._id || req.user.id;
    verificationRequest.reviewed_at = now;
    await verificationRequest.save();

    // 2. Update StudentSkillStatus
    studentSkillStatus.status = 'approved';
    await studentSkillStatus.save();

    // 3. Create Badge snapshot data
    const skillName = courseSkill.skill_id?.name || 'Unknown Skill';
    const courseName = course.name || 'Unknown Course';

    const badgeData = {
      student_skill_status_id: studentSkillStatus._id,
      skill_name: skillName,
      course_name: courseName,
      issued_at: now,
    };

    // 4. Find or auto-create StudentPassport
    const studentId = studentSkillStatus.student_id;
    let passport = await StudentPassport.findOne({ student_id: studentId });
    if (!passport) {
      passport = new StudentPassport({
        student_id: studentId,
        badges: [],
      });
    }

    passport.badges.push(badgeData);
    await passport.save();

    const createdBadge = passport.badges[passport.badges.length - 1];

    // 5. Auto-complete enrollment if all skills in this course are approved (TON-116, TON-117)
    try {
      const activeEnrollment = await Enrollment.findOne({
        student_id: studentId,
        course_id: course._id,
        status: 'active',
      });

      if (activeEnrollment) {
        const courseSkills = await CourseSkill.find({ course_id: course._id });
        const totalSkillsCount = courseSkills.length;
        const courseSkillIds = courseSkills.map((cs) => cs._id);

        const approvedSkillsCount = await StudentSkillStatus.countDocuments({
          student_id: studentId,
          course_skill_id: { $in: courseSkillIds },
          status: 'approved',
        });

        if (totalSkillsCount > 0 && approvedSkillsCount >= totalSkillsCount) {
          activeEnrollment.status = 'completed';
          activeEnrollment.completed_at = now;
          await activeEnrollment.save();
        }
      }
    } catch (enrollErr) {
      console.error('[Auto-complete enrollment error]:', enrollErr.message);
    }

    // 6. Notify student of approval (TON-115, TON-122)
    try {
      await notificationService.create(
        studentId,
        'badge_approved',
        `Your skill "${skillName}" in ${courseName} was approved! Badge issued.`,
        createdBadge._id
      );
    } catch (notifErr) {
      console.warn('[Notification error]:', notifErr.message);
    }

    res.status(200).json({

      request: {
        _id: verificationRequest._id,
        status: verificationRequest.status,
        reviewed_by: verificationRequest.reviewed_by,
        reviewed_at: verificationRequest.reviewed_at,
      },
      badge: {
        _id: createdBadge._id,
        skill_name: createdBadge.skill_name,
        course_name: createdBadge.course_name,
        issued_at: createdBadge.issued_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a verification request with constructive feedback
 * @route   PUT /api/verification-requests/:id/reject or /api/v1/verification-requests/:id/reject
 * @access  Private (Instructor only)
 */
const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const instructorId = (req.user._id || req.user.id).toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid verification request ID format' });
    }

    const verificationRequest = await VerificationRequest.findById(id).populate({
      path: 'student_skill_status_id',
      populate: {
        path: 'course_skill_id',
        populate: [
          { path: 'course_id', select: '_id name instructor_id' },
          { path: 'skill_id', select: '_id name' },
        ],
      },
    });

    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const studentSkillStatus = verificationRequest.student_skill_status_id;
    if (!studentSkillStatus) {
      return res.status(404).json({ message: 'Associated skill status not found' });
    }

    const courseSkill = studentSkillStatus.course_skill_id;
    if (!courseSkill || !courseSkill.course_id) {
      return res.status(404).json({ message: 'Associated course not found' });
    }

    const course = courseSkill.course_id;
    const courseInstructorId = (course.instructor_id?._id || course.instructor_id).toString();

    // Verify instructor ownership of the course
    if (courseInstructorId !== instructorId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    // Only pending requests can be rejected
    if (verificationRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Can only reject pending requests' });
    }

    const now = new Date();

    // 1. Update VerificationRequest
    verificationRequest.status = 'rejected';
    verificationRequest.feedback = feedback.trim();
    verificationRequest.reviewed_by = req.user._id || req.user.id;
    verificationRequest.reviewed_at = now;
    await verificationRequest.save();

    // 2. Update StudentSkillStatus
    studentSkillStatus.status = 'rejected';
    await studentSkillStatus.save();

    // 3. Notify student of rejection (TON-115, TON-122)
    try {
      const skillName = courseSkill.skill_id?.name || 'Unknown Skill';
      await notificationService.create(
        studentSkillStatus.student_id,
        'badge_rejected',
        `Your request for "${skillName}" was rejected. Feedback: ${feedback.trim()}`,
        verificationRequest._id
      );
    } catch (notifErr) {
      console.warn('[Notification error]:', notifErr.message);
    }

    res.status(200).json({

      request: {
        _id: verificationRequest._id,
        status: verificationRequest.status,
        feedback: verificationRequest.feedback,
        reviewed_by: verificationRequest.reviewed_by,
        reviewed_at: verificationRequest.reviewed_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstructorRequests,
  approveRequest,
  rejectRequest,
};
