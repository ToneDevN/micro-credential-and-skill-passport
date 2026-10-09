import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './AnalyticsDashboard.css';

const AnalyticsDashboardPage = () => {
  const [overview, setOverview] = useState(null);
  const [skills, setSkills] = useState([]);
  const [filterCourses, setFilterCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('approved_desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch overview and skill analytics in parallel
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const overviewParams = {};
      const skillsParams = { sort: sortFilter };

      if (courseFilter && courseFilter !== 'all') {
        overviewParams.courseId = courseFilter;
        skillsParams.courseId = courseFilter;
      }

      const [overviewRes, skillsRes] = await Promise.all([
        api.get('/analytics/overview', { params: overviewParams }),
        api.get('/analytics/skills', { params: skillsParams }),
      ]);

      setOverview(overviewRes.data.overview || null);
      setSkills(skillsRes.data.skills || []);

      if (skillsRes.data.filters?.courses) {
        setFilterCourses(skillsRes.data.filters.courses);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(
        err.response?.data?.message || 'Failed to load analytics data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [courseFilter, sortFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Rate color helper
  const getRateColorClass = (rate) => {
    if (rate >= 70) return 'rate-emerald';
    if (rate >= 40) return 'rate-amber';
    return 'rate-red';
  };

  // Filter skills needing attention (rejection rate > 50% or 0 approved with rejections)
  const attentionSkills = skills.filter(
    (item) => item.rejectionRate > 50 || (item.approved === 0 && item.rejected > 0)
  );

  return (
    <div className="analytics-canvas">
      {/* 1. Header with Course Filter */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            Skill certification insights across your courses
          </p>
        </div>

        <div>
          <select
            id="course-filter-select"
            className="analytics-filter-select"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            disabled={loading}
          >
            <option value="all">All Courses</option>
            {filterCourses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-danger mt-4 d-flex align-items-center justify-content-between" role="alert">
          <div>
            <span className="fw-semibold me-2">Error:</span> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={fetchAnalytics}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton or Content */}
      {loading ? (
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading analytics...</span>
          </div>
          <p className="text-muted mt-3 small">Loading certification metrics...</p>
        </div>
      ) : (
        <>
          {/* 2. Summary Stats Row (4 cards) */}
          <div className="analytics-stats-grid">
            {/* Card 1: Badges Issued */}
            <div className="analytics-stat-card">
              <div className="analytics-stat-icon-wrap analytics-stat-icon-indigo">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  military_tech
                </span>
              </div>
              <div>
                <div className="analytics-stat-value">
                  {overview?.totalBadgesIssued ?? 0}
                </div>
                <div className="analytics-stat-label">Badges Issued</div>
              </div>
            </div>

            {/* Card 2: Pending Requests */}
            <div className="analytics-stat-card">
              <div className="analytics-stat-icon-wrap analytics-stat-icon-amber">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  hourglass_top
                </span>
              </div>
              <div>
                <div className="analytics-stat-value">
                  {overview?.totalPendingRequests ?? 0}
                </div>
                <div className="analytics-stat-label">Pending Requests</div>
              </div>
            </div>

            {/* Card 3: Approval Rate */}
            <div className="analytics-stat-card">
              <div className="analytics-stat-icon-wrap analytics-stat-icon-emerald">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  trending_up
                </span>
              </div>
              <div>
                <div className="analytics-stat-value value-emerald">
                  {overview?.approvalRate ?? 0}%
                </div>
                <div className="analytics-stat-label">Approval Rate</div>
              </div>
            </div>

            {/* Card 4: Skills Tracked */}
            <div className="analytics-stat-card">
              <div className="analytics-stat-icon-wrap analytics-stat-icon-slate">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  layers
                </span>
              </div>
              <div>
                <div className="analytics-stat-value">
                  {overview?.totalSkills ?? 0}
                </div>
                <div className="analytics-stat-label">Skills Tracked</div>
              </div>
            </div>
          </div>

          {/* 3. Skill Certification Report Table */}
          <div className="analytics-section">
            <div className="analytics-section-header">
              <div>
                <h2 className="analytics-section-title">Skill Certification Report</h2>
                <p className="analytics-section-subtitle">
                  Ranked by approved certifications
                </p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <select
                  className="analytics-sort-select"
                  value={sortFilter}
                  onChange={(e) => setSortFilter(e.target.value)}
                  aria-label="Sort skills"
                >
                  <option value="approved_desc">Most Approved</option>
                  <option value="approved_asc">Least Approved</option>
                  <option value="rejection_rate_desc">Highest Rejection Rate</option>
                </select>
                <span className="analytics-sync-pill d-none d-sm-inline-flex">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    sync
                  </span>
                  Real-time ledger sync
                </span>
              </div>
            </div>

            {skills.length === 0 ? (
              <div className="analytics-empty-state">
                <div className="analytics-empty-icon">📊</div>
                <h3 className="analytics-empty-title">No certification data yet</h3>
                <p className="analytics-empty-text">
                  Once students submit verification requests and skills are evaluated,
                  performance reports and distribution analytics will appear here.
                </p>
              </div>
            ) : (
              <div className="analytics-table-card">
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th style={{ width: '56px' }}>#</th>
                        <th>Skill</th>
                        <th>Course</th>
                        <th style={{ textAlign: 'center' }}>Approved</th>
                        <th style={{ textAlign: 'center' }}>Rejected</th>
                        <th style={{ textAlign: 'center' }}>Pending</th>
                        <th style={{ textAlign: 'center' }}>Approval Rate</th>
                        <th style={{ minWidth: '150px' }}>Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skills.map((item, index) => {
                        const totalEvaluated = item.approved + item.rejected + item.pending;
                        const approvedPct =
                          totalEvaluated > 0
                            ? (item.approved / totalEvaluated) * 100
                            : 0;
                        const rejectedPct =
                          totalEvaluated > 0
                            ? (item.rejected / totalEvaluated) * 100
                            : 0;
                        const pendingPct =
                          totalEvaluated > 0
                            ? (item.pending / totalEvaluated) * 100
                            : 0;

                        return (
                          <tr key={`${item.course._id}-${item.skill._id}`}>
                            <td>
                              <span
                                className={`rank-badge ${
                                  index < 3 ? 'top-rank' : 'lower-rank'
                                }`}
                              >
                                #{index + 1}
                              </span>
                            </td>
                            <td>
                              <div className="skill-name-col">{item.skill.name}</div>
                            </td>
                            <td>
                              <span className="course-name-sub">
                                {item.course.name}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className={`count-badge ${
                                  item.approved > 0
                                    ? 'count-badge-approved'
                                    : 'count-badge-zero'
                                }`}
                              >
                                {item.approved}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className={`count-badge ${
                                  item.rejected > 0
                                    ? 'count-badge-rejected'
                                    : 'count-badge-zero'
                                }`}
                              >
                                {item.rejected}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className={`count-badge ${
                                  item.pending > 0
                                    ? 'count-badge-pending'
                                    : 'count-badge-zero'
                                }`}
                              >
                                {item.pending}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className={`rate-indicator ${getRateColorClass(
                                  item.approvalRate
                                )}`}
                              >
                                {item.approvalRate}%
                              </span>
                            </td>
                            <td>
                              <div className="distribution-bar" title={`Approved: ${item.approved}, Rejected: ${item.rejected}, Pending: ${item.pending}`}>
                                <div
                                  className="bar-approved"
                                  style={{ width: `${approvedPct}%` }}
                                />
                                <div
                                  className="bar-rejected"
                                  style={{ width: `${rejectedPct}%` }}
                                />
                                <div
                                  className="bar-pending"
                                  style={{ width: `${pendingPct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 4. Skills Needing Attention Section */}
          <div className="analytics-section">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span
                className="material-symbols-outlined text-warning"
                style={{ fontSize: '22px' }}
              >
                warning
              </span>
              <h2 className="analytics-section-title">Skills Needing Attention</h2>
              <span className="analytics-section-subtitle ms-1">
                • Skills with high rejection rates or zero approvals
              </span>
            </div>

            <div className="attention-grid">
              {attentionSkills.length === 0 ? (
                <div className="attention-card-positive">
                  <div className="attention-icon-positive">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                      check_circle
                    </span>
                  </div>
                  <div>
                    <h4 className="fw-bold text-success mb-1" style={{ fontSize: '0.95rem' }}>
                      All skills are performing well
                    </h4>
                    <p className="text-muted small mb-0">
                      None of your tracked skills have a rejection rate above 50%. Keep up the great work!
                    </p>
                  </div>
                </div>
              ) : (
                attentionSkills.map((item) => (
                  <div
                    key={`attention-${item.course._id}-${item.skill._id}`}
                    className="attention-card"
                  >
                    <div>
                      <div className="attention-card-header">
                        <div className="attention-icon-wrap">
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '20px' }}
                          >
                            trending_down
                          </span>
                        </div>
                        <div>
                          <h3 className="attention-skill-name">{item.skill.name}</h3>
                          <p className="attention-course-name">{item.course.name}</p>
                        </div>
                      </div>
                      <div className="attention-stats-line">
                        {item.approvalRate}% approval rate • {item.rejected} rejection
                        {item.rejected !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="attention-suggestion-box">
                      {item.approved === 0
                        ? '“This skill has no approved certifications yet. Students may need more guidance or revised assessment criteria.”'
                        : '“Consider reviewing certification criteria or providing additional learning resources to improve completion.”'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboardPage;
