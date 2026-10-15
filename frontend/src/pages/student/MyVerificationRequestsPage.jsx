import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Spinner,
  Table,
  Button,
  Chip,
  Alert,
  Modal,
  Input,
  Pagination,
  Tooltip
} from '@heroui/react';
import api from '../../services/api';
import GithubRepoPickerModal from '../../components/GithubRepoPickerModal';
import { toastSuccess } from '../../utils/toast.js';
import { handleApiError } from '../../utils/apiErrorToast.js';

const MyVerificationRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const [isRepoPickerOpen, setIsRepoPickerOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0, expired: 0 });

  const fetchRequests = useCallback(async (targetPage = page, status = activeFilter) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: targetPage,
        limit: 10,
      };
      if (status && status !== 'all') {
        params.status = status;
      }
      const res = await api.get('/verification-requests/my', { params });
      setRequests(res.data.data || res.data.requests || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || targetPage);
      setTotalPages(res.data.totalPages || 1);
      if (res.data.counts) {
        setCounts((prev) => ({ ...prev, ...res.data.counts }));
      }
    } catch (err) {
      console.error('Failed to fetch verification requests', err);
      setError('Unable to load verification requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => {
    fetchRequests(1, activeFilter);
  }, []);

  const handleTabChange = (filter) => {
    setActiveFilter(filter);
    setPage(1);
    fetchRequests(1, filter);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      fetchRequests(newPage, activeFilter);
    }
  };

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

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <Chip size="sm" color="success" variant="flat" className="text-xs font-semibold">
            Approved
          </Chip>
        );
      case 'pending':
        return (
          <Chip size="sm" color="warning" variant="flat" className="text-xs font-medium">
            Pending
          </Chip>
        );
      case 'rejected':
        return (
          <Chip size="sm" color="danger" variant="flat" className="text-xs font-medium">
            Rejected
          </Chip>
        );
      case 'expired':
        return (
          <Chip size="sm" color="danger" variant="flat" className="text-xs font-medium">
            Expired
          </Chip>
        );
      default:
        return (
          <Chip size="sm" variant="flat" className="text-xs">
            {status}
          </Chip>
        );
    }
  };

  // Modal Handlers
  const openEditModal = (req) => {
    setEditModalItem(req);
    setEditEvidenceUrl(req.evidenceUrl || '');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editEvidenceUrl.trim()) {
      setEditError('Evidence URL is required');
      return;
    }
    try {
      new URL(editEvidenceUrl.trim());
    } catch {
      setEditError('Please enter a valid URL');
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      await api.put(`/verification-requests/${editModalItem._id}`, {
        evidenceUrl: editEvidenceUrl.trim(),
      });
      toastSuccess('Updated evidence URL successfully');
      setEditModalItem(null);
      fetchRequests(page, activeFilter);
    } catch (err) {
      console.error('Failed to update request', err);
      setEditError(err.response?.data?.message || 'Failed to update request');
      handleApiError(err);
    } finally {
      setEditLoading(false);
    }
  };

  const openCancelModal = (req) => {
    setCancelModalItem(req);
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    try {
      setCancelLoading(true);
      setCancelError(null);
      await api.delete(`/verification-requests/${cancelModalItem._id}`);
      toastSuccess('Cancelled verification request');
      setCancelModalItem(null);
      fetchRequests(page, activeFilter);
    } catch (err) {
      console.error('Failed to cancel request', err);
      setCancelError(err.response?.data?.message || 'Failed to cancel request');
      handleApiError(err);
    } finally {
      setCancelLoading(false);
    }
  };

  const openResubmitModal = (req) => {
    setResubmitModalItem(req);
    setResubmitEvidenceUrl(req.evidenceUrl || '');
    setResubmitError(null);
  };

  const handleConfirmResubmit = async () => {
    if (!resubmitEvidenceUrl.trim()) {
      setResubmitError('Evidence URL is required');
      return;
    }
    try {
      new URL(resubmitEvidenceUrl.trim());
    } catch {
      setResubmitError('Please enter a valid URL');
      return;
    }

    try {
      setResubmitLoading(true);
      setResubmitError(null);
      await api.post(`/verification-requests/${resubmitModalItem._id}/resubmit`, {
        evidenceUrl: resubmitEvidenceUrl.trim(),
      });
      toastSuccess('Resubmitted verification request successfully');
      setResubmitModalItem(null);
      fetchRequests(page, activeFilter);
    } catch (err) {
      console.error('Failed to resubmit request', err);
      setResubmitError(err.response?.data?.message || 'Failed to resubmit request');
      handleApiError(err);
    } finally {
      setResubmitLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
              My Verification Requests
            </h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">
              Track the status of your submitted evidence and instructor approvals
            </p>
          </div>

          <Button
            as={Link}
            to="/student/submit-verification"
            color="primary"
            className="font-medium shadow-sm shrink-0 self-start sm:self-auto"
            startContent={<span className="material-symbols-outlined text-[18px]">add</span>}
          >
            Submit New Request
          </Button>
        </header>

        {/* Global Feedback Banners */}
        {error && <Alert status="danger">{error}</Alert>}

        {/* Filter Tabs (without separate redundant summary metric cards) */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'approved', label: 'Approved', count: counts.approved },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
            { id: 'expired', label: 'Expired', count: counts.expired },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeFilter === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${activeFilter === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200/70 text-slate-600'
                  }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-500 text-sm m-0">Loading your verification requests...</p>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State per TON-213: centered icon + "No verification requests yet" + "Explore skills to get started" + CTA linking to /explore */
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm max-w-lg mx-auto flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
              <span className="material-symbols-outlined text-3xl">assignment_late</span>
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 m-0">
              No verification requests yet
            </h3>
            <p className="text-xs text-slate-500 m-0 max-w-xs leading-relaxed">
              Explore skills to get started and submit evidence to build your credential passport.
            </p>
            <Button
              as={Link}
              to="/explore"
              color="primary"
              className="mt-2 font-medium"
            >
              Explore Skills
            </Button>
          </div>
        ) : (
          /* HeroUI Table component */
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="My Verification Requests" className="min-w-[700px]">
                  <Table.Header>
                    <Table.Column isRowHeader className="py-3 px-4 font-semibold text-xs text-slate-700">Skill & Assessor</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Course</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Submitted</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Evidence</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Status</Table.Column>
                    <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700 text-right">Actions</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {requests.map((req) => {
                      const assessorName = req.reviewedBy?.name || req.instructor?.name || 'Assigned Instructor';
                      const skillTitle = req.skillName || req.skill?.name || 'Untitled Skill';
                      const courseTitle = req.courseName || req.course?.name || 'General';
                      const isVerified = req.status === 'approved';
                      const ledgerUrl = req.ledgerUrl || req.transactionUrl;

                      return (
                        <Table.Row key={req._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          {/* Skill + Muted Assessor row per TON-213 */}
                          <Table.Cell className="py-3 px-4">
                            <div className="font-semibold text-sm text-slate-900">{skillTitle}</div>
                            <div className="text-xs text-slate-400 mt-0.5">Assessor: {assessorName}</div>
                          </Table.Cell>

                          <Table.Cell className="py-3 px-4 text-xs text-slate-600 font-medium">
                            {courseTitle}
                          </Table.Cell>

                          <Table.Cell className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(req.submittedAt || req.createdAt)}
                          </Table.Cell>

                          <Table.Cell className="py-3 px-4 text-xs">
                            {req.evidenceUrl ? (
                              <a
                                href={req.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline max-w-[140px] truncate block"
                                title={req.evidenceUrl}
                              >
                                View Evidence ↗
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </Table.Cell>

                          {/* Status column + ledger link on verified rows */}
                          <Table.Cell className="py-3 px-4">
                            <div className="flex flex-col items-start gap-1">
                              {renderStatusBadge(req.status)}
                              {isVerified && (
                                ledgerUrl ? (
                                  <a
                                    href={ledgerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <span>Verified on ledger ↗</span>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-emerald-600">Verified on ledger</span>
                                )
                              )}
                            </div>
                          </Table.Cell>

                          <Table.Cell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {req.status === 'pending' && (
                                <>
                                  <Tooltip delay={0}>
                                    <Tooltip.Trigger
                                      aria-label="Edit evidence URL"
                                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                      onClick={() => openEditModal(req)}
                                    >
                                      <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-700 shadow-sm">
                                      <p className="m-0">Edit Evidence</p>
                                    </Tooltip.Content>
                                  </Tooltip>

                                  <Tooltip delay={0}>
                                    <Tooltip.Trigger
                                      aria-label="Cancel request"
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      onClick={() => openCancelModal(req)}
                                    >
                                      <span className="material-symbols-outlined text-[18px]">close</span>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-700 shadow-sm">
                                      <p className="m-0">Cancel Request</p>
                                    </Tooltip.Content>
                                  </Tooltip>
                                </>
                              )}

                              {req.status === 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs h-7 px-2.5 text-rose-600 hover:text-rose-700"
                                  onPress={() => openResubmitModal(req)}
                                >
                                  Re-submit
                                </Button>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Showing page {page} of {totalPages} ({total} total)
                </span>
                <Pagination>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={page <= 1}
                        onPress={() => handlePageChange(page - 1)}
                      >
                        <Pagination.PreviousIcon />
                        <span>Previous</span>
                      </Pagination.Previous>
                    </Pagination.Item>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          onPress={() => handlePageChange(p)}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    ))}
                    <Pagination.Item>
                      <Pagination.Next
                        isDisabled={page >= totalPages}
                        onPress={() => handlePageChange(page + 1)}
                      >
                        <span>Next</span>
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </div>
            )}
          </div>
        )}

        {/* Edit Evidence Modal */}
        <Modal isOpen={!!editModalItem} onOpenChange={(open) => !open && setEditModalItem(null)}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-md">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading className="text-base font-bold text-slate-900 m-0">Edit Evidence URL</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="p-4 flex flex-col gap-3">
                  {editError && <Alert status="danger" className="text-xs">{editError}</Alert>}
                  <p className="text-xs text-slate-500 m-0">
                    Update the repository or evidence link for {editModalItem?.skillName || 'this skill'}:
                  </p>
                  <Input
                    type="url"
                    value={editEvidenceUrl}
                    onChange={(e) => setEditEvidenceUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full text-xs"
                    autoFocus
                  />
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2 p-3 border-t border-slate-100">
                  <Button size="sm" variant="secondary" onPress={() => setEditModalItem(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" color="primary" isLoading={editLoading} onPress={handleSaveEdit}>
                    Save Changes
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        {/* Cancel Request Modal */}
        <Modal isOpen={!!cancelModalItem} onOpenChange={(open) => !open && setCancelModalItem(null)}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-md">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading className="text-base font-bold text-slate-900 m-0">Cancel Verification Request</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="p-4 flex flex-col gap-2">
                  {cancelError && <Alert status="danger" className="text-xs">{cancelError}</Alert>}
                  <p className="text-xs text-slate-600 m-0 leading-relaxed">
                    Are you sure you want to cancel the verification request for{' '}
                    <strong>{cancelModalItem?.skillName}</strong>? This action cannot be undone.
                  </p>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2 p-3 border-t border-slate-100">
                  <Button size="sm" variant="secondary" onPress={() => setCancelModalItem(null)}>
                    Keep Request
                  </Button>
                  <Button size="sm" color="danger" isLoading={cancelLoading} onPress={handleConfirmCancel}>
                    Confirm Cancel
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        {/* Resubmit Request Modal */}
        <Modal isOpen={!!resubmitModalItem} onOpenChange={(open) => !open && setResubmitModalItem(null)}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-md">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading className="text-base font-bold text-slate-900 m-0">Re-submit Verification Request</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="p-4 flex flex-col gap-3">
                  {resubmitError && <Alert status="danger" className="text-xs">{resubmitError}</Alert>}
                  <p className="text-xs text-slate-500 m-0">
                    Provide updated evidence for {resubmitModalItem?.skillName}:
                  </p>
                  <Input
                    type="url"
                    value={resubmitEvidenceUrl}
                    onChange={(e) => setResubmitEvidenceUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full text-xs"
                    autoFocus
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onPress={() => setIsRepoPickerOpen(true)}
                    >
                      Pick from GitHub
                    </Button>
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2 p-3 border-t border-slate-100">
                  <Button size="sm" variant="secondary" onPress={() => setResubmitModalItem(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" color="primary" isLoading={resubmitLoading} onPress={handleConfirmResubmit}>
                    Re-submit
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        {/* GitHub Repo Picker for Resubmit */}
        <GithubRepoPickerModal
          isOpen={isRepoPickerOpen}
          onClose={() => setIsRepoPickerOpen(false)}
          onSelect={(repo) => {
            setResubmitEvidenceUrl(repo.html_url);
            setIsRepoPickerOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default MyVerificationRequestsPage;
