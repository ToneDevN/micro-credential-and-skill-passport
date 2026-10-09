import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Passport.css';

const PassportDashboardPage = () => {
  const [passport, setPassport] = useState(null);
  const [skillMap, setSkillMap] = useState(null);
  const [activeTab, setActiveTab] = useState('badges'); // 'badges' | 'skillmap'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch both passport and skill map in parallel
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [passportRes, skillMapRes] = await Promise.all([
          api.get('/passport/my'),
          api.get('/passport/my/skill-map'),
        ]);

        if (isMounted) {
          setPassport(passportRes.data.passport || { badges: [], totalBadges: 0 });
          setSkillMap(
            skillMapRes.data || {
              courses: [],
              summary: {
                totalSkills: 0,
                earnedSkills: 0,
                pendingSkills: 0,
                overallCompletionRate: 0,
              },
            }
          );
        }
      } catch (err) {
        console.error('Failed to load skill passport data', err);
        if (isMounted) {
          setError('Failed to load your Skill Passport. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Group badges by course_name
  const groupedBadges = useMemo(() => {
    const groups = {};
    const badges = passport?.badges || [];

    badges.forEach((b) => {
      const courseName = b.course_name || 'General';
      if (!groups[courseName]) {
        groups[courseName] = [];
      }
      groups[courseName].push(b);
    });

    return groups;
  }, [passport]);

  // Derived summary statistics
  const totalBadges = passport?.totalBadges ?? passport?.badges?.length ?? 0;
  const pendingSkills = skillMap?.summary?.pendingSkills ?? 0;
  const completionRate = skillMap?.summary?.overallCompletionRate ?? 0;

  // Select dynamic badge icon based on index/skill name
  const getBadgeIcon = (skillName, index) => {
    const icons = ['emoji_events', 'military_tech', 'stars', 'database', 'analytics', 'workspace_premium'];
    if (/api|express|backend/i.test(skillName)) return 'emoji_events';
    if (/react|ui|frontend/i.test(skillName)) return 'military_tech';
    if (/sql|data|mongo/i.test(skillName)) return 'database';
    if (/auth|security/i.test(skillName)) return 'stars';
    return icons[index % icons.length];
  };

  // Render status badge for skill map
  const renderSkillStatusPill = (status) => {
    switch (status) {
      case 'earned':
        return (
          <span className="passport-status-pill earned">
            <span
              className="material-symbols-outlined text-[12px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check
            </span>
            <span>Earned</span>
          </span>
        );
      case 'pending':
        return (
          <span className="passport-status-pill pending">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            <span>Pending</span>
          </span>
        );
      case 'expired':
        return (
          <span className="passport-status-pill expired">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            <span>Expired</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="passport-status-pill rejected">
            <span
              className="material-symbols-outlined text-[12px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
            <span>Rejected</span>
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="passport-status-pill not_started">
            <span className="material-symbols-outlined text-[12px]">circle</span>
            <span>Not Started</span>
          </span>
        );
    }
  };

  return (
    <div className="passport-canvas">
      <div className="passport-container">
        {/* 1. Page Header */}
        <header className="passport-header-row">
          <div>
            <h1 className="passport-title">My Skill Passport</h1>
            <p className="passport-subtitle">Your digital credential portfolio</p>
          </div>

          {/* Credential Identity Chip */}
          <div className="passport-identity-chip">
            <div className="passport-identity-avatar">AU</div>
            <span className="passport-identity-name">Apex Tech University</span>
            <span
              className="material-symbols-outlined passport-identity-verified"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          </div>
        </header>

        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
            <span className="material-symbols-outlined me-2 text-danger">error</span>
            <div>{error}</div>
          </div>
        )}

        {/* 2. Summary Stats Cards */}
        <section aria-label="Passport Statistics" className="passport-stats-grid">
          {/* Card 1: Badges Earned */}
          <div className="passport-stat-card">
            <div className="passport-stat-icon-wrap badges">
              <span className="material-symbols-outlined text-[28px]">military_tech</span>
            </div>
            <div>
              <div className="passport-stat-value">{totalBadges}</div>
              <div className="passport-stat-label">Badges Earned</div>
            </div>
          </div>

          {/* Card 2: Skills In Progress */}
          <div className="passport-stat-card">
            <div className="passport-stat-icon-wrap pending">
              <span className="material-symbols-outlined text-[28px]">hourglass_top</span>
            </div>
            <div>
              <div className="passport-stat-value">{pendingSkills}</div>
              <div className="passport-stat-label">Skills In Progress</div>
            </div>
          </div>

          {/* Card 3: Completion Rate */}
          <div className="passport-stat-card">
            <div className="passport-stat-icon-wrap completion">
              <span className="material-symbols-outlined text-[28px]">trending_up</span>
            </div>
            <div>
              <div className="passport-stat-value">{completionRate}%</div>
              <div className="passport-stat-label">Completion Rate</div>
            </div>
          </div>
        </section>

        {/* 3. Tab Navigation */}
        <nav aria-label="Passport Sections" className="passport-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'badges'}
            className={`passport-tab-button ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
            <span>Digital Badges</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'skillmap'}
            className={`passport-tab-button ${activeTab === 'skillmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('skillmap')}
          >
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
            <span>Skill Map</span>
          </button>
        </nav>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading passport...</span>
            </div>
            <p className="text-muted mt-2 small">Loading your credentials and skill map...</p>
          </div>
        ) : activeTab === 'badges' ? (
          /* ================= DIGITAL BADGES TAB ================= */
          <section aria-label="Digital Badges Catalog" className="passport-badges-catalog">
            {Object.keys(groupedBadges).length === 0 ? (
              <div className="passport-empty-box">
                <div className="passport-empty-icon">
                  <span className="material-symbols-outlined text-[28px]">military_tech</span>
                </div>
                <h3 className="passport-empty-title">No badges earned yet</h3>
                <p className="passport-empty-desc">
                  Start by exploring skills and submitting verification requests to earn your digital
                  credentials.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <Link to="/explore" className="btn btn-outline-primary btn-sm px-3">
                    Explore Skills
                  </Link>
                  <Link to="/student/submit-verification" className="btn btn-primary btn-sm px-3">
                    Submit Verification
                  </Link>
                </div>
              </div>
            ) : (
              Object.entries(groupedBadges).map(([courseName, badges]) => (
                <div key={courseName} className="passport-course-group">
                  {/* Course Group Header */}
                  <div className="passport-course-group-header">
                    <div className="d-flex align-items-center gap-2">
                      <h2 className="passport-course-group-title">{courseName}</h2>
                      <span className="passport-course-badge-count">
                        {badges.length} {badges.length === 1 ? 'badge' : 'badges'}
                      </span>
                    </div>
                    <span className="passport-course-curriculum-id">
                      Verified Curriculum
                    </span>
                  </div>

                  {/* Badges Grid */}
                  <div className="passport-badges-grid">
                    {badges.map((b, idx) => (
                      <article key={b._id || idx} className="passport-badge-card">
                        {/* Circular Emblem */}
                        <div className="passport-badge-circle">
                          <span className="material-symbols-outlined passport-badge-icon">
                            {getBadgeIcon(b.skill_name, idx)}
                          </span>
                          <div className="passport-badge-verified-badge" title="Institutionally Verified">
                            <span className="material-symbols-outlined text-[13px] font-bold">
                              check
                            </span>
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <h3 className="passport-badge-skill-name">{b.skill_name}</h3>
                        <p className="passport-badge-course-name">{b.course_name}</p>
                        <p className="passport-badge-date">Issued {formatDate(b.issued_at)}</p>

                        {/* Verified Ledger Footer */}
                        <div className="passport-badge-footer">
                          <span className="material-symbols-outlined text-[14px]">verified_user</span>
                          <span>
                            Verified Ledger #{b._id ? b._id.toString().slice(-4).toUpperCase() : 'VALID'}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          /* ================= SKILL MAP TAB ================= */
          <section className="passport-skillmap-card">
            <div className="passport-skillmap-header">
              <div>
                <h2 className="passport-skillmap-title">Skill Competency Map</h2>
                <p className="passport-skillmap-subtitle">
                  Track progression across registered curriculums
                </p>
              </div>
              <div className="passport-sync-pill">
                <span className="passport-sync-dot"></span>
                <span>Accredited Sync Active</span>
              </div>
            </div>

            {!skillMap?.courses || skillMap.courses.length === 0 ? (
              <div className="passport-empty-box">
                <div className="passport-empty-icon">
                  <span className="material-symbols-outlined text-[28px]">account_tree</span>
                </div>
                <h3 className="passport-empty-title">No enrolled courses</h3>
                <p className="passport-empty-desc">
                  Enroll in a course to see your skill competency map and tracking progress.
                </p>
                <Link to="/explore" className="btn btn-primary btn-sm px-3">
                  Explore Courses
                </Link>
              </div>
            ) : (
              <div>
                {skillMap.courses.map((course) => (
                  <div key={course._id} className="passport-course-map-item">
                    {/* Top Row: Course name & ratio */}
                    <div className="passport-course-map-top">
                      <h3 className="passport-course-map-title">{course.name}</h3>
                      <span className="passport-course-map-ratio">
                        {course.earnedSkills}/{course.totalSkills} skills earned (
                        {course.completionRate}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="passport-progressbar-bg">
                      <div
                        className="passport-progressbar-fill"
                        style={{ width: `${course.completionRate}%` }}
                      ></div>
                    </div>

                    {/* Skills Grid */}
                    <div className="passport-skills-status-grid">
                      {course.skills.map((skill) => (
                        <div key={skill._id} className="passport-skill-status-cell">
                          <span className="passport-skill-cell-name" title={skill.name}>
                            {skill.name}
                          </span>
                          {renderSkillStatusPill(skill.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default PassportDashboardPage;
