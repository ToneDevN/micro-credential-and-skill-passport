const mongoose = require('mongoose');
const { Course, CourseSkill } = require('../models');

/**
 * @desc    Get analytics overview summary stats
 * @route   GET /api/v1/analytics/overview
 * @access  Private (Instructor only)
 */
const getAnalyticsOverview = async (req, res, next) => {
  try {
    const instructorId = req.user._id || req.user.id;
    const { courseId } = req.query;

    if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(200).json({
        overview: {
          totalCourses: 0,
          totalSkills: 0,
          totalBadgesIssued: 0,
          totalPendingRequests: 0,
          totalRejected: 0,
          approvalRate: 0,
        },
      });
    }

    const matchCourse = {
      instructor_id: new mongoose.Types.ObjectId(instructorId),
    };
    if (courseId) {
      matchCourse._id = new mongoose.Types.ObjectId(courseId);
    }

    const pipeline = [
      { $match: matchCourse },
      {
        $lookup: {
          from: 'courseskills',
          localField: '_id',
          foreignField: 'course_id',
          as: 'courseSkills',
        },
      },
      {
        $unwind: {
          path: '$courseSkills',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'studentskillstatuses',
          localField: 'courseSkills._id',
          foreignField: 'course_skill_id',
          as: 'statuses',
        },
      },
      {
        $unwind: {
          path: '$statuses',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          courses: { $addToSet: '$_id' },
          courseSkills: { $addToSet: '$courseSkills._id' },
          totalBadgesIssued: {
            $sum: {
              $cond: [{ $eq: ['$statuses.status', 'approved'] }, 1, 0],
            },
          },
          totalPendingRequests: {
            $sum: {
              $cond: [{ $eq: ['$statuses.status', 'pending'] }, 1, 0],
            },
          },
          totalRejected: {
            $sum: {
              $cond: [{ $eq: ['$statuses.status', 'rejected'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCourses: { $size: '$courses' },
          totalSkills: {
            $size: {
              $filter: {
                input: '$courseSkills',
                cond: { $ne: ['$$this', null] },
              },
            },
          },
          totalBadgesIssued: 1,
          totalPendingRequests: 1,
          totalRejected: 1,
          approvalRate: {
            $cond: [
              { $eq: [{ $add: ['$totalBadgesIssued', '$totalRejected'] }, 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          '$totalBadgesIssued',
                          { $add: ['$totalBadgesIssued', '$totalRejected'] },
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
    ];

    const results = await Course.aggregate(pipeline);

    if (!results || results.length === 0) {
      return res.status(200).json({
        overview: {
          totalCourses: 0,
          totalSkills: 0,
          totalBadgesIssued: 0,
          totalPendingRequests: 0,
          totalRejected: 0,
          approvalRate: 0,
        },
      });
    }

    return res.status(200).json({
      overview: results[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get per-skill certification analytics report
 * @route   GET /api/v1/analytics/skills
 * @access  Private (Instructor only)
 */
const getSkillAnalytics = async (req, res, next) => {
  try {
    const instructorId = req.user._id || req.user.id;
    const { courseId, sort = 'approved_desc' } = req.query;

    const instructorCourses = await Course.find({
      instructor_id: instructorId,
    }).select('_id name');

    const instructorCourseIds = instructorCourses.map((c) => c._id);

    if (instructorCourseIds.length === 0) {
      return res.status(200).json({
        skills: [],
        filters: { courses: [] },
      });
    }

    const matchStage = {
      course_id: { $in: instructorCourseIds },
    };

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(200).json({
          skills: [],
          filters: {
            courses: instructorCourses.map((c) => ({
              _id: c._id,
              name: c.name,
            })),
          },
        });
      }

      const requestedCourseId = new mongoose.Types.ObjectId(courseId);
      const isOwner = instructorCourseIds.some((id) =>
        id.equals(requestedCourseId)
      );

      if (!isOwner) {
        return res.status(200).json({
          skills: [],
          filters: {
            courses: instructorCourses.map((c) => ({
              _id: c._id,
              name: c.name,
            })),
          },
        });
      }

      matchStage.course_id = requestedCourseId;
    }

    let sortStage = { approved: -1, 'skill.name': 1 };
    if (sort === 'approved_asc') {
      sortStage = { approved: 1, 'skill.name': 1 };
    } else if (sort === 'rejection_rate_desc') {
      sortStage = { rejectionRate: -1, 'skill.name': 1 };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'microskills',
          localField: 'skill_id',
          foreignField: '_id',
          as: 'skill',
        },
      },
      { $unwind: '$skill' },
      {
        $lookup: {
          from: 'courses',
          localField: 'course_id',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: '$course' },
      {
        $lookup: {
          from: 'studentskillstatuses',
          localField: '_id',
          foreignField: 'course_skill_id',
          as: 'statuses',
        },
      },
      {
        $project: {
          skill: { _id: '$skill._id', name: '$skill.name' },
          course: { _id: '$course._id', name: '$course.name' },
          approved: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this.status', 'approved'] },
              },
            },
          },
          rejected: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this.status', 'rejected'] },
              },
            },
          },
          pending: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this.status', 'pending'] },
              },
            },
          },
          notStarted: {
            $size: {
              $filter: {
                input: '$statuses',
                cond: { $eq: ['$$this.status', 'not_started'] },
              },
            },
          },
          total: { $size: '$statuses' },
        },
      },
      {
        $addFields: {
          notStarted: {
            $max: [
              '$notStarted',
              {
                $subtract: [
                  '$total',
                  { $add: ['$approved', '$rejected', '$pending'] },
                ],
              },
            ],
          },
          approvalRate: {
            $cond: [
              { $eq: [{ $add: ['$approved', '$rejected'] }, 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          '$approved',
                          { $add: ['$approved', '$rejected'] },
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
          rejectionRate: {
            $cond: [
              { $eq: [{ $add: ['$approved', '$rejected'] }, 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          '$rejected',
                          { $add: ['$approved', '$rejected'] },
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
          completionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$approved', '$total'] },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      { $sort: sortStage },
    ];

    const skills = await CourseSkill.aggregate(pipeline);

    return res.status(200).json({
      skills,
      filters: {
        courses: instructorCourses.map((c) => ({
          _id: c._id,
          name: c.name,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAnalyticsOverview,
  getSkillAnalytics,
};
