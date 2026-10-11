import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GithubRepoPickerModal from '../../components/GithubRepoPickerModal';
import './Verification.css';


const SubmitVerificationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';
  const initialSkillId = searchParams.get('skillId') || '';

  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [skills, setSkills] = useState([]);
  const [selectedCourseSkillId, setSelectedCourseSkillId] = useState(initialSkillId);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isRepoPickerOpen, setIsRepoPickerOpen] = useState(false);
  const [selectedRepoName, setSelectedRepoName] = useState('');

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch all courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const res = await api.get('/courses');
        const courseList = res.data.courses || [];
        setCourses(courseList);

        if (courseList.length > 0 && !initialCourseId) {
          setSelectedCourseId(courseList[0]._id);
        }
      } catch (err) {
        console.error('Failed to load courses', err);
        setError('Failed to load courses. Please refresh or try again.');
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [initialCourseId]);

  // Fetch skills when selected course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setSkills([]);
      setSelectedCourseSkillId('');
      return;
    }

    const fetchSkills = async () => {
      try {
        setLoadingSkills(true);
        setError(null);
        const res = await api.get(`/courses/${selectedCourseId}/public-skills`);
        const skillList = res.data.skills || [];
        setSkills(skillList);

        if (skillList.length > 0) {
          // If query param matched one of the skills, select it; otherwise select first
          const matched = skillList.find(
            (s) => (s.courseSkillId || s._id) === initialSkillId || s._id === initialSkillId
          );
          setSelectedCourseSkillId(matched ? (matched.courseSkillId || matched._id) : (skillList[0].courseSkillId || skillList[0]._id));
        } else {
          setSelectedCourseSkillId('');
        }
      } catch (err) {
        console.error('Failed to load course skills', err);
        setError('Failed to load skills for this course.');
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();
  }, [selectedCourseId, initialSkillId]);

  // Find currently selected course & skill objects for preview
  const currentCourse = courses.find((c) => c._id === selectedCourseId);
  const currentSkill = skills.find(
    (s) => (s.courseSkillId || s._id) === selectedCourseSkillId
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedCourseSkillId) {
      setError('Please select a skill to submit verification for.');
      return;
    }

    if (!evidenceUrl.trim()) {
      setError('Please enter a valid evidence URL.');
      return;
    }

    try {
      new URL(evidenceUrl.trim());
    } catch {
      setError('Please enter a valid URL (must begin with http:// or https://)');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/verification-requests', {
        courseSkillId: selectedCourseSkillId,
        evidenceUrl: evidenceUrl.trim(),
      });

      if (res.data.success) {
        setSuccessMsg('Verification request submitted successfully! Redirecting...');
        setTimeout(() => {
          navigate('/student/my-requests');
        }, 1200);
      }
    } catch (err) {
      console.error('Submit verification failed', err);
      const msg =
        err.response?.data?.message ||
        'Failed to submit verification request. Please check that you are enrolled in this course.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="verification-canvas">
      <div className="verification-container-narrow">
        {/* 1. Breadcrumb */}
        <nav aria-label="Breadcrumb" className="verification-breadcrumb">
          <Link to="/student/my-requests">
            <span className="material-symbols-outlined text-[16px]">assignment</span>
            <span>My Requests</span>
          </Link>
          <span className="verification-breadcrumb-sep">&gt;</span>
          <span className="verification-breadcrumb-current">Submit New Request</span>
        </nav>

        {/* 2. Page Header */}
        <header className="verification-header">
          <h1 className="verification-title">Submit Verification Request</h1>
          <p className="verification-subtitle">
            Provide evidence to verify your skill competency with institutional assessors
          </p>
        </header>

        {/* 3. Form Card */}
        <div className="verification-card">
          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
              <span className="material-symbols-outlined me-2 text-danger">error</span>
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
              <span className="material-symbols-outlined me-2 text-success">check_circle</span>
              <div>{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} id="verification-form">
            {/* Field 1 — Course */}
            <div className="verification-form-group">
              <label className="verification-label" htmlFor="course-select">
                Course
              </label>
              <div className="verification-select-wrap">
                <select
                  id="course-select"
                  name="course"
                  className="verification-select"
                  value={selectedCourseId}
                  disabled={loadingCourses || submitting}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  {loadingCourses ? (
                    <option value="">Loading courses...</option>
                  ) : courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="verification-select-chevron">
                  <span className="material-symbols-outlined text-[20px]">unfold_more</span>
                </div>
              </div>
            </div>

            {/* Field 2 — Skill */}
            <div className="verification-form-group">
              <label className="verification-label" htmlFor="skill-select">
                Skill
              </label>
              <div className="verification-select-wrap">
                <select
                  id="skill-select"
                  name="skill"
                  className="verification-select"
                  value={selectedCourseSkillId}
                  disabled={loadingSkills || submitting || skills.length === 0}
                  onChange={(e) => setSelectedCourseSkillId(e.target.value)}
                >
                  {loadingSkills ? (
                    <option value="">Loading skills...</option>
                  ) : skills.length === 0 ? (
                    <option value="">No skills linked to this course</option>
                  ) : (
                    skills.map((skill) => (
                      <option
                        key={skill.courseSkillId || skill._id}
                        value={skill.courseSkillId || skill._id}
                      >
                        {skill.name} {skill.description ? `— ${skill.description}` : ''}
                      </option>
                    ))
                  )}
                </select>
                <div className="verification-select-chevron">
                  <span className="material-symbols-outlined text-[20px]">unfold_more</span>
                </div>
              </div>
              <p className="verification-help-text">
                <span className="material-symbols-outlined">info</span>
                <span>Only skills with status &apos;not started&apos; or &apos;expired&apos; can be submitted</span>
              </p>
            </div>

            {/* Field 3 — Evidence URL */}
            <div className="verification-form-group">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="verification-label mb-0" htmlFor="evidence-url">
                  Evidence URL
                </label>
                {user?.github_connected_status === 'connected' ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                    style={{ fontSize: '0.8rem', borderRadius: '6px' }}
                    onClick={() => setIsRepoPickerOpen(true)}
                    disabled={submitting}
                  >
                    <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    <span>Select from GitHub</span>
                  </button>
                ) : (
                  <Link
                    to="/settings"
                    className="text-decoration-none d-inline-flex align-items-center gap-1 text-primary"
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    <span>Connect GitHub ก่อน</span>
                  </Link>
                )}
              </div>

              {selectedRepoName && (
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1 py-1 px-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      check_circle
                    </span>
                    <span>✓ {selectedRepoName}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-muted small text-decoration-none"
                    style={{ fontSize: '0.775rem' }}
                    onClick={() => {
                      setSelectedRepoName('');
                      setEvidenceUrl('');
                    }}
                  >
                    Enter URL manually
                  </button>
                </div>
              )}

              <div className="verification-input-wrap">
                <div className="verification-input-icon">
                  <span className="material-symbols-outlined text-[18px]">link</span>
                </div>
                <input
                  id="evidence-url"
                  name="evidence_url"
                  type="url"
                  className="verification-input"
                  placeholder="https://github.com/your-username/project-repo"
                  value={evidenceUrl}
                  disabled={submitting}
                  onChange={(e) => {
                    setEvidenceUrl(e.target.value);
                    if (selectedRepoName) setSelectedRepoName('');
                  }}
                  required
                />
              </div>
              <p className="verification-help-text">
                <span className="material-symbols-outlined">help_outline</span>
                <span>Provide a link to your work (GitHub, portfolio, Google Drive, etc.)</span>
              </p>
            </div>


            <hr className="border-t border-slate-200 my-4" />

            {/* Verification Target Preview Section */}
            <section aria-labelledby="summary-preview-title" className="verification-preview-box">
              <div className="verification-preview-header">
                <h2 className="verification-preview-title" id="summary-preview-title">
                  <span className="material-symbols-outlined text-primary text-[16px]">fact_check</span>
                  <span>Verification Target Preview</span>
                </h2>
                <span className="verification-stage-badge">
                  <span className="verification-pulse-dot animate-pulse"></span>
                  <span>Ledger Stage 1 of 2</span>
                </span>
              </div>

              <div className="verification-preview-grid">
                <div className="verification-preview-item">
                  <span className="verification-preview-key">Course:</span>
                  <span className="verification-preview-val">
                    {currentCourse ? currentCourse.name : '—'}
                  </span>
                </div>
                <div className="verification-preview-item">
                  <span className="verification-preview-key">Skill:</span>
                  <span className="verification-preview-val">
                    {currentSkill ? currentSkill.name : '—'}
                  </span>
                </div>
              </div>

              {currentSkill?.criteria && (
                <div className="verification-preview-criteria">
                  <span className="verification-preview-key">Criteria:</span>
                  <div className="verification-criteria-badge">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span>{currentSkill.criteria}</span>
                  </div>
                </div>
              )}
            </section>

            {/* Submit Button */}
            <button
              type="submit"
              className="verification-btn-submit"
              disabled={submitting || !selectedCourseSkillId || !evidenceUrl.trim()}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Request</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 4. Bottom Link */}
        <div className="text-center mt-4">
          <Link
            to="/student/my-requests"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to My Requests</span>
          </Link>
        </div>

        {/* GitHub Repository Picker Modal (UC-37, UC-38, TON-137) */}
        <GithubRepoPickerModal
          isOpen={isRepoPickerOpen}
          onClose={() => setIsRepoPickerOpen(false)}
          onSelect={(repo) => {
            setEvidenceUrl(repo.html_url);
            setSelectedRepoName(repo.name);
            setIsRepoPickerOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default SubmitVerificationPage;

