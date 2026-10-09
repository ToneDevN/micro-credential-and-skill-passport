import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Verification.css';

const MyVerificationRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Active filter tab ('all', 'pending', 'approved', 'rejected', 'expired')
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal states
  const [editModalItem, setEditModalItem] = useState(null);
  const [editEvidenceUrl, setEditEvidenceUrl] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const [resubmitModalItem, setResubmitModalItem] = useState(null);
  const [resubmitEvidenceUrl, setResubmitEvidenceUrl] = useState('');
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitError, setResubmitError] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/verification-requests/my');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch verification requests', err);
      setError('Unable to load verification requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Compute status counts for tabs
  const counts = useMemo(() => {
    const c = { all: requests.length, pending: 0, approved: 0, rejected: 0, expired: 0 };
    requests.forEach((r) => {
      const st = r.status?.toLowerCase();
      if (st && c[st] !== undefined) {
        c[st] += 1;
      }
    });
    return c;
  }, [requests]);

  // Filter requests based on selected tab
  const filteredRequests = useMemo(() => {
    if (activeFilter === 'all') return requests;
    return requests.filter((r) => r.status?.toLowerCase() === activeFilter);
  }, [requests, activeFilter]);

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

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditModalItem(item);
    setEditEvidenceUrl(item.evidenceUrl || '');
    setEditError(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editModalItem) return;

    if (!editEvidenceUrl.trim()) {
      setEditError('Evidence URL is required.');
      return;
    }

    try {
      new URL(editEvidenceUrl.trim());
    } catch {
      setEditError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      await api.put(`/verification-requests/${editModalItem._id}`, {
        evidenceUrl: editEvidenceUrl.trim(),
      });

      setSuccessMessage(`Updated evidence URL for ${editModalItem.skillName}`);
      setEditModalItem(null);
      await fetchRequests();
    } catch (err) {
      console.error('Edit request failed', err);
      setEditError(err.response?.data?.message || 'Failed to update request.');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Cancel Modal
  const openCancelModal = (item) => {
    setCancelModalItem(item);
    setCancelError(null);
  };

  // Handle Cancel Submit
  const handleCancelSubmit = async () => {
    if (!cancelModalItem) return;

    try {
      setCancelLoading(true);
      setCancelError(null);
      await api.delete(`/verification-requests/${cancelModalItem._id}`);

      setSuccessMessage(`Cancelled verification request for ${cancelModalItem.skillName}`);
      setCancelModalItem(null);
      await fetchRequests();
    } catch (err) {
      console.error('Cancel request failed', err);
      setCancelError(err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Resubmit Modal
  const openResubmitModal = (item) => {
    setResubmitModalItem(item);
    setResubmitEvidenceUrl(item.evidenceUrl || '');
    setResubmitError(null);
  };

  // Handle Resubmit Submit
  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    if (!resubmitModalItem) return;

    if (!resubmitEvidenceUrl.trim()) {
      setResubmitError('Evidence URL is required.');
      return;
    }

    try {
      new URL(resubmitEvidenceUrl.trim());
    } catch {
      setResubmitError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    try {
      setResubmitLoading(true);
      setResubmitError(null);
      const targetId = resubmitModalItem.studentSkillStatusId || resubmitModalItem._id;
      await api.post(`/verification-requests/${targetId}/resubmit`, {
        evidenceUrl: resubmitEvidenceUrl.trim(),
      });

      setSuccessMessage(`Re-submitted verification request for ${resubmitModalItem.skillName}`);
      setResubmitModalItem(null);
      await fetchRequests();
    } catch (err) {
      console.error('Resubmit failed', err);
      setResubmitError(err.response?.data?.message || 'Failed to resubmit request.');
    } finally {
      setResubmitLoading(false);
    }
  };

  // Helper for status badge rendering
  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return (
          <span className="verification-badge pending">
            <span className="verification-pulse-dot animate-pulse"></span>
            <span>Pending</span>
          </span>
        );
      case 'approved':
        return (
          <span className="verification-badge approved">
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="verification-badge rejected">
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
            <span>Rejected</span>
          </span>
        );
      case 'expired':
        return (
          <span className="verification-badge expired">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            <span>Expired</span>
          </span>
        );
      default:
        return (
          <span className="verification-badge expired">
            <span>{status || 'Unknown'}</span>
          </span>
        );
    }
  };

  return (
    <div className="verification-canvas">
      <div className="verification-container">
        {/* 1. Page Header Row */}
        <div className="verification-history-header">
          <div>
            <h1 className="verification-title">My Verification Requests</h1>
            <p className="verification-subtitle">Track your skill verification submissions</p>
          </div>
          <Link to="/student/submit-verification" className="verification-btn-new">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Submit New Request</span>
          </Link>
        </div>

        {/* Global Feedback Banners */}
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

        {/* 2. Filter Tabs */}
        <div className="verification-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'all'}
            className={`verification-tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>All</span>
            <span className="verification-tab-count">{counts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'pending'}
            className={`verification-tab-btn ${activeFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pending')}
          >
            <span>Pending</span>
            <span className="verification-tab-count">{counts.pending}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'approved'}
            className={`verification-tab-btn ${activeFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveFilter('approved')}
          >
            <span>Approved</span>
            <span className="verification-tab-count">{counts.approved}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'rejected'}
            className={`verification-tab-btn ${activeFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveFilter('rejected')}
          >
            <span>Rejected</span>
            <span className="verification-tab-count">{counts.rejected}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'expired'}
            className={`verification-tab-btn ${activeFilter === 'expired' ? 'active' : ''}`}
            onClick={() => setActiveFilter('expired')}
          >
            <span>Expired</span>
            <span className="verification-tab-count">{counts.expired}</span>
          </button>
        </div>

        {/* 3. Cards List */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading requests...</span>
            </div>
            <p className="text-muted mt-2 text-sm">Loading your verification requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="verification-card text-center py-5">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 d-inline-flex align-items-center justify-content-center mb-3">
              <span className="material-symbols-outlined text-[28px]">assignment</span>
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-1">
              {activeFilter === 'all'
                ? 'No verification requests submitted yet'
                : `No ${activeFilter} requests`}
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
              {activeFilter === 'all'
                ? 'Start by submitting evidence of competency for skills taught in your courses.'
                : `There are currently no requests with "${activeFilter}" status.`}
            </p>
            <Link to="/student/submit-verification" className="verification-btn-new d-inline-flex">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Submit Request</span>
            </Link>
          </div>
        ) : (
          <div className="verification-cards-list">
            {filteredRequests.map((req) => (
              <div
                key={req._id}
                className={`verification-item-card ${req.status}`}
                data-status={req.status}
              >
                {/* Top Row: Skill title & Status badge */}
                <div className="verification-card-top">
                  <h2 className="verification-card-skill-title">{req.skillName}</h2>
                  {renderStatusBadge(req.status)}
                </div>

                {/* Second Row: Course name • Submitted date */}
                <div className="verification-card-meta">
                  <span className="course-name">{req.courseName}</span>
                  <span className="dot-sep">•</span>
                  <span>Submitted {formatDate(req.submittedAt)}</span>
                </div>

                {/* Third Row: Evidence URL */}
                {req.evidenceUrl && (
                  <div className="verification-card-evidence">
                    <a
                      href={req.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="verification-evidence-link"
                    >
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      <span>{req.evidenceUrl}</span>
                    </a>
                  </div>
                )}

                {/* Expandable Feedback Section (for Approved / Rejected) */}
                {req.feedback && (
                  <div className={`verification-feedback-box ${req.status}`}>
                    <div className="verification-feedback-header">
                      <div className="d-flex align-items-center gap-1.5 text-slate-800">
                        <span className="material-symbols-outlined text-[18px] text-primary">school</span>
                        <span>
                          Reviewed by {req.reviewedBy ? req.reviewedBy.name : 'Instructor'}
                        </span>
                      </div>
                      {req.reviewedAt && (
                        <span className="text-muted text-xs">{formatDate(req.reviewedAt)}</span>
                      )}
                    </div>
                    <p className="verification-feedback-text">“{req.feedback}”</p>
                  </div>
                )}

                {/* Bottom Row Action Buttons */}
                {req.status === 'pending' && (
                  <div className="verification-card-actions">
                    <button
                      type="button"
                      className="verification-action-btn"
                      onClick={() => openEditModal(req)}
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="verification-action-btn cancel"
                      onClick={() => openCancelModal(req)}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      <span>Cancel</span>
                    </button>
                  </div>
                )}

                {req.status === 'expired' && (
                  <div className="verification-card-actions">
                    <button
                      type="button"
                      className="verification-action-btn resubmit"
                      onClick={() => openResubmitModal(req)}
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      <span>Re-submit</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ================= EDIT MODAL ================= */}
        {editModalItem && (
          <div className="verification-modal-backdrop" role="dialog" aria-modal="true">
            <div className="verification-modal-box">
              <h3 className="verification-modal-title">Edit Evidence URL</h3>
              <p className="verification-modal-desc">
                Update your submitted evidence link for <strong>{editModalItem.skillName}</strong>.
              </p>

              {editError && (
                <div className="alert alert-danger py-2 px-3 text-xs mb-3">{editError}</div>
              )}

              <form onSubmit={handleEditSubmit}>
                <div className="verification-form-group">
                  <label className="verification-label" htmlFor="modal-edit-evidence">
                    Evidence URL
                  </label>
                  <div className="verification-input-wrap">
                    <div className="verification-input-icon">
                      <span className="material-symbols-outlined text-[18px]">link</span>
                    </div>
                    <input
                      id="modal-edit-evidence"
                      type="url"
                      className="verification-input"
                      value={editEvidenceUrl}
                      onChange={(e) => setEditEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                      required
                    />
                  </div>
                </div>

                <div className="verification-modal-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => setEditModalItem(null)}
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-3"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= CANCEL MODAL ================= */}
        {cancelModalItem && (
          <div className="verification-modal-backdrop" role="dialog" aria-modal="true">
            <div className="verification-modal-box">
              <h3 className="verification-modal-title text-danger">Cancel Verification Request?</h3>
              <p className="verification-modal-desc">
                Are you sure you want to cancel the request for{' '}
                <strong>{cancelModalItem.skillName}</strong>? Your skill status will be reverted to{' '}
                <em>not started</em>. This action cannot be undone.
              </p>

              {cancelError && (
                <div className="alert alert-danger py-2 px-3 text-xs mb-3">{cancelError}</div>
              )}

              <div className="verification-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setCancelModalItem(null)}
                  disabled={cancelLoading}
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3"
                  onClick={handleCancelSubmit}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= RESUBMIT MODAL ================= */}
        {resubmitModalItem && (
          <div className="verification-modal-backdrop" role="dialog" aria-modal="true">
            <div className="verification-modal-box">
              <h3 className="verification-modal-title">Re-submit Verification</h3>
              <p className="verification-modal-desc">
                Your competency verification for <strong>{resubmitModalItem.skillName}</strong> has
                expired. Provide an updated evidence link to be reviewed again.
              </p>

              {resubmitError && (
                <div className="alert alert-danger py-2 px-3 text-xs mb-3">{resubmitError}</div>
              )}

              <form onSubmit={handleResubmitSubmit}>
                <div className="verification-form-group">
                  <label className="verification-label" htmlFor="modal-resubmit-evidence">
                    New Evidence URL
                  </label>
                  <div className="verification-input-wrap">
                    <div className="verification-input-icon">
                      <span className="material-symbols-outlined text-[18px]">link</span>
                    </div>
                    <input
                      id="modal-resubmit-evidence"
                      type="url"
                      className="verification-input"
                      value={resubmitEvidenceUrl}
                      onChange={(e) => setResubmitEvidenceUrl(e.target.value)}
                      placeholder="https://..."
                      required
                    />
                  </div>
                </div>

                <div className="verification-modal-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => setResubmitModalItem(null)}
                    disabled={resubmitLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-3"
                    disabled={resubmitLoading}
                  >
                    {resubmitLoading ? 'Submitting...' : 'Re-submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVerificationRequestsPage;
