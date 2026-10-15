const {
  Badge,
  StudentPassport,
  CourseSkill,
  StudentSkillStatus,
  VerificationRequest,
} = require('../models');

/**
 * Computes studentStatus ('approved' | 'pending' | 'rejected' | 'not_started')
 * for an array of skills for a given student.
 *
 * Priority:
 * 1. Approved badge exists -> 'approved'
 * 2. Pending verification request exists -> 'pending'
 * 3. Rejected verification request exists (and no pending) -> 'rejected'
 * 4. Otherwise -> 'not_started'
 *
 * @param {string|import('mongoose').Types.ObjectId} studentId
 * @param {Array<string|import('mongoose').Types.ObjectId>} skillIds
 * @returns {Promise<Map<string, 'approved'|'pending'|'rejected'|'not_started'>>}
 */
async function getStudentSkillStatuses(studentId, skillIds) {
  const statusMap = new Map();
  if (!studentId || !skillIds || skillIds.length === 0) {
    return statusMap;
  }

  const sIds = skillIds.map((id) => id.toString());
  // Default all to 'not_started'
  sIds.forEach((id) => statusMap.set(id, 'not_started'));

  // 1. Check Badges in Badge collection
  const badges = await Badge.find({
    student_id: studentId,
    skill_id: { $in: skillIds },
  });
  badges.forEach((b) => {
    if (b.skill_id) {
      statusMap.set(b.skill_id.toString(), 'approved');
    }
  });

  // Check Badges in StudentPassport
  const passport = await StudentPassport.findOne({ student_id: studentId });
  if (passport && passport.badges) {
    passport.badges.forEach((b) => {
      if (b.skill_id && sIds.includes(b.skill_id.toString())) {
        statusMap.set(b.skill_id.toString(), 'approved');
      }
    });
  }

  // 2. Find CourseSkills linking these skills
  const courseSkills = await CourseSkill.find({
    skill_id: { $in: skillIds },
  }).select('_id skill_id');

  const csMap = new Map(); // csId -> skillId
  const csIds = [];
  courseSkills.forEach((cs) => {
    csIds.push(cs._id);
    csMap.set(cs._id.toString(), cs.skill_id.toString());
  });

  if (csIds.length > 0) {
    // Find StudentSkillStatus for this student
    const studentStatuses = await StudentSkillStatus.find({
      student_id: studentId,
      course_skill_id: { $in: csIds },
    });

    const statusIdToSkillId = new Map();
    const statusIds = [];

    studentStatuses.forEach((sss) => {
      const skillIdStr = csMap.get(sss.course_skill_id.toString());
      if (skillIdStr) {
        statusIds.push(sss._id);
        statusIdToSkillId.set(sss._id.toString(), skillIdStr);

        // If sss status is approved, mark as approved
        if (sss.status === 'approved') {
          statusMap.set(skillIdStr, 'approved');
        } else if (sss.status === 'pending' && statusMap.get(skillIdStr) !== 'approved') {
          statusMap.set(skillIdStr, 'pending');
        } else if (
          sss.status === 'rejected' &&
          statusMap.get(skillIdStr) !== 'approved' &&
          statusMap.get(skillIdStr) !== 'pending'
        ) {
          statusMap.set(skillIdStr, 'rejected');
        }
      }
    });

    // Check VerificationRequest for pending / rejected
    if (statusIds.length > 0) {
      const requests = await VerificationRequest.find({
        student_skill_status_id: { $in: statusIds },
      }).sort({ submitted_at: -1, createdAt: -1 });

      for (const req of requests) {
        const skillIdStr = statusIdToSkillId.get(req.student_skill_status_id.toString());
        if (skillIdStr) {
          const current = statusMap.get(skillIdStr);
          if (current === 'approved') continue;

          if (req.status === 'approved') {
            statusMap.set(skillIdStr, 'approved');
          } else if (req.status === 'pending') {
            statusMap.set(skillIdStr, 'pending');
          } else if (req.status === 'rejected' && current !== 'pending') {
            statusMap.set(skillIdStr, 'rejected');
          }
        }
      }
    }
  }

  return statusMap;
}

module.exports = {
  getStudentSkillStatuses,
};
