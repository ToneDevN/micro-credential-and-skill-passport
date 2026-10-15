const crypto = require('crypto');
const {
  StudentPassport,
  User,
  Enrollment,
  CourseSkill,
  StudentSkillStatus,
} = require('../models');

/**
 * @desc    Generate or retrieve public share link for student's passport (UC-44, TON-151)
 * @route   POST /api/passport/share or /api/v1/passport/share
 * @access  Private (Student only)
 */
const sharePassport = async (req, res, next) => {
  try {
    const studentId = req.user._id || req.user.id;

    let passport = await StudentPassport.findOne({ student_id: studentId });
    if (!passport) {
      passport = await StudentPassport.create({
        student_id: studentId,
        badges: [],
      });
    }

    // Precondition: student needs >= 1 badge before sharing is allowed
    if (!passport.badges || passport.badges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'คุณต้องมีอย่างน้อย 1 badge จึงจะสามารถแชร์ Skill Passport ได้',
      });
    }

    // Idempotent: return existing slug if already public
    if (passport.public_slug && passport.is_public) {
      return res.status(200).json({
        success: true,
        publicUrl: `/passport/${passport.public_slug}`,
        publicSlug: passport.public_slug,
        isPublic: true,
      });
    }

    // Generate new unique slug
    const newSlug = crypto.randomBytes(8).toString('hex');
    passport.public_slug = newSlug;
    passport.is_public = true;
    await passport.save();

    return res.status(201).json({
      success: true,
      publicUrl: `/passport/${newSlug}`,
      publicSlug: newSlug,
      isPublic: true,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Regenerate public share link (revokes previous slug) (UC-44, TON-151)
 * @route   POST /api/passport/share/regenerate or /api/v1/passport/share/regenerate
 * @access  Private (Student only)
 */
const regenerateSharePassport = async (req, res, next) => {
  try {
    const studentId = req.user._id || req.user.id;

    let passport = await StudentPassport.findOne({ student_id: studentId });
    if (!passport || !passport.badges || passport.badges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'คุณต้องมีอย่างน้อย 1 badge จึงจะสามารถแชร์ Skill Passport ได้',
      });
    }

    const oldSlug = passport.public_slug;
    let newSlug = crypto.randomBytes(8).toString('hex');
    while (newSlug === oldSlug) {
      newSlug = crypto.randomBytes(8).toString('hex');
    }

    passport.public_slug = newSlug;
    passport.is_public = true;
    await passport.save();

    return res.status(201).json({
      success: true,
      publicUrl: `/passport/${newSlug}`,
      publicSlug: newSlug,
      isPublic: true,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke sharing of student's passport (UC-44, TON-151)
 * @route   DELETE /api/passport/share or /api/v1/passport/share
 * @access  Private (Student only)
 */
const revokeSharePassport = async (req, res, next) => {
  try {
    const studentId = req.user._id || req.user.id;

    const passport = await StudentPassport.findOne({ student_id: studentId });
    if (passport) {
      passport.is_public = false;
      passport.public_slug = null;
      await passport.save();
    }

    return res.status(200).json({
      success: true,
      message: 'ยกเลิกการแชร์ Passport เรียบร้อยแล้ว',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View public Skill Passport via slug (Visitor, no auth) (UC-45, TON-151)
 * @route   GET /api/passport/public/:slug or /api/v1/passport/public/:slug
 * @access  Public (No authentication required)
 */
const getPublicPassport = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ Skill Passport นี้',
      });
    }

    const passport = await StudentPassport.findOne({
      public_slug: slug,
      is_public: true,
    });

    if (!passport) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบ Skill Passport นี้',
      });
    }

    const student = await User.findById(passport.student_id).select('name');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลนักศึกษานี้',
      });
    }

    // Whitelisted badge details
    const badges = (passport.badges || []).map((b) => ({
      skill_name: b.skill_name,
      course_name: b.course_name,
      issued_at: b.issued_at,
    }));

    // Find student's enrolled courses to build public skill map
    const enrollments = await Enrollment.find({ student_id: passport.student_id }).populate({
      path: 'course_id',
      select: 'name title course_code code instructor_id',
      populate: { path: 'instructor_id', select: 'name' },
    });

    const courses = [];
    if (enrollments && enrollments.length > 0) {
      for (const enr of enrollments) {
        if (!enr.course_id) continue;
        const course = enr.course_id;

        const courseSkills = await CourseSkill.find({ course_id: course._id }).populate({
          path: 'skill_id',
          select: 'name domain level',
        });

        const statusMap = new Map();
        const statuses = await StudentSkillStatus.find({
          student_id: passport.student_id,
          course_id: course._id,
        });
        statuses.forEach((st) => {
          statusMap.set(st.course_skill_id.toString(), st.status);
        });

        const skills = courseSkills.map((cs) => {
          const status = statusMap.get(cs._id.toString()) || 'not_started';
          return {
            skillName: cs.skill_id?.name || 'Unknown Skill',
            domain: cs.skill_id?.domain || 'General',
            level: cs.skill_id?.level || 'Beginner',
            status,
          };
        });

        const totalSkills = skills.length;
        const earnedSkills = skills.filter(
          (s) => s.status === 'approved' || s.status === 'certified'
        ).length;
        const completionRate =
          totalSkills > 0 ? Math.round((earnedSkills / totalSkills) * 100) : 0;

        courses.push({
          courseTitle: course.name || course.title || '',
          courseCode: course.course_code || course.code || '',
          instructorName: course.instructor_id?.name || '',
          totalSkills,
          earnedSkills,
          completionRate,
          skills,
        });
      }
    }

    const totalSkills = courses.reduce((acc, c) => acc + c.totalSkills, 0);
    const earnedSkills = courses.reduce((acc, c) => acc + c.earnedSkills, 0);
    const overallCompletionRate =
      totalSkills > 0 ? Math.round((earnedSkills / totalSkills) * 100) : 0;

    const skillMap = {
      courses,
      summary: {
        totalSkills,
        earnedSkills,
        overallCompletionRate,
        totalBadges: badges.length,
      },
    };

    // Strict explicit whitelist response - NEVER spreads raw documents
    return res.status(200).json({
      success: true,
      studentName: student.name,
      badges,
      skillMap,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sharePassport,
  regenerateSharePassport,
  revokeSharePassport,
  getPublicPassport,
};
