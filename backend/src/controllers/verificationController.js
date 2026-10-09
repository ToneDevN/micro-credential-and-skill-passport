const mongoose = require('mongoose');
const {
  CourseSkill,
  Enrollment,
  StudentSkillStatus,
  VerificationRequest,
} = require('../models');

/**
 * @desc    Submit a new verification request for an enrolled course skill
 * @route   POST /api/verification-requests or /api/v1/verification-requests
 * @access  Private (Student only)
 */
const submitRequest = async (req, res, next) => {
  try {
    const { courseSkillId, evidenceUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseSkillId)) {
      return res.status(404).json({ message: 'Course skill not found' });
    }

    const courseSkill = await CourseSkill.findById(courseSkillId);
    if (!courseSkill) {
      return res.status(404).json({ message: 'Course skill not found' });
    }

    // Verify student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student_id: req.user._id,
      course_id: courseSkill.course_id,
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You must be enrolled in this course to submit a request',
      });
    }

    // Find or create StudentSkillStatus
    let studentSkillStatus = await StudentSkillStatus.findOne({
      student_id: req.user._id,
      course_skill_id: courseSkill._id,
    });

    if (!studentSkillStatus) {
      studentSkillStatus = await StudentSkillStatus.findOneAndUpdate(
        { student_id: req.user._id, course_skill_id: courseSkill._id },
        { $setOnInsert: { status: 'not_started' } },
        { upsert: true, new: true }
      );
    }

    if (studentSkillStatus.status === 'pending') {
      return res.status(400).json({
        message: 'You already have a pending request for this skill',
      });
    }

    if (studentSkillStatus.status === 'approved') {
      return res.status(400).json({
        message: 'This skill is already approved',
      });
    }

    // Create verification request
    const verificationRequest = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: evidenceUrl,
      status: 'pending',
      submitted_at: new Date(),
    });

    // Update skill status to pending
    studentSkillStatus.status = 'pending';
    await studentSkillStatus.save();

    res.status(201).json({
      success: true,
      request: verificationRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Edit evidence URL of an existing pending request
 * @route   PUT /api/verification-requests/:id or /api/v1/verification-requests/:id
 * @access  Private (Student only)
 */
const editRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { evidenceUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const request = await VerificationRequest.findById(id).populate(
      'student_skill_status_id'
    );

    if (!request) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    // Check ownership
    const studentId = request.student_skill_status_id?.student_id;
    if (!studentId || studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to modify this request',
      });
    }

    // Must be in pending status
    if (request.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending requests can be edited',
      });
    }

    request.evidence_url = evidenceUrl;
    await request.save();

    res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a pending verification request and revert skill status to not_started
 * @route   DELETE /api/verification-requests/:id or /api/v1/verification-requests/:id
 * @access  Private (Student only)
 */
const cancelRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const request = await VerificationRequest.findById(id).populate(
      'student_skill_status_id'
    );

    if (!request) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    // Check ownership
    const studentId = request.student_skill_status_id?.student_id;
    if (!studentId || studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to cancel this request',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        message: 'Only pending requests can be cancelled',
      });
    }

    // Revert StudentSkillStatus to not_started
    const studentSkillStatus = await StudentSkillStatus.findById(
      request.student_skill_status_id._id
    );
    if (studentSkillStatus) {
      studentSkillStatus.status = 'not_started';
      await studentSkillStatus.save();
    }

    await VerificationRequest.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Request cancelled',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Re-submit evidence for an expired skill
 * @route   POST /api/verification-requests/:id/resubmit or /api/v1/verification-requests/:id/resubmit
 * @access  Private (Student only)
 */
const resubmitRequest = async (req, res, next) => {
  try {
    const { id } = req.params; // StudentSkillStatus._id
    const { evidenceUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Skill status not found' });
    }

    let studentSkillStatus = await StudentSkillStatus.findById(id);

    if (!studentSkillStatus) {
      const vr = await VerificationRequest.findById(id);
      if (vr && vr.student_skill_status_id) {
        studentSkillStatus = await StudentSkillStatus.findById(
          vr.student_skill_status_id
        );
      }
    }

    if (!studentSkillStatus) {
      return res.status(404).json({ message: 'Skill status not found' });
    }

    // Check ownership
    if (studentSkillStatus.student_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to resubmit this skill',
      });
    }

    if (studentSkillStatus.status !== 'expired') {
      return res.status(400).json({
        message: 'Only expired skills can be re-submitted',
      });
    }

    const verificationRequest = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: evidenceUrl,
      status: 'pending',
      submitted_at: new Date(),
    });

    studentSkillStatus.status = 'pending';
    await studentSkillStatus.save();

    res.status(201).json({
      success: true,
      request: verificationRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all verification requests for the authenticated student
 * @route   GET /api/verification-requests/my or /api/v1/verification-requests/my
 * @access  Private (Student only)
 */
const getMyRequests = async (req, res, next) => {
  try {
    const { status } = req.query;

    const myStatuses = await StudentSkillStatus.find({
      student_id: req.user._id,
    }).select('_id');

    const statusIds = myStatuses.map((s) => s._id);

    const filter = {
      student_skill_status_id: { $in: statusIds },
    };

    if (status && status.trim() && status !== 'all') {
      filter.status = status.trim().toLowerCase();
    }

    const rawRequests = await VerificationRequest.find(filter)
      .populate({
        path: 'student_skill_status_id',
        populate: {
          path: 'course_skill_id',
          populate: [
            { path: 'skill_id', select: 'name description criteria' },
            { path: 'course_id', select: 'name' },
          ],
        },
      })
      .populate('reviewed_by', 'name email')
      .sort({ submitted_at: -1 });

    const requests = rawRequests.map((r) => {
      const sss = r.student_skill_status_id;
      const cs = sss?.course_skill_id;
      const skill = cs?.skill_id;
      const course = cs?.course_id;

      return {
        _id: r._id,
        evidenceUrl: r.evidence_url,
        status: r.status,
        feedback: r.feedback || '',
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
        skillName: skill?.name || 'Unknown Skill',
        courseName: course?.name || 'Unknown Course',
        skillId: skill?._id,
        courseId: course?._id,
        studentSkillStatusId: sss?._id,
        reviewedBy: r.reviewed_by ? { name: r.reviewed_by.name } : null,
        studentSkillStatus: sss ? { _id: sss._id, status: sss.status } : null,
      };
    });

    res.status(200).json({ requests });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRequest,
  editRequest,
  cancelRequest,
  resubmitRequest,
  getMyRequests,
};
