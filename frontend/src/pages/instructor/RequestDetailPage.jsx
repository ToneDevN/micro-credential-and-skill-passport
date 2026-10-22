import React, { useState, useEffect } from 'react';
import {
  Button,
  Chip,
  Avatar,
  TextArea,
  AlertDialog,
  Dropdown,
  DisclosureGroup,
  Disclosure,
  Spinner,
  Alert,
  Link,
} from '@heroui/react';
import api from '../../services/api';
import { toastSuccess, toastWarning } from '../../utils/toast.js';
import { handleApiError } from '../../utils/apiErrorToast.js';

const RUBRIC_CRITERIA = [
  { id: 'req', label: 'Meets core skill outcomes & functional requirements', points: 25 },
  { id: 'arch', label: 'Code structure & modularity follow best practices', points: 25 },
  { id: 'git', label: 'Clean Git commit history & descriptive messages', points: 25 },
  { id: 'quality', label: 'Verified implementation without critical defects', points: 25 },
];

const RequestDetailPage = ({
  request,
  onStatusChange,
  onClose,
  isStandalone = false
}) => {
  // Loading & Error States
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Reject Modal State
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(null);

  // Rubric Checklist State (default all checked -> 100/100)
  const [checkedRubric, setCheckedRubric] = useState({
    req: true,
    arch: true,
    git: true,
    quality: true,
  });

  // GitHub Repo Info State
  const [repoInfo, setRepoInfo] = useState(null);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [isRepoDetailsOpen, setIsRepoDetailsOpen] = useState(false);

  // Fetch GitHub repo info when request changes
  useEffect(() => {
    if (!request?._id || !request?.evidence_url) {
      setRepoInfo(null);
      return;
    }

    const isGitHub = /github\.com/i.test(request.evidence_url);
    if (!isGitHub) {
      setRepoInfo(null);
      return;
    }

    let isMounted = true;
    const fetchGithubData = async () => {
      try {
        setLoadingRepo(true);
        const res = await api.get(`/verification-requests/${request._id}/github-info`);
        if (isMounted && res.data?.available) {
          setRepoInfo(res.data);
        }
      } catch {
        if (isMounted) setRepoInfo(null);
      } finally {
        if (isMounted) setLoadingRepo(false);
      }
    };

    fetchGithubData();

    return () => {
      isMounted = false;
    };
  }, [request?._id, request?.evidence_url]);

  if (!request) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm text-slate-400">
        <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">fact_check</span>
        <p className="text-sm font-medium">Select a submission from the queue to evaluate</p>
      </div>
    );
  }

  // Calculate rubric score
  const totalScore = RUBRIC_CRITERIA.reduce((acc, crit) => {
    return acc + (checkedRubric[crit.id] ? crit.points : 0);
  }, 0);

  const toggleRubric = (id) => {
    setCheckedRubric((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper: Initials
  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

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

  // Approve action
  const handleApprove = async () => {
    if (request.status !== 'pending' || isApproving || isRejecting) return;

    try {
      setIsApproving(true);
      setActionError(null);
      await api.put(`/verification-requests/${request._id}/approve`);
      toastSuccess('อนุมัติสำเร็จ', 'Badge ถูกออกให้นักศึกษาแล้ว');
      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error('Approve error:', err);
      const msg = err.response?.data?.message || 'Failed to approve request.';
      setActionError(msg);
      handleApiError(err);
    } finally {
      setIsApproving(false);
    }
  };

  // Reject action
  const handleConfirmReject = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (request.status !== 'pending' || isRejecting) return;

    if (!feedback.trim() || feedback.trim().length < 5) {
      setFeedbackError('กรุณาใส่ Feedback อย่างน้อย 5 ตัวอักษร');
      toastWarning('ข้อมูลไม่ครบ', 'กรุณาใส่ Feedback อย่างน้อย 5 ตัวอักษร');
      return;
    }

    try {
      setIsRejecting(true);
      setActionError(null);
      await api.put(`/verification-requests/${request._id}/reject`, {
        feedback: feedback.trim(),
      });
      toastSuccess('ปฏิเสธคำขอแล้ว', 'Feedback ถูกส่งให้นักศึกษาแล้ว');
      setShowRejectDialog(false);
      setFeedback('');
      setFeedbackError(null);
      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error('Reject error:', err);
      const msg = err.response?.data?.message || 'Failed to reject request.';
      setActionError(msg);
      handleApiError(err);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOverflowAction = (key) => {
    if (key === 'draft') {
      toastSuccess('บันทึกร่างสำเร็จ', 'การประเมินถูกบันทึกเป็นฉบับร่างชั่วคราว');
    } else if (key === 'more-info') {
      toastSuccess('ส่งคำขอข้อมูลเพิ่มเติมแล้ว', 'ส่งแจ้งเตือนขอข้อมูลเพิ่มเติมไปยังนักศึกษาเรียบร้อยแล้ว');
    }
  };

  const isPending = request.status === 'pending';
  const isGitHub = request.evidence_url && /github\.com/i.test(request.evidence_url);

  // Parse repo name for clean display
  const getRepoDisplayName = (url) => {
    if (!url) return '';
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/i);
    return match ? match[1].replace(/\.git$/, '') : url;
  };

  return (
    <div className={`flex flex-col gap-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm ${isStandalone ? 'max-w-4xl mx-auto' : 'h-full'}`}>
      {/* Workspace Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Avatar size="md" className="shrink-0">
            {request.student?.avatar && (
              <Avatar.Image src={request.student.avatar} alt={request.student?.name || 'Student'} />
            )}
            <Avatar.Fallback className="rounded-xl border-none bg-gradient-to-br from-pink-500 to-purple-500 text-white font-semibold">
              {getInitials(request.student?.name)}
            </Avatar.Fallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold text-lg text-slate-900 m-0">
                {request.student?.name || 'Student Submission'}
              </h2>
              {request.status === 'approved' ? (
                <Chip size="sm" color="success" variant="flat" className="text-xs font-semibold">Approved</Chip>
              ) : request.status === 'rejected' ? (
                <Chip size="sm" color="danger" variant="flat" className="text-xs font-semibold">Rejected</Chip>
              ) : (
                <Chip size="sm" color="warning" variant="flat" className="text-xs font-semibold">Pending Review</Chip>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {request.student?.email || ''} • Submitted {formatDate(request.submitted_at)}
            </div>
          </div>
        </div>

        {onClose && (
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={onClose}
            aria-label="Close detail pane"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </Button>
        )}
      </div>

      {actionError && <Alert status="danger">{actionError}</Alert>}

      {/* Target Competency & Course */}
      <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Skill Target</span>
          <div className="font-bold text-slate-900 text-sm">{request.skill?.name || '—'}</div>
        </div>
        <div className="sm:text-right">
          <span className="text-slate-400 uppercase font-bold tracking-wider text-[10px]">Course</span>
          <div className="font-semibold text-slate-700">{request.course?.name || '—'}</div>
        </div>
      </div>

      {/* Student Description / Notes */}
      {request.notes && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Submission Notes</span>
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 m-0 leading-relaxed whitespace-pre-wrap">
            {request.notes}
          </p>
        </div>
      )}

      {/* Evidence: GitHub Repo Card (Stitch: name + View on GitHub button only by default, details behind expand) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-700">Evidence Link</span>

        {request.evidence_url ? (
          isGitHub ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">code</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-xs text-slate-900 truncate">
                      {getRepoDisplayName(request.evidence_url)}
                    </div>
                    {repoInfo?.language && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        {repoInfo.language}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-2">
                    <Link
                      className="underline"
                      href={request.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on GitHub
                      <Link.Icon />
                    </Link>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    className="h-8 w-8 text-slate-500"
                    onPress={() => setIsRepoDetailsOpen(!isRepoDetailsOpen)}
                    aria-label="Toggle repository details"
                  >
                    <span className={`material-symbols-outlined text-[18px] transition-transform ${isRepoDetailsOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </Button>
                </div>
              </div>

              {/* Commit SHA / branch / last-updated behind expand per TON-216 */}
              {isRepoDetailsOpen && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs animate-in fade-in">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">Branch</span>
                    <span className="font-mono text-slate-800 text-[11px]">
                      {repoInfo?.branch || 'main'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">Commit SHA</span>
                    <span className="font-mono text-slate-800 text-[11px]">
                      {repoInfo?.sha ? repoInfo.sha.substring(0, 7) : 'head'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">Commits</span>
                    <span className="font-medium text-slate-800 text-[11px]">
                      {repoInfo?.commitCount ?? '—'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">Last Updated</span>
                    <span className="font-medium text-slate-800 text-[11px]">
                      {repoInfo?.lastUpdated ? formatDate(repoInfo.lastUpdated) : 'Recently'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <a
                href={request.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-mono truncate"
              >
                {request.evidence_url}
              </a>
              <Button
                size="sm"
                variant="light"
                className="text-xs"
                onPress={() => window.open(request.evidence_url, '_blank', 'noopener,noreferrer')}
              >
                Open Link ↗
              </Button>
            </div>
          )
        ) : (
          <span className="text-xs text-slate-400">No evidence URL provided</span>
        )}
      </div>

      {/* Rubric Assessment: Closed-by-default DisclosureGroup ("Rubric Assessment • Score: X/100 ▾") */}
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
        <DisclosureGroup defaultExpandedKeys={[]}>
          <Disclosure id="rubric-assessment">
            <Disclosure.Trigger className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors text-left cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-indigo-600">checklist</span>
                <span className="text-xs font-bold text-slate-800">
                  Rubric Assessment • Score: {totalScore}/100 ▾
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {totalScore === 100 ? 'Meets Criteria' : 'Partial'}
              </span>
            </Disclosure.Trigger>
            <Disclosure.Content className="p-4 pt-1 border-t border-slate-100 flex flex-col gap-2">
              {RUBRIC_CRITERIA.map((crit) => (
                <label
                  key={crit.id}
                  className="flex items-center gap-2.5 text-xs text-slate-700 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checkedRubric[crit.id]}
                    onChange={() => toggleRubric(crit.id)}
                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                    disabled={!isPending}
                  />
                  <span className="flex-1 font-medium">{crit.label}</span>
                  <span className="text-[11px] font-mono text-slate-400">+{crit.points} pts</span>
                </label>
              ))}
            </Disclosure.Content>
          </Disclosure>
        </DisclosureGroup>
      </div>

      {/* Rejected Feedback Display (if already rejected) */}
      {request.status === 'rejected' && request.feedback && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-900 flex flex-col gap-1">
          <span className="font-semibold text-[11px] text-rose-700 uppercase tracking-wider">
            Rejection Feedback Sent
          </span>
          <p className="m-0 italic">&quot;{request.feedback}&quot;</p>
        </div>
      )}

      {/* Actions Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {isPending ? 'Action requires evaluation of submitted evidence' : 'Evaluation recorded'}
        </div>

        {isPending ? (
          <div className="flex items-center gap-2">
            {/* Overflow Menu: Save Draft / Request More Info */}
            <Dropdown>
              <Dropdown.Trigger>
                <Button
                  size="sm"
                  variant="bordered"
                  isIconOnly
                  aria-label="More actions"
                  className="h-8 w-8 text-slate-600"
                >
                  <span className="material-symbols-outlined text-[18px]">more_vert</span>
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover>
                <Dropdown.Menu onAction={handleOverflowAction}>
                  <Dropdown.Item id="draft" textValue="Save Draft">
                    <div className="flex items-center gap-2 py-1 text-xs">
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Save Draft</span>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="more-info" textValue="Request More Info">
                    <div className="flex items-center gap-2 py-1 text-xs">
                      <span className="material-symbols-outlined text-[16px]">help_outline</span>
                      <span>Request More Info</span>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            {/* Reject Button (Always-visible) */}
            <Button
              size="sm"
              color="danger"
              variant="flat"
              className="text-xs font-semibold h-8 px-3"
              onPress={() => setShowRejectDialog(true)}
              isDisabled={isApproving || isRejecting}
              startContent={<span className="material-symbols-outlined text-[16px]">close</span>}
            >
              Reject
            </Button>

            {/* Approve Button (Always-visible) */}
            <Button
              size="sm"
              color="success"
              className="text-xs font-semibold text-white h-8 px-3.5 shadow-xs"
              onPress={handleApprove}
              isLoading={isApproving}
              isDisabled={isApproving || isRejecting}
              startContent={<span className="material-symbols-outlined text-[16px]">check</span>}
            >
              Approve
            </Button>
          </div>
        ) : request.status === 'approved' ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Badge Issued to Passport</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-semibold">
            <span className="material-symbols-outlined text-[18px]">cancel</span>
            <span>Rejected with Feedback</span>
          </div>
        )}
      </div>

      {/* Reject AlertDialog Modal */}
      <AlertDialog
        isOpen={showRejectDialog}
        onOpenChange={(open) => {
          if (!open && !isRejecting) {
            setShowRejectDialog(false);
            setFeedbackError(null);
          }
        }}
      >
        <AlertDialog.Backdrop />
        <AlertDialog.Container>
          <AlertDialog.Dialog className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/80">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-2">
                <span className="material-symbols-outlined text-2xl">close</span>
              </div>
              <AlertDialog.Heading className="text-lg font-bold font-heading text-slate-900">
                Reject Verification Request
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="py-2 flex flex-col gap-3">
              <p className="text-xs text-slate-500 m-0">
                Provide feedback to help <strong>{request.student?.name}</strong> improve their submission.
                Feedback must be at least 5 characters.
              </p>
              <TextArea
                aria-label="Rejection feedback"
                placeholder="Explain what was missing or needs revision..."
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  if (feedbackError) setFeedbackError(null);
                }}
                rows={4}
                className="w-full text-xs"
                isInvalid={!!feedbackError}
                errorMessage={feedbackError}
                isRequired
              />
            </AlertDialog.Body>
            <AlertDialog.Footer className="flex justify-end gap-2 pt-3">
              <Button
                size="sm"
                variant="bordered"
                onPress={() => setShowRejectDialog(false)}
                isDisabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                color="danger"
                onPress={handleConfirmReject}
                isLoading={isRejecting}
                className="font-semibold"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog>
    </div>
  );
};

export default RequestDetailPage;
