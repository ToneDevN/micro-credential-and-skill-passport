const mongoose = require('mongoose');
const {
  MicroSkill,
  CourseSkill,
  Enrollment,
  StudentSkillStatus,
  VerificationRequest,
  Badge,
  StudentPassport,
} = require('../models');

/**
 * @desc    Submit a new verification request for an enrolled course skill
 * @route   POST /api/verification-requests or /api/v1/verification-requests
 * @access  Private (Student only)
 */
const submitRequest = async (req, res, next) => {
  try {
    const courseSkillId = req.body.courseSkillId || req.body.course_skill_id;
    const skillId = req.body.skill_id || req.body.skillId;
    const evidenceUrl = req.body.evidenceUrl || req.body.evidence_url;
    const student_id = req.user._id || req.user.id;

    // --- Block if skill already certified (UC-06 Business Rule / TON-167) ---
    let targetSkillId = skillId;
    let courseSkill = null;

    if (courseSkillId && mongoose.Types.ObjectId.isValid(courseSkillId)) {
      courseSkill = await CourseSkill.findById(courseSkillId);
      if (courseSkill && !targetSkillId) {
        targetSkillId = courseSkill.skill_id?._id || courseSkill.skill_id;
      }
    } else if (targetSkillId && mongoose.Types.ObjectId.isValid(targetSkillId)) {
      courseSkill = await CourseSkill.findOne({ skill_id: targetSkillId });
    }

    if (targetSkillId) {
      // 1. Direct Badge model check (authoritative certified record)
      const existingBadge = await Badge.findOne({
        student_id,
        skill_id: targetSkillId,
      });

      if (existingBadge) {
        return res.status(409).json({
          message: 'ทักษะนี้ได้รับการรับรองแล้ว ไม่สามารถยื่นคำขอซ้ำได้',
          code: 'SKILL_ALREADY_CERTIFIED',
        });
      }

      // 2. StudentPassport embedded badges check
      const passportWithBadge = await StudentPassport.findOne({
        student_id,
        'badges.skill_id': targetSkillId,
      });

      if (passportWithBadge) {
        return res.status(409).json({
          message: 'ทักษะนี้ได้รับการรับรองแล้ว ไม่สามารถยื่นคำขอซ้ำได้',
          code: 'SKILL_ALREADY_CERTIFIED',
        });
      }

      // 3. Passport badges check by student_skill_status_id if courseSkill is known
      if (courseSkill) {
        const statusIds = await StudentSkillStatus.find({
          student_id,
          course_skill_id: courseSkill._id,
        }).distinct('_id');

        if (statusIds.length > 0) {
          const passportStatusBadge = await StudentPassport.findOne({
            student_id,
            'badges.student_skill_status_id': { $in: statusIds },
          });

          if (passportStatusBadge) {
            return res.status(409).json({
              message: 'ทักษะนี้ได้รับการรับรองแล้ว ไม่สามารถยื่นคำขอซ้ำได้',
              code: 'SKILL_ALREADY_CERTIFIED',
            });
          }
        }
      }
    }
    // --- END NEW DUPLICATE CERTIFICATION GUARD ---

    if (!courseSkill) {
      if (courseSkillId && !mongoose.Types.ObjectId.isValid(courseSkillId)) {
        return res.status(404).json({ message: 'Course skill not found' });
      }
      return res.status(404).json({ message: 'Course skill not found' });
    }

    // Verify skill is open for verification (TON-224)
    const skillDoc = await MicroSkill.findById(targetSkillId || courseSkill.skill_id);
    if (!skillDoc || skillDoc.is_open_for_verification !== true) {
      return res.status(403).json({
        message: 'Skill is not open for verification',
      });
    }

    // Verify student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student_id,
      course_id: courseSkill.course_id,
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You must be enrolled in this course to submit a request',
      });
    }

    // Find or create StudentSkillStatus
    let studentSkillStatus = await StudentSkillStatus.findOne({
      student_id,
      course_skill_id: courseSkill._id,
    });

    if (!studentSkillStatus) {
      studentSkillStatus = await StudentSkillStatus.findOneAndUpdate(
        { student_id, course_skill_id: courseSkill._id },
        { $setOnInsert: { status: 'not_started' } },
        { upsert: true, new: true }
      );
    }

    // Check if skill already has a pending request
    const existingPending = await VerificationRequest.findOne({
      student_skill_status_id: studentSkillStatus._id,
      status: 'pending',
    });

    const isDirectSkillId = Boolean(req.body.skill_id || req.body.skillId);
    if (studentSkillStatus.status === 'pending' || existingPending) {
      const statusCode = isDirectSkillId ? 409 : 400;
      return res.status(statusCode).json({
        message: isDirectSkillId
          ? 'คุณมีคำขอที่รออยู่สำหรับ skill นี้แล้ว'
          : 'You already have a pending request for this skill',
        code: 'PENDING_REQUEST_EXISTS',
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
      verificationRequest,
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
    const evidenceUrl = req.body.evidenceUrl || req.body.evidence_url;

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
    const { id } = req.params;
    const evidenceUrl = req.body.evidenceUrl || req.body.evidence_url;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Skill status not found' });
    }

    // Check if id is an existing VerificationRequest (e.g. Flow 3 rejected resubmission, UC-46, TON-154)
    const vr = await VerificationRequest.findById(id).populate('student_skill_status_id');
    if (vr) {
      const studentSkillStatus = vr.student_skill_status_id;
      if (!studentSkillStatus) {
        return res.status(404).json({ message: 'Skill status not found' });
      }

      if (studentSkillStatus.student_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: 'You do not have permission to resubmit this request',
        });
      }

      if (vr.status !== 'rejected') {
        return res.status(400).json({
          message: 'Only rejected requests can be re-submitted',
        });
      }

      // Check if a pending request already exists for this skill/student
      const existingPending = await VerificationRequest.findOne({
        student_skill_status_id: studentSkillStatus._id,
        status: 'pending',
      });
      if (existingPending || studentSkillStatus.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'คุณมีคำขอที่รออยู่สำหรับ skill นี้แล้ว',
        });
      }

      // Create a brand new VerificationRequest document (UC-46: leave old rejected request untouched)
      const newRequest = await VerificationRequest.create({
        student_skill_status_id: studentSkillStatus._id,
        evidence_url: evidenceUrl,
        status: 'pending',
        submitted_at: new Date(),
      });

      // Update studentSkillStatus to pending
      studentSkillStatus.status = 'pending';
      await studentSkillStatus.save();

      return res.status(201).json({
        success: true,
        request: newRequest,
      });
    }

    // Otherwise, id is a StudentSkillStatus ID (TON-48 expired skill resubmission)
    let studentSkillStatus = await StudentSkillStatus.findById(id);

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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

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

    const total = await VerificationRequest.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    // Calculate status counts for tab badges
    const counts = {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    if (statusIds.length > 0) {
      const statusCountsAgg = await VerificationRequest.aggregate([
        { $match: { student_skill_status_id: { $in: statusIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      statusCountsAgg.forEach((item) => {
        if (counts[item._id] !== undefined) {
          counts[item._id] = item.count;
        }
        counts.all += item.count;
      });
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
      .sort({ submitted_at: -1 })
      .skip(skip)
      .limit(limit);

    const requests = rawRequests.map((r) => {
      const sss = r.student_skill_status_id;
      const cs = sss?.course_skill_id;
      const skill = cs?.skill_id;
      const course = cs?.course_id;

      return {
        _id: r._id,
        evidenceUrl: r.evidence_url,
        evidence_url: r.evidence_url,
        status: r.status,
        feedback: r.feedback || '',
        submittedAt: r.submitted_at,
        submitted_at: r.submitted_at,
        reviewedAt: r.reviewed_at,
        reviewed_at: r.reviewed_at,
        skillName: skill?.name || 'Unknown Skill',
        courseName: course?.name || 'Unknown Course',
        skillId: skill?._id,
        courseId: course?._id,
        studentSkillStatusId: sss?._id,
        reviewedBy: r.reviewed_by ? { name: r.reviewed_by.name } : null,
        studentSkillStatus: sss ? { _id: sss._id, status: sss.status } : null,
      };
    });

    res.status(200).json({
      data: requests,
      counts,
      total,
      page,
      totalPages,
    });
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
