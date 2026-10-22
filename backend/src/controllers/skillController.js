const mongoose = require('mongoose');
const {
  MicroSkill,
  CourseSkill,
  Course,
  StudentSkillStatus,
  StudentPassport,
  VerificationRequest,
} = require('../models');
const { getStudentSkillStatuses } = require('../services/studentSkillService');

/**
 * @desc    Search micro-skills by name or description
 * @route   GET /api/skills/search or /api/v1/skills/search
 * @access  Public
 */
const searchSkills = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const regex = new RegExp(q.trim(), 'i');
    const matchedSkills = await MicroSkill.find({
      $or: [{ name: { $regex: regex } }, { description: { $regex: regex } }],
    });

    let statusMap = null;
    if (req.user && req.user.role === 'student') {
      const skillIds = matchedSkills.map((s) => s._id);
      statusMap = await getStudentSkillStatuses(req.user._id, skillIds);
    }

    const skills = await Promise.all(
      matchedSkills.map(async (skill) => {
        const courseSkills = await CourseSkill.find({
          skill_id: skill._id,
        }).populate('course_id', 'name');

        const courses = courseSkills
          .filter((cs) => cs.course_id)
          .map((cs) => ({
            _id: cs.course_id._id,
            name: cs.course_id.name,
          }));

        const item = {
          _id: skill._id,
          name: skill.name,
          description: skill.description,
          criteria: skill.criteria,
          is_open_for_verification: Boolean(skill.is_open_for_verification),
          courses,
        };

        if (statusMap) {
          item.studentStatus =
            statusMap.get(skill._id.toString()) || 'not_started';
        }

        return item;
      })
    );

    res.status(200).json({ skills });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List all skills for a specific course (Instructor course management)
 * @route   GET /api/courses/:courseId/skills or /api/v1/courses/:courseId/skills
 * @access  Private (Instructor only, course owner)
 */
const getCourseSkills = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const course = await Course.findById(courseId).populate('instructor_id', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const instructorId = (req.user._id || req.user.id).toString();
    const courseInstructorId = (course.instructor_id?._id || course.instructor_id).toString();

    if (courseInstructorId !== instructorId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    const courseSkills = await CourseSkill.find({ course_id: courseId }).populate('skill_id');

    const skills = await Promise.all(
      courseSkills
        .filter((cs) => cs.skill_id)
        .map(async (cs) => {
          const earnedCount = await StudentSkillStatus.countDocuments({
            course_skill_id: cs._id,
            status: 'approved',
          });
          const pendingCount = await StudentSkillStatus.countDocuments({
            course_skill_id: cs._id,
            status: 'pending',
          });
          const rejectedCount = await StudentSkillStatus.countDocuments({
            course_skill_id: cs._id,
            status: 'rejected',
          });

          return {
            _id: cs.skill_id._id,
            courseSkillId: cs._id,
            course_skill_id: cs._id,
            skill_id: {
              _id: cs.skill_id._id,
              name: cs.skill_id.name,
              description: cs.skill_id.description,
              criteria: cs.skill_id.criteria,
              is_open_for_verification: Boolean(cs.skill_id.is_open_for_verification),
              createdAt: cs.skill_id.createdAt,
              created_at: cs.skill_id.created_at || cs.skill_id.createdAt,
            },
            name: cs.skill_id.name,
            description: cs.skill_id.description,
            criteria: cs.skill_id.criteria,
            is_open_for_verification: Boolean(cs.skill_id.is_open_for_verification),
            earnedCount,
            pendingCount,
            notStartedCount: rejectedCount,
            stats: {
              earnedCount,
              pendingCount,
              notStartedCount: rejectedCount,
            },
          };
        })
    );

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
 * @desc    Add a new micro-skill to a course
 * @route   POST /api/courses/:courseId/skills or /api/v1/courses/:courseId/skills
 * @access  Private (Instructor only, course owner)
 */
const addSkillToCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { name, description, criteria } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const instructorId = (req.user._id || req.user.id).toString();
    const courseInstructorId = (course.instructor_id?._id || course.instructor_id).toString();

    if (courseInstructorId !== instructorId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    const skillData = {
      name: name.trim(),
      description: description.trim(),
      criteria: criteria.trim(),
    };
    if (req.body.is_open_for_verification !== undefined) {
      skillData.is_open_for_verification = Boolean(req.body.is_open_for_verification);
    }

    const newSkill = await MicroSkill.create(skillData);

    const newCourseSkill = await CourseSkill.create({
      course_id: courseId,
      skill_id: newSkill._id,
    });

    res.status(201).json({
      skill: {
        _id: newSkill._id,
        name: newSkill.name,
        description: newSkill.description,
        criteria: newSkill.criteria,
        is_open_for_verification: Boolean(newSkill.is_open_for_verification),
        createdAt: newSkill.createdAt,
        created_at: newSkill.created_at || newSkill.createdAt,
      },
      courseSkill: {
        _id: newCourseSkill._id,
        course_id: newCourseSkill.course_id,
        skill_id: newCourseSkill.skill_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a micro-skill details within a course
 * @route   PUT /api/courses/:courseId/skills/:skillId or /api/v1/courses/:courseId/skills/:skillId
 * @access  Private (Instructor only, course owner)
 */
const updateSkill = async (req, res, next) => {
  try {
    const { courseId, skillId } = req.params;
    const { name, description, criteria } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const instructorId = (req.user._id || req.user.id).toString();
    const courseInstructorId = (course.instructor_id?._id || course.instructor_id).toString();

    if (courseInstructorId !== instructorId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    const courseSkill = await CourseSkill.findOne({
      course_id: courseId,
      skill_id: skillId,
    });

    if (!courseSkill) {
      return res.status(404).json({ message: 'Skill not found in this course' });
    }

    const skill = await MicroSkill.findById(skillId);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    if (name !== undefined) skill.name = name.trim();
    if (description !== undefined) skill.description = description.trim();
    if (criteria !== undefined) skill.criteria = criteria.trim();
    if (req.body.is_open_for_verification !== undefined) {
      skill.is_open_for_verification = Boolean(req.body.is_open_for_verification);
    }

    await skill.save();

    res.status(200).json({
      skill: {
        _id: skill._id,
        name: skill.name,
        description: skill.description,
        criteria: skill.criteria,
        is_open_for_verification: Boolean(skill.is_open_for_verification),
        createdAt: skill.createdAt,
        created_at: skill.created_at || skill.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a micro-skill from a course (with badge protection and M:N cleanup)
 * @route   DELETE /api/courses/:courseId/skills/:skillId or /api/v1/courses/:courseId/skills/:skillId
 * @access  Private (Instructor only, course owner)
 */
const deleteSkill = async (req, res, next) => {
  try {
    const { courseId, skillId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const instructorId = (req.user._id || req.user.id).toString();
    const courseInstructorId = (course.instructor_id?._id || course.instructor_id).toString();

    if (courseInstructorId !== instructorId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    const courseSkill = await CourseSkill.findOne({
      course_id: courseId,
      skill_id: skillId,
    });

    if (!courseSkill) {
      return res.status(404).json({ message: 'Skill not found in this course' });
    }

    // Badge protection check
    const hasApprovedStatus = await StudentSkillStatus.exists({
      course_skill_id: courseSkill._id,
      status: 'approved',
    });

    const statusIds = await StudentSkillStatus.find({
      course_skill_id: courseSkill._id,
    }).distinct('_id');

    const hasPassportBadge = await StudentPassport.exists({
      'badges.student_skill_status_id': { $in: statusIds },
    });

    if (hasApprovedStatus || hasPassportBadge) {
      return res.status(400).json({ message: 'Cannot delete skill with approved badges' });
    }

    // Pending protection check
    const hasPendingStatus = await StudentSkillStatus.exists({
      course_skill_id: courseSkill._id,
      status: 'pending',
    });

    const hasPendingRequest = await VerificationRequest.exists({
      student_skill_status_id: { $in: statusIds },
      status: 'pending',
    });

    if (hasPendingStatus || hasPendingRequest) {
      return res.status(400).json({
        message: 'Cannot delete skill with pending verification requests',
      });
    }

    // Delete non-approved student statuses and their verification requests
    await VerificationRequest.deleteMany({
      student_skill_status_id: { $in: statusIds },
    });
    await StudentSkillStatus.deleteMany({ course_skill_id: courseSkill._id });

    // Delete courseSkill link
    await CourseSkill.findByIdAndDelete(courseSkill._id);

    // M:N check: if no other CourseSkill references this skill, remove MicroSkill
    const otherUsage = await CourseSkill.countDocuments({ skill_id: skillId });
    if (otherUsage === 0) {
      await MicroSkill.findByIdAndDelete(skillId);
    }

    res.status(200).json({ message: 'Skill deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated micro-skills (Explore Skills, UC-04, TON-160)
 * @route   GET /api/skills or /api/v1/skills
 * @access  Public
 */
const getSkills = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.q && req.query.q.trim()) {
      const regex = new RegExp(req.query.q.trim(), 'i');
      query.$or = [{ name: { $regex: regex } }, { description: { $regex: regex } }];
    }

    const total = await MicroSkill.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    const matchedSkills = await MicroSkill.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    let statusMap = null;
    if (req.user && req.user.role === 'student') {
      const skillIds = matchedSkills.map((s) => s._id);
      statusMap = await getStudentSkillStatuses(req.user._id, skillIds);
    }

    const skills = await Promise.all(
      matchedSkills.map(async (skill) => {
        const courseSkills = await CourseSkill.find({
          skill_id: skill._id,
        }).populate('course_id', 'name');

        const courses = courseSkills
          .filter((cs) => cs.course_id)
          .map((cs) => ({
            _id: cs.course_id._id,
            name: cs.course_id.name,
          }));

        const item = {
          _id: skill._id,
          name: skill.name,
          description: skill.description,
          criteria: skill.criteria,
          is_open_for_verification: Boolean(skill.is_open_for_verification),
          courses,
        };

        if (statusMap) {
          item.studentStatus =
            statusMap.get(skill._id.toString()) || 'not_started';
        }

        return item;
      })
    );

    res.status(200).json({
      data: skills,
      skills,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Open a micro-skill for verification requests
 * @route   PATCH /api/skills/:id/open or /api/v1/skills/:id/open
 * @access  Private (Instructor only)
 */
const openSkillVerification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid skill ID format' });
    }

    const skill = await MicroSkill.findById(id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Check course ownership if skill is linked to course(s)
    const courseSkills = await CourseSkill.find({ skill_id: skill._id }).populate('course_id');
    if (courseSkills.length > 0) {
      const instructorId = (req.user._id || req.user.id).toString();
      const isOwner = courseSkills.some((cs) => {
        const cInstId = (cs.course_id?.instructor_id?._id || cs.course_id?.instructor_id)?.toString();
        return cInstId === instructorId;
      });
      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You do not own the course containing this skill' });
      }
    }

    skill.is_open_for_verification = true;
    await skill.save();

    res.status(200).json({
      success: true,
      message: 'Skill is now open for verification',
      skill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Close a micro-skill for verification requests
 * @route   PATCH /api/skills/:id/close or /api/v1/skills/:id/close
 * @access  Private (Instructor only)
 */
const closeSkillVerification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid skill ID format' });
    }

    const skill = await MicroSkill.findById(id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Check course ownership if skill is linked to course(s)
    const courseSkills = await CourseSkill.find({ skill_id: skill._id }).populate('course_id');
    if (courseSkills.length > 0) {
      const instructorId = (req.user._id || req.user.id).toString();
      const isOwner = courseSkills.some((cs) => {
        const cInstId = (cs.course_id?.instructor_id?._id || cs.course_id?.instructor_id)?.toString();
        return cInstId === instructorId;
      });
      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You do not own the course containing this skill' });
      }
    }

    skill.is_open_for_verification = false;
    await skill.save();

    res.status(200).json({
      success: true,
      message: 'Skill is now closed for verification',
      skill,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSkills,
  searchSkills,
  getCourseSkills,
  addSkillToCourse,
  updateSkill,
  deleteSkill,
  openSkillVerification,
  closeSkillVerification,
};

