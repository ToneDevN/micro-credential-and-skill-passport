import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import RepositoryInfoPanel from '../../components/RepositoryInfoPanel';
import './VerificationReview.css';

const VerificationReviewPage = () => {
  const [requests, setRequests] = useState([]);
  const [filterCourses, setFilterCourses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [courseFilter, setCourseFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Approve Modal State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedApproveRequest, setSelectedApproveRequest] = useState(null);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectRequest, setSelectedRejectRequest] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(null);

  // Common Action State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Fetch requests from API
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        status: statusFilter,
        sort: 'date_desc',
      };
      if (courseFilter && courseFilter !== 'all') {
        params.courseId = courseFilter;
      }

      const res = await api.get('/verification-requests/instructor', { params });
      setRequests(res.data.requests || []);
      if (res.data.filters?.courses) {
        setFilterCourses(res.data.filters.courses);
      }
    } catch (err) {
      console.error('Failed to load verification requests:', err);
      setError('Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, courseFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Open Approve Modal
  const handleOpenApprove = (req) => {
    setSelectedApproveRequest(req);
    setActionError(null);
    setShowApproveModal(true);
  };

  // Close Approve Modal
  const handleCloseApprove = () => {
    if (!actionLoading) {
      setShowApproveModal(false);
      setSelectedApproveRequest(null);
      setActionError(null);
    }
  };

  // Confirm Approve
  const handleConfirmApprove = async () => {
    if (!selectedApproveRequest) return;

    try {
      setActionLoading(true);
      setActionError(null);

      await api.put(`/verification-requests/${selectedApproveRequest._id}/approve`);

      setSuccessMessage(
        `Successfully approved "${selectedApproveRequest.skill?.name}" for ${selectedApproveRequest.student?.name}. Digital badge issued to student passport!`
      );
      setShowApproveModal(false);
      setSelectedApproveRequest(null);
      await fetchRequests();
    } catch (err) {
      console.error('Approve failed:', err);
      const apiMsg = err.response?.data?.message || 'Failed to approve request.';
      setActionError(apiMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (req) => {
    setSelectedRejectRequest(req);
    setFeedback('');
    setFeedbackError(null);
    setActionError(null);
    setShowRejectModal(true);
  };

  // Close Reject Modal
  const handleCloseReject = () => {
    if (!actionLoading) {
      setShowRejectModal(false);
      setSelectedRejectRequest(null);
      setFeedback('');
      setFeedbackError(null);
      setActionError(null);
    }
  };

  // Confirm Reject
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedRejectRequest) return;

    const trimmed = feedback.trim();
    if (!trimmed) {
      setFeedbackError('Feedback is required to explain rejection reasons.');
      return;
    }
    if (trimmed.length < 5) {
      setFeedbackError('Feedback must be at least 5 characters.');
      return;
    }
    if (trimmed.length > 2000) {
      setFeedbackError('Feedback cannot exceed 2000 characters.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      await api.put(`/verification-requests/${selectedRejectRequest._id}/reject`, {
        feedback: trimmed,
      });

      setSuccessMessage(
        `Verification request for ${selectedRejectRequest.student?.name} has been rejected with feedback.`
      );
      setShowRejectModal(false);
      setSelectedRejectRequest(null);
      setFeedback('');
      await fetchRequests();
    } catch (err) {
      console.error('Reject failed:', err);
      const apiMsg = err.response?.data?.message || 'Failed to reject request.';
      setActionError(apiMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for student initials
  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'ST').toUpperCase();
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Count pending requests
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="review-mgmt-canvas">
      {/* 1. Header */}
      <div className="review-mgmt-header">
        <div>
          <h1 className="review-mgmt-title">Verification Requests</h1>
          <p className="review-mgmt-subtitle">
            Review student skill verification submissions and issue verified credentials
          </p>
        </div>
        {statusFilter === 'pending' && (
          <span className="review-mgmt-badge-pending">
            <span className="badge-dot"></span>
            <span>{pendingCount} Pending Review</span>
          </span>
        )}
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

      {/* 2. Filter Bar */}
      <div className="review-mgmt-filter-bar">
        {/* Status segmented pills */}
        <div className="review-mgmt-tabs" role="tablist">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`review-mgmt-tab-btn ${statusFilter === tab ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Course Filter Dropdown */}
        <div className="review-mgmt-select-wrap">
          <select
            className="review-mgmt-select"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
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

      {/* 3. Requests Table Card */}
      <div className="review-mgmt-table-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading requests...</span>
            </div>
            <p className="text-muted mt-2 small">Loading student verification submissions...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="review-mgmt-empty">
            <div className="review-mgmt-empty-icon">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <h3 className="review-mgmt-empty-title">
              {statusFilter === 'pending'
                ? 'No pending requests. All caught up!'
                : 'No verification requests found.'}
            </h3>
            <p className="review-mgmt-empty-desc">
              {statusFilter === 'pending'
                ? 'When students submit evidence for your courses, requests will appear here for evaluation.'
                : 'Try adjusting your status or course filters.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="review-mgmt-table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Skill</th>
                    <th scope="col">Course</th>
                    <th scope="col">Evidence</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const isPending = req.status === 'pending';
                    const initials = getInitials(req.student?.name);

                    return (
                      <tr
                        key={req._id}
                        className={!isPending ? 'reviewed-row' : ''}
                      >
                        {/* Student */}
                        <td>
                          <div className="review-mgmt-student-cell">
                            <div className="review-mgmt-avatar">{initials}</div>
                            <div>
                              <div className="review-mgmt-student-name">
                                {req.student?.name}
                              </div>
                              <div className="review-mgmt-student-email">
                                {req.student?.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Skill */}
                        <td>
                          <span className="fw-semibold text-slate-800">
                            {req.skill?.name}
                          </span>
                        </td>

                        {/* Course */}
                        <td className="text-muted">{req.course?.name}</td>

                        {/* Evidence */}
                        <td>
                          {req.evidence_url ? (
                            <div>
                              <a
                                href={req.evidence_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="review-mgmt-evidence-link"
                                title={req.evidence_url}
                              >
                                <span>{req.evidence_url.replace(/^https?:\/\//, '')}</span>
                                <span className="material-symbols-outlined text-[15px]">
                                  open_in_new
                                </span>
                              </a>
                              <RepositoryInfoPanel
                                requestId={req._id}
                                evidenceUrl={req.evidence_url}
                              />
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* Submitted Date */}
                        <td className="text-muted">
                          <div>{formatDate(req.submitted_at)}</div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`review-status-badge ${req.status}`}>
                            {req.status === 'pending' && <span className="badge-dot"></span>}
                            {req.status === 'approved' && (
                              <span className="material-symbols-outlined text-[14px]">
                                check
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="material-symbols-outlined text-[14px]">
                                close
                              </span>
                            )}
                            <span>
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-end">
                          {isPending ? (
                            <div className="review-mgmt-actions-wrap">
                              <button
                                type="button"
                                className="review-btn-approve"
                                onClick={() => handleOpenApprove(req)}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  check
                                </span>
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                className="review-btn-reject"
                                onClick={() => handleOpenReject(req)}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  close
                                </span>
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="review-reviewed-text">
                              Reviewed {formatDate(req.reviewed_at)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="review-mobile-cards-list d-md-none">
              {requests.map((req) => {
                const isPending = req.status === 'pending';
                const initials = getInitials(req.student?.name);

                return (
                  <article key={req._id} className="review-mobile-card">
                    {/* Header: Student Info & Status */}
                    <div className="review-mobile-card-top">
                      <div className="review-mgmt-student-cell">
                        <div className="review-mgmt-avatar">{initials}</div>
                        <div>
                          <div className="review-mgmt-student-name">
                            {req.student?.name}
                          </div>
                          <div className="review-mgmt-student-email">
                            {req.student?.email}
                          </div>
                        </div>
                      </div>
                      <span className={`review-status-badge ${req.status}`}>
                        {req.status === 'pending' && <span className="badge-dot"></span>}
                        {req.status === 'approved' && (
                          <span className="material-symbols-outlined text-[14px]">
                            check
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                        )}
                        <span>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </span>
                    </div>

                    {/* Metadata Rows */}
                    <div className="review-mobile-details">
                      <div className="review-mobile-row">
                        <span className="review-mobile-row-key">Skill:</span>
                        <span className="review-mobile-row-val">{req.skill?.name}</span>
                      </div>
                      <div className="review-mobile-row">
                        <span className="review-mobile-row-key">Course:</span>
                        <span className="review-mobile-row-val text-muted">{req.course?.name}</span>
                      </div>
                      <div className="review-mobile-row">
                        <span className="review-mobile-row-key">Submitted:</span>
                        <span className="review-mobile-row-val text-muted">{formatDate(req.submitted_at)}</span>
                      </div>
                      {req.evidence_url && (
                        <div className="review-mobile-row flex-column align-items-start gap-1">
                          <span className="review-mobile-row-key">Evidence:</span>
                          <span className="review-mobile-row-val w-100">
                            <a
                              href={req.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="review-mgmt-evidence-link"
                            >
                              <span>{req.evidence_url.replace(/^https?:\/\//, '')}</span>
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                            <RepositoryInfoPanel
                              requestId={req._id}
                              evidenceUrl={req.evidence_url}
                            />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Review Feedback note (if approved/rejected) */}
                    {req.feedback && (
                      <div className={`review-mobile-feedback-box ${req.status}`}>
                        <div className="review-mobile-feedback-title">Decision Note:</div>
                        <p className="review-mobile-feedback-text">“{req.feedback}”</p>
                      </div>
                    )}

                    {/* Actions if pending */}
                    {isPending ? (
                      <div className="review-mobile-actions">
                        <button
                          type="button"
                          className="review-btn-approve"
                          onClick={() => handleOpenApprove(req)}
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          className="review-btn-reject"
                          onClick={() => handleOpenReject(req)}
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <div className="review-mobile-reviewed-foot">
                        Reviewed on {formatDate(req.reviewed_at)}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. Approve Confirmation Modal */}
      {showApproveModal && selectedApproveRequest && (
        <div className="review-modal-backdrop" role="dialog" aria-modal="true">
          <div className="review-modal-box">
            <div className="review-modal-header">
              <div className="review-modal-icon-badge emerald">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <h3 className="review-modal-title">Approve Verification</h3>
              <p className="review-modal-subtitle">
                <strong>{selectedApproveRequest.skill?.name}</strong> for{' '}
                <strong>{selectedApproveRequest.student?.name}</strong>
              </p>
              <button
                type="button"
                className="review-modal-close-btn"
                onClick={handleCloseApprove}
                disabled={actionLoading}
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="review-modal-body">
              <p className="text-secondary small mb-3">
                This action will mark the student's submission as <strong>Approved</strong> and
                issue a permanent digital badge stamped with course snapshot data into their
                Skill Passport.
              </p>

              {actionError && (
                <div className="alert alert-danger py-2 small mb-0">
                  <span className="material-symbols-outlined me-1 align-middle text-[18px]">
                    error
                  </span>
                  {actionError}
                </div>
              )}
            </div>

            <div className="review-modal-footer">
              <button
                type="button"
                className="review-modal-btn-cancel"
                onClick={handleCloseApprove}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="review-modal-btn-approve"
                onClick={handleConfirmApprove}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Issuing Badge...
                  </>
                ) : (
                  'Approve & Issue Badge'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Reject Modal with Feedback */}
      {showRejectModal && selectedRejectRequest && (
        <div className="review-modal-backdrop" role="dialog" aria-modal="true">
          <div className="review-modal-box">
            <div className="review-modal-header">
              <div className="review-modal-icon-badge red">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </div>
              <h3 className="review-modal-title">Reject Verification</h3>
              <p className="review-modal-subtitle">
                <strong>{selectedRejectRequest.skill?.name}</strong> —{' '}
                {selectedRejectRequest.student?.name}
              </p>
              <button
                type="button"
                className="review-modal-close-btn"
                onClick={handleCloseReject}
                disabled={actionLoading}
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="review-modal-body">
                {actionError && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <span className="material-symbols-outlined me-1 align-middle text-[18px]">
                      error
                    </span>
                    {actionError}
                  </div>
                )}

                <label htmlFor="feedback" className="form-label fw-semibold text-dark small mb-1">
                  Feedback for Student <span className="text-danger">*</span>
                </label>
                <textarea
                  id="feedback"
                  rows={4}
                  className={`form-control form-control-sm ${feedbackError ? 'is-invalid' : ''}`}
                  placeholder="Explain what the student needs to improve or provide in their evidence..."
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (feedbackError) setFeedbackError(null);
                  }}
                  disabled={actionLoading}
                ></textarea>
                {feedbackError && (
                  <div className="invalid-feedback">{feedbackError}</div>
                )}

                <p className="text-muted small mt-2 mb-0 d-flex align-items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>This feedback will be visible to the student to help them resubmit.</span>
                </p>
              </div>

              <div className="review-modal-footer">
                <button
                  type="button"
                  className="review-modal-btn-cancel"
                  onClick={handleCloseReject}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="review-modal-btn-reject"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Rejecting...
                    </>
                  ) : (
                    'Reject Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationReviewPage;
