const {
  StudentPassport,
  Enrollment,
  CourseSkill,
  StudentSkillStatus,
} = require('../models');

/**
 * @desc    Get student's passport with embedded badges and badge stats
 * @route   GET /api/passport/my or /api/v1/passport/my
 * @access  Private (Student only)
 */
const getMyPassport = async (req, res, next) => {
  try {
    const studentId = req.user._id || req.user.id;

    // 1. Find StudentPassport for authenticated student
    let passport = await StudentPassport.findOne({ student_id: studentId });

    // 2. If not found -> auto-create empty passport
    if (!passport) {
      passport = await StudentPassport.create({
        student_id: studentId,
        badges: [],
      });
    }

    // 3. Compute stats
    const totalBadges = passport.badges.length;

    const courseCounts = {};
    passport.badges.forEach((b) => {
      const cName = b.course_name || 'General';
      courseCounts[cName] = (courseCounts[cName] || 0) + 1;
    });

    const badgesByCourse = Object.entries(courseCounts).map(
      ([courseName, count]) => ({
        courseName,
        count,
      })
    );

    // 4. Return passport + stats
    res.status(200).json({
      passport: {
        _id: passport._id,
        student_id: passport.student_id,
        badges: passport.badges,
        totalBadges,
      },
      stats: {
        totalBadges,
        badgesByCourse,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get skill map with statuses, completion rates, and summary for all enrolled courses
 * @route   GET /api/passport/my/skill-map or /api/v1/passport/my/skill-map
 * @access  Private (Student only)
 */
const getMySkillMap = async (req, res, next) => {
  try {
    const studentId = req.user._id || req.user.id;

    // 1. Find all Enrollments for authenticated student
    const enrollments = await Enrollment.find({ student_id: studentId }).populate({
      path: 'course_id',
      populate: { path: 'instructor_id', select: 'name email' },
    });

    // If student is not enrolled in any course, return empty courses array & zeroed summary
    if (!enrollments || enrollments.length === 0) {
      return res.status(200).json({
        courses: [],
        summary: {
          totalSkills: 0,
          earnedSkills: 0,
          pendingSkills: 0,
          overallCompletionRate: 0,
        },
      });
    }

    // Lookup student's passport for badges
    const passport = await StudentPassport.findOne({ student_id: studentId });
    const badges = passport?.badges || [];

    const badgeByStatusId = new Map();
    const badgeBySkillCourse = new Map();
    badges.forEach((b) => {
      if (b.student_skill_status_id) {
        badgeByStatusId.set(b.student_skill_status_id.toString(), b);
      }
      if (b.skill_name && b.course_name) {
        badgeBySkillCourse.set(`${b.course_name}:::${b.skill_name}`, b);
      }
    });

    // 2. Process each enrolled course
    const courses = [];

    for (const enrollment of enrollments) {
      const course = enrollment.course_id;
      if (!course) continue;

      // Find all CourseSkill entries for this course
      const courseSkills = await CourseSkill.find({
        course_id: course._id,
      }).populate('skill_id');

      const skills = [];

      for (const cs of courseSkills) {
        if (!cs.skill_id) continue;

        // Find StudentSkillStatus for student + course_skill_id
        const sss = await StudentSkillStatus.findOne({
          student_id: studentId,
          course_skill_id: cs._id,
        });

        // Map status
        let mappedStatus = 'not_started';
        if (sss) {
          if (sss.status === 'approved') {
            mappedStatus = 'earned';
          } else if (sss.status === 'pending') {
            mappedStatus = 'pending';
          } else if (sss.status === 'rejected') {
            mappedStatus = 'rejected';
          } else if (sss.status === 'expired') {
            mappedStatus = 'expired';
          } else {
            mappedStatus = 'not_started';
          }
        }

        // Badge info
        let badge = null;
        if (mappedStatus === 'earned') {
          const matchedBadge = sss
            ? badgeByStatusId.get(sss._id.toString())
            : null;
          const fallbackBadge = badgeBySkillCourse.get(
            `${course.name}:::${cs.skill_id.name}`
          );
          const b = matchedBadge || fallbackBadge;
          badge = {
            issued_at: b?.issued_at || sss?.updatedAt || new Date(),
          };
        }

        skills.push({
          _id: cs.skill_id._id,
          courseSkillId: cs._id,
          name: cs.skill_id.name,
          description: cs.skill_id.description,
          criteria: cs.skill_id.criteria,
          status: mappedStatus,
          badge,
        });
      }

      const totalSkills = skills.length;
      const earnedSkills = skills.filter((s) => s.status === 'earned').length;
      const completionRate =
        totalSkills > 0 ? Math.round((earnedSkills / totalSkills) * 100) : 0;

      courses.push({
        _id: course._id,
        name: course.name,
        instructor: course.instructor_id
          ? { name: course.instructor_id.name }
          : null,
        skills,
        totalSkills,
        earnedSkills,
        completionRate,
      });
    }

    // 3. Compute overall summary stats
    let totalSkills = 0;
    let earnedSkills = 0;
    let pendingSkills = 0;

    courses.forEach((c) => {
      totalSkills += c.totalSkills;
      earnedSkills += c.earnedSkills;
      c.skills.forEach((s) => {
        if (s.status === 'pending') {
          pendingSkills += 1;
        }
      });
    });

    const overallCompletionRate =
      totalSkills > 0 ? Math.round((earnedSkills / totalSkills) * 100) : 0;

    res.status(200).json({
      courses,
      summary: {
        totalSkills,
        earnedSkills,
        pendingSkills,
        overallCompletionRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student's passport by student ID (Public view)
 * @route   GET /api/passport/:studentId or /api/v1/passport/:studentId
 * @access  Public
 */
const getPassportByStudentId = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    let passport = await StudentPassport.findOne({ student_id: studentId });
    if (!passport) {
      passport = await StudentPassport.create({
        student_id: studentId,
        badges: [],
      });
    }

    const totalBadges = passport.badges.length;

    res.status(200).json({
      passport: {
        _id: passport._id,
        student_id: passport.student_id,
        badges: passport.badges,
        totalBadges,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyPassport,
  getMySkillMap,
  getPassportByStudentId,
};
