import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import './SkillManagement.css';

const SkillManagementPage = () => {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch course and skills
  const fetchCourseSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/courses/${courseId}/skills`);
      setCourse(res.data.course || null);
      setSkills(res.data.skills || []);
    } catch (err) {
      console.error('Failed to load course skills:', err);
      if (err.response?.status === 403) {
        setError('You are not authorized to manage skills for this course.');
      } else if (err.response?.status === 404) {
        setError('Course not found.');
      } else {
        setError('Failed to load course skills. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseSkills();
  }, [fetchCourseSkills]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingSkill(null);
    setFormData({ name: '', description: '', criteria: '' });
    setFormErrors({});
    setShowModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (skill) => {
    const rawSkill = skill.skill_id || skill;
    setEditingSkill(skill);
    setFormData({
      name: rawSkill.name || skill.name || '',
      description: rawSkill.description || skill.description || '',
      criteria: rawSkill.criteria || skill.criteria || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Close Add / Edit Modal
  const handleCloseModal = () => {
    if (!submitting) {
      setShowModal(false);
      setEditingSkill(null);
      setFormErrors({});
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Skill name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Skill name must be at least 2 characters';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Skill name cannot exceed 200 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Skill description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters';
    }

    if (!formData.criteria.trim()) {
      errors.criteria = 'Certification criteria is required';
    } else if (formData.criteria.trim().length < 10) {
      errors.criteria = 'Criteria must be at least 10 characters';
    } else if (formData.criteria.trim().length > 2000) {
      errors.criteria = 'Criteria cannot exceed 2000 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit (Create or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      if (editingSkill) {
        // Edit mode: target skill ID
        const targetSkillId = editingSkill.skill_id?._id || editingSkill._id;
        await api.put(`/courses/${courseId}/skills/${targetSkillId}`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          criteria: formData.criteria.trim(),
        });
        setSuccessMessage(`Skill "${formData.name.trim()}" updated successfully.`);
      } else {
        // Create mode
        await api.post(`/courses/${courseId}/skills`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          criteria: formData.criteria.trim(),
        });
        setSuccessMessage(`Skill "${formData.name.trim()}" added successfully.`);
      }

      setShowModal(false);
      setEditingSkill(null);
      await fetchCourseSkills();
    } catch (err) {
      console.error('Failed to save skill:', err);
      const apiMsg = err.response?.data?.message || 'Failed to save skill.';
      setFormErrors({ submit: apiMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete confirmation
  const handleOpenDelete = (skill) => {
    setDeletingSkill(skill);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  // Close Delete confirmation
  const handleCloseDelete = () => {
    if (!deleting) {
      setShowDeleteModal(false);
      setDeletingSkill(null);
      setDeleteError(null);
    }
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deletingSkill) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const targetSkillId = deletingSkill.skill_id?._id || deletingSkill._id;
      await api.delete(`/courses/${courseId}/skills/${targetSkillId}`);

      const skillName = deletingSkill.skill_id?.name || deletingSkill.name || 'Skill';
      setSuccessMessage(`"${skillName}" deleted successfully.`);
      setShowDeleteModal(false);
      setDeletingSkill(null);
      await fetchCourseSkills();
    } catch (err) {
      console.error('Failed to delete skill:', err);
      const apiMsg = err.response?.data?.message || 'Failed to delete skill.';
      setDeleteError(apiMsg);
    } finally {
      setDeleting(false);
    }
  };

  // Helper to categorize skills into domain tags
  const getDomainTag = (name = '', desc = '') => {
    const text = `${name} ${desc}`.toLowerCase();
    if (text.includes('react') || text.includes('vue') || text.includes('frontend') || text.includes('ui') || text.includes('html') || text.includes('css')) {
      return 'FRONTEND';
    }
    if (text.includes('express') || text.includes('node') || text.includes('backend') || text.includes('api') || text.includes('rest') || text.includes('python')) {
      return 'BACKEND';
    }
    if (text.includes('auth') || text.includes('security') || text.includes('jwt') || text.includes('crypto')) {
      return 'SECURITY';
    }
    if (text.includes('sql') || text.includes('mongo') || text.includes('database') || text.includes('db')) {
      return 'DATABASE';
    }
    if (text.includes('docker') || text.includes('devops') || text.includes('cloud') || text.includes('k8s')) {
      return 'DEVOPS';
    }
    return 'GENERAL';
  };

  if (loading) {
    return (
      <div className="skill-mgmt-canvas text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading skills...</span>
        </div>
        <p className="text-muted mt-2">Loading course micro-skills...</p>
      </div>
    );
  }

  return (
    <div className="skill-mgmt-canvas">
      {/* 1. Breadcrumb */}
      <nav aria-label="Breadcrumb" className="skill-mgmt-breadcrumb">
        <Link to="/instructor/courses">My Courses</Link>
        <span className="separator material-symbols-outlined">chevron_right</span>
        <span className="current">{course?.name || 'Course'}</span>
        <span className="separator material-symbols-outlined">chevron_right</span>
        <span className="current">Manage Skills</span>
      </nav>

      {/* 2. Page Header */}
      <div className="skill-mgmt-header">
        <div>
          <h1 className="skill-mgmt-title">Manage Skills</h1>
          <p className="skill-mgmt-subtitle">
            <span>{course?.name}</span>
            <span className="skill-mgmt-subtitle-dot"></span>
            <span className="skill-mgmt-subtitle-count">
              {skills.length} {skills.length === 1 ? 'micro-skill' : 'micro-skills'} registered
            </span>
          </p>
        </div>
        <button
          type="button"
          className="skill-mgmt-btn-add"
          onClick={handleOpenCreate}
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Add Skill</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mt-3 mb-0" role="alert">
          <span className="material-symbols-outlined me-2 text-danger">error</span>
          <div>{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success d-flex align-items-center mt-3 mb-0 alert-dismissible" role="alert">
          <span className="material-symbols-outlined me-2 text-success">check_circle</span>
          <div className="flex-grow-1">{successMessage}</div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setSuccessMessage(null)}
          ></button>
        </div>
      )}

      {/* 3. Skills List */}
      {skills.length === 0 ? (
        <div className="skill-mgmt-empty">
          <div className="skill-mgmt-empty-icon">
            <span className="material-symbols-outlined text-[32px]">extension</span>
          </div>
          <h3 className="skill-mgmt-empty-title">No skills added yet</h3>
          <p className="skill-mgmt-empty-desc">
            Add your first micro-skill to this course to allow students to submit verifiable credentials.
          </p>
          <button
            type="button"
            className="skill-mgmt-btn-add"
            onClick={handleOpenCreate}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add First Skill</span>
          </button>
        </div>
      ) : (
        <div className="skill-mgmt-list">
          {skills.map((skill) => {
            const rawSkill = skill.skill_id || skill;
            const skillName = rawSkill.name || skill.name;
            const skillDesc = rawSkill.description || skill.description;
            const skillCriteria = rawSkill.criteria || skill.criteria;
            const domain = getDomainTag(skillName, skillDesc);

            const earned = skill.earnedCount ?? 0;
            const pending = skill.pendingCount ?? 0;
            const notStarted = skill.notStartedCount ?? 0;

            return (
              <article key={skill._id || rawSkill._id} className="skill-mgmt-card">
                <div className="skill-mgmt-card-top">
                  <div className="skill-mgmt-card-meta">
                    <div className="skill-mgmt-card-name-row">
                      <h2 className="skill-mgmt-card-name">{skillName}</h2>
                      <span className="skill-mgmt-card-domain">{domain}</span>
                    </div>
                    <p className="skill-mgmt-card-desc">{skillDesc}</p>
                  </div>
                  <div className="skill-mgmt-card-actions">
                    <button
                      type="button"
                      className="skill-mgmt-btn-icon"
                      title="Edit Skill"
                      onClick={() => handleOpenEdit(skill)}
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      className="skill-mgmt-btn-icon delete"
                      title="Delete Skill"
                      onClick={() => handleOpenDelete(skill)}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Certification Criteria */}
                <div className="skill-mgmt-criteria-box">
                  <div className="skill-mgmt-criteria-header">
                    <span className="material-symbols-outlined">verified</span>
                    <span>CERTIFICATION CRITERIA</span>
                  </div>
                  <p className="skill-mgmt-criteria-text">{skillCriteria}</p>
                </div>

                {/* Bottom stats row */}
                <div className="skill-mgmt-card-bottom">
                  <div className="skill-mgmt-pills">
                    <span className="skill-mgmt-pill earned">
                      <span className="pill-dot"></span>
                      <span>{earned} earned</span>
                    </span>
                    <span className="skill-mgmt-pill pending">
                      <span className="pill-dot"></span>
                      <span>{pending} pending</span>
                    </span>
                    <span className="skill-mgmt-pill not-started">
                      <span className="pill-dot"></span>
                      <span>{notStarted} not started</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 4. Add / Edit Skill Modal */}
      {showModal && (
        <div className="skill-modal-backdrop" role="dialog" aria-modal="true">
          <div className="skill-modal-box">
            <div className="skill-modal-header">
              <div className="skill-modal-title-wrap">
                <div className="skill-modal-icon-badge">
                  <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                </div>
                <h3 className="skill-modal-title">
                  {editingSkill ? 'Edit Micro-Skill' : 'Add New Skill'}
                </h3>
              </div>
              <button
                type="button"
                className="skill-modal-close-btn"
                onClick={handleCloseModal}
                disabled={submitting}
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="skill-modal-body">
                {formErrors.submit && (
                  <div className="alert alert-danger py-2 small mb-0">
                    {formErrors.submit}
                  </div>
                )}

                <div className="skill-modal-field">
                  <label className="skill-modal-label" htmlFor="skillName">
                    Skill Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="skillName"
                    type="text"
                    className={`skill-modal-input ${formErrors.name ? 'is-invalid border-danger' : ''}`}
                    placeholder="e.g., Express.js"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                    }}
                    disabled={submitting}
                  />
                  {formErrors.name && (
                    <div className="text-danger small mt-1">{formErrors.name}</div>
                  )}
                </div>

                <div className="skill-modal-field">
                  <label className="skill-modal-label" htmlFor="skillDesc">
                    Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="skillDesc"
                    rows={3}
                    className={`skill-modal-textarea ${formErrors.description ? 'is-invalid border-danger' : ''}`}
                    placeholder="Describe what this skill covers..."
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      if (formErrors.description) setFormErrors({ ...formErrors, description: null });
                    }}
                    disabled={submitting}
                  ></textarea>
                  {formErrors.description && (
                    <div className="text-danger small mt-1">{formErrors.description}</div>
                  )}
                </div>

                <div className="skill-modal-field">
                  <label className="skill-modal-label" htmlFor="skillCriteria">
                    Certification Criteria <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="skillCriteria"
                    rows={4}
                    className={`skill-modal-textarea ${formErrors.criteria ? 'is-invalid border-danger' : ''}`}
                    placeholder="Define what a student must demonstrate to earn this credential..."
                    value={formData.criteria}
                    onChange={(e) => {
                      setFormData({ ...formData, criteria: e.target.value });
                      if (formErrors.criteria) setFormErrors({ ...formErrors, criteria: null });
                    }}
                    disabled={submitting}
                  ></textarea>
                  {formErrors.criteria && (
                    <div className="text-danger small mt-1">{formErrors.criteria}</div>
                  )}
                  <div className="skill-modal-hint">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    <span>Criteria will be stamped on verified student credentials.</span>
                  </div>
                </div>
              </div>

              <div className="skill-modal-footer">
                <button
                  type="button"
                  className="skill-modal-btn-cancel"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="skill-modal-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Saving...
                    </>
                  ) : editingSkill ? (
                    'Save Changes'
                  ) : (
                    'Add Skill'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="skill-modal-backdrop" role="dialog" aria-modal="true">
          <div className="skill-modal-box">
            <div className="skill-modal-header">
              <div className="skill-modal-title-wrap">
                <span className="material-symbols-outlined text-danger text-[24px]">warning</span>
                <h3 className="skill-modal-title">Delete Skill</h3>
              </div>
              <button
                type="button"
                className="skill-modal-close-btn"
                onClick={handleCloseDelete}
                disabled={deleting}
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="skill-modal-body">
              <p className="mb-2">
                Are you sure you want to delete{' '}
                <strong>"{deletingSkill?.skill_id?.name || deletingSkill?.name}"</strong>?
              </p>
              <div className="alert alert-warning py-2 small mb-0 d-flex align-items-center">
                <span className="material-symbols-outlined text-warning me-2 text-[20px]">warning</span>
                <span>Students will lose progress on this skill.</span>
              </div>

              {deleteError && (
                <div className="alert alert-danger py-2 small mb-0 mt-2">
                  <span className="material-symbols-outlined me-1 align-middle text-[18px]">error</span>
                  {deleteError}
                </div>
              )}
            </div>

            <div className="skill-modal-footer">
              <button
                type="button"
                className="skill-modal-btn-cancel"
                onClick={handleCloseDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="skill-modal-btn-delete"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Skill'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillManagementPage;
