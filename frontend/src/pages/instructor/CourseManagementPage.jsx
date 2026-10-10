import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './CourseManagement.css';

const CourseManagementPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Fetch instructor's courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/courses/my');
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('Failed to load instructor courses', err);
      setError('Failed to load courses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Total skills across all instructor courses
  const totalSkills = courses.reduce((acc, c) => acc + (c.skillCount || 0), 0);

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

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setFormData({ name: course.name, description: course.description || '' });
    setFormErrors({});
    setShowModal(true);
  };

  // Close Create / Edit Modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setFormErrors({});
  };

  // Validate form
  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Course name is required.';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Course name must be at least 2 characters.';
    }

    if (!formData.description.trim()) {
      errs.description = 'Course description is required.';
    } else if (formData.description.trim().length < 10) {
      errs.description = 'Course description must be at least 10 characters.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Create or Edit
  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingCourse) {
        // Edit course
        await api.put(`/courses/${editingCourse._id}`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
        setSuccessMessage(`Updated course "${formData.name.trim()}" successfully.`);
      } else {
        // Create course
        await api.post('/courses', {
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
        setSuccessMessage(`Created course "${formData.name.trim()}" successfully.`);
      }

      handleCloseModal();
      await fetchCourses();
    } catch (err) {
      console.error('Course save failed', err);
      const msg = err.response?.data?.message || 'Failed to save course. Please try again.';
      setFormErrors((prev) => ({ ...prev, api: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (course) => {
    setDeletingCourse(course);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  // Close Delete Modal
  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setDeletingCourse(null);
    setDeleteError(null);
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await api.delete(`/courses/${deletingCourse._id}`);

      setSuccessMessage(`Deleted course "${deletingCourse.name}".`);
      handleCloseDelete();
      await fetchCourses();
    } catch (err) {
      console.error('Delete course failed', err);
      const msg =
        err.response?.data?.message || 'Failed to delete course. Please try again.';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="course-mgmt-canvas">
      <div className="course-mgmt-container">
        {/* 1. Page Header */}
        <div className="course-mgmt-header-row">
          <div>
            <h1 className="course-mgmt-title">My Courses</h1>
            <p className="course-mgmt-subtitle">Manage your courses and micro-skills</p>
          </div>
          <button
            type="button"
            className="course-mgmt-btn-create"
            onClick={handleOpenCreate}
            id="openCreateCourseBtn"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Create Course</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
            <span className="material-symbols-outlined me-2 text-danger">error</span>
            <div>{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success d-flex align-items-center mb-4 alert-dismissible" role="alert">
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

        {/* 2. Summary Stats Row */}
        <section aria-label="Course Statistics" className="course-mgmt-stats-grid">
          {/* Card 1: Total Courses */}
          <div className="course-mgmt-stat-card">
            <div className="course-mgmt-stat-icon courses">
              <span className="material-symbols-outlined text-[26px]">school</span>
            </div>
            <div>
              <div className="course-mgmt-stat-val">{courses.length}</div>
              <div className="course-mgmt-stat-lbl">Total Courses</div>
            </div>
          </div>

          {/* Card 2: Total Skills */}
          <div className="course-mgmt-stat-card">
            <div className="course-mgmt-stat-icon skills">
              <span className="material-symbols-outlined text-[26px]">verified</span>
            </div>
            <div>
              <div className="course-mgmt-stat-val">{totalSkills}</div>
              <div className="course-mgmt-stat-lbl">Total Skills Assigned</div>
            </div>
          </div>

          {/* Card 3: Active Curriculums */}
          <div className="course-mgmt-stat-card">
            <div className="course-mgmt-stat-icon active">
              <span className="material-symbols-outlined text-[26px]">folder_special</span>
            </div>
            <div>
              <div className="course-mgmt-stat-val">{courses.length}</div>
              <div className="course-mgmt-stat-lbl">Active Curriculums</div>
            </div>
          </div>
        </section>

        {/* 3. Course Cards Grid */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading courses...</span>
            </div>
            <p className="text-muted mt-2 small">Loading your courses...</p>
          </div>
        ) : courses.length === 0 ? (
          /* Empty State */
          <div className="course-mgmt-empty">
            <div className="course-mgmt-empty-icon">
              <span className="material-symbols-outlined text-[28px]">school</span>
            </div>
            <h3 className="course-mgmt-empty-title">No courses created yet</h3>
            <p className="course-mgmt-empty-desc">
              Get started by creating your first course and defining its micro-skills for student
              competency tracking.
            </p>
            <button
              type="button"
              className="course-mgmt-btn-create d-inline-flex"
              onClick={handleOpenCreate}
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Create Course</span>
            </button>
          </div>
        ) : (
          <div className="course-mgmt-grid">
            {courses.map((course) => (
              <article key={course._id} className="course-mgmt-card">
                <div className="course-mgmt-card-stripe"></div>
                <div className="course-mgmt-card-body">
                  <h2 className="course-mgmt-card-title">{course.name}</h2>
                  <p className="course-mgmt-card-desc">{course.description}</p>

                  <div className="course-mgmt-card-chips">
                    <span className="course-mgmt-chip skills">
                      <span className="material-symbols-outlined text-[14px]">extension</span>
                      <span>
                        {course.skillCount} {course.skillCount === 1 ? 'skill' : 'skills'}
                      </span>
                    </span>
                    <span className="course-mgmt-chip date">
                      <span>Created {formatDate(course.createdAt || course.created_at)}</span>
                    </span>
                  </div>
                </div>

                <div className="course-mgmt-card-actions">
                  <Link
                    to={`/instructor/courses/${course._id}/skills`}
                    className="course-mgmt-btn-skills"
                  >
                    Manage Skills
                  </Link>
                  <Link
                    to={`/instructor/courses/${course._id}/students`}
                    className="course-mgmt-btn-students"
                    title="View Enrolled Students"
                  >
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>Students</span>
                  </Link>
                  <button
                    type="button"
                    className="course-mgmt-btn-icon"
                    title="Edit course"
                    onClick={() => handleOpenEdit(course)}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    type="button"
                    className="course-mgmt-btn-icon delete"
                    title="Delete course"
                    onClick={() => handleOpenDelete(course)}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 4. CREATE / EDIT MODAL */}
        {showModal && (
          <div className="course-modal-backdrop" role="dialog" aria-modal="true">
            <div className="course-modal-box">
              <div className="course-modal-header">
                <h3 className="course-modal-title">
                  {editingCourse ? 'Edit Course' : 'Create New Course'}
                </h3>
                <button
                  type="button"
                  className="course-modal-close-btn"
                  onClick={handleCloseModal}
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitCourse} className="course-modal-body">
                {formErrors.api && (
                  <div className="alert alert-danger py-2 px-3 text-xs mb-3">
                    {formErrors.api}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label font-semibold text-sm mb-1" htmlFor="modalCourseName">
                    Course Name
                  </label>
                  <input
                    id="modalCourseName"
                    type="text"
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g., Web Development"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={submitting}
                    required
                  />
                  {formErrors.name && (
                    <div className="invalid-feedback">{formErrors.name}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label font-semibold text-sm mb-1" htmlFor="modalCourseDesc">
                    Description
                  </label>
                  <textarea
                    id="modalCourseDesc"
                    rows="3"
                    className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                    placeholder="Describe your course objectives, syllabus, and topics covered..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                    required
                  ></textarea>
                  {formErrors.description && (
                    <div className="invalid-feedback">{formErrors.description}</div>
                  )}
                </div>

                <div className="course-modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-3"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        <span>Saving...</span>
                      </>
                    ) : editingCourse ? (
                      'Save Changes'
                    ) : (
                      'Create Course'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. DELETE CONFIRMATION MODAL */}
        {showDeleteModal && deletingCourse && (
          <div className="course-modal-backdrop" role="dialog" aria-modal="true">
            <div className="course-modal-box">
              <div className="course-modal-header">
                <h3 className="course-modal-title text-danger">Delete Course?</h3>
                <button
                  type="button"
                  className="course-modal-close-btn"
                  onClick={handleCloseDelete}
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="course-modal-body">
                <p className="text-sm text-slate-700 mb-2">
                  Are you sure you want to delete <strong>{deletingCourse.name}</strong>?
                </p>

                <div className="alert alert-warning py-2 px-3 text-xs mb-3">
                  <strong>Warning:</strong> This will also remove all skills under this course.
                </div>

                {deleteError && (
                  <div className="alert alert-danger py-2 px-3 text-xs mb-3">{deleteError}</div>
                )}

                <div className="course-modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={handleCloseDelete}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm px-3"
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Yes, Delete Course'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseManagementPage;
