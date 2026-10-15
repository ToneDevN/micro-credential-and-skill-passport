import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Spinner,
  Button,
  Input,
  Alert
} from '@heroui/react';
import {
  getShareLink,
  regenerateShareLink,
  revokeShareLink,
} from '../services/passportService';

const SharePassportModal = ({ isOpen, onClose, badgeCount = 0 }) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'regenerate' | 'revoke' | null
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchLink = useCallback(async () => {
    if (badgeCount <= 0) return;
    setLoading(true);
    setError('');
    try {
      const data = await getShareLink();
      setShareData(data);
    } catch (err) {
      console.error('[SharePassportModal] load link error:', err);
      setError(err.response?.data?.message || 'ไม่สามารถสร้างลิงก์แชร์ได้ในขณะนี้');
    } finally {
      setLoading(false);
    }
  }, [badgeCount]);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setConfirmAction(null);
      setSuccessMsg('');
      fetchLink();
    }
  }, [isOpen, fetchLink]);

  const fullUrl = shareData?.publicUrl
    ? `${window.location.origin}${shareData.publicUrl}`
    : '';

  const handleCopy = async () => {
    if (!fullUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const el = document.createElement('textarea');
        el.value = fullUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleRegenerate = async () => {
    setActionLoading(true);
    setError('');
    try {
      const data = await regenerateShareLink();
      setShareData(data);
      setConfirmAction(null);
      setSuccessMsg('สร้างลิงก์ใหม่เรียบร้อยแล้ว ลิงก์เดิมจะไม่สามารถเข้าถึงได้อีก');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to regenerate link:', err);
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างลิงก์ใหม่');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    setActionLoading(true);
    setError('');
    try {
      await revokeShareLink();
      setShareData(null);
      setConfirmAction(null);
      setSuccessMsg('ยกเลิกการแชร์ Passport เรียบร้อยแล้ว');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to revoke link:', err);
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกการแชร์');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <span className="material-symbols-outlined text-2xl">share</span>
                </div>
                <div>
                  <Modal.Heading className="text-lg font-bold text-slate-900 m-0">Share Skill Passport</Modal.Heading>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Generate a public link to showcase your verified skills
                  </p>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="p-5 sm:p-6 flex flex-col gap-4">
              {error && <Alert status="danger" className="text-xs">{error}</Alert>}
              {successMsg && <Alert status="success" className="text-xs">{successMsg}</Alert>}

              {loading ? (
                <div className="text-center py-8 flex flex-col items-center justify-center gap-2">
                  <Spinner size="sm" color="primary" />
                  <span className="text-slate-500 text-xs">Preparing shareable link...</span>
                </div>
              ) : badgeCount <= 0 ? (
                <div className="text-center py-6 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-1">
                    <span className="material-symbols-outlined text-3xl">warning</span>
                  </div>
                  <h5 className="font-semibold text-slate-800 m-0">Sharing Not Available</h5>
                  <p className="text-slate-500 text-xs m-0 max-w-xs">
                    You must have earned at least 1 digital badge to share your Skill Passport.
                  </p>
                </div>
              ) : shareData?.publicUrl ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5" htmlFor="public-share-link">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">link</span>
                      <span>Public Passport URL</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="public-share-link"
                        type="text"
                        isReadOnly
                        value={fullUrl}
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        color={copied ? 'success' : 'primary'}
                        variant={copied ? 'secondary' : 'primary'}
                        onPress={handleCopy}
                        className="shrink-0 font-medium"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                      verified_user
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed m-0">
                      <strong>Public data:</strong> Student name, earned badges, and skill summary.
                      Private information like email and login details are never shared.
                    </p>
                  </div>

                  {confirmAction === 'regenerate' && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2">
                      <div className="text-xs font-bold text-amber-900">Generate new public link?</div>
                      <div className="text-xs text-amber-800 leading-relaxed">
                        The previous link will expire immediately and can no longer be accessed.
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => setConfirmAction(null)}
                          isDisabled={actionLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          color="primary"
                          isLoading={actionLoading}
                          onPress={handleRegenerate}
                        >
                          Confirm New Link
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmAction === 'revoke' && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-2">
                      <div className="text-xs font-bold text-rose-900">Revoke public access?</div>
                      <div className="text-xs text-rose-800 leading-relaxed">
                        All public access will be disabled immediately.
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => setConfirmAction(null)}
                          isDisabled={actionLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          isLoading={actionLoading}
                          onPress={handleRevoke}
                        >
                          Confirm Revoke
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 flex flex-col items-center gap-3">
                  <p className="text-slate-500 text-sm m-0">Your passport link is not yet created.</p>
                  <Button
                    color="primary"
                    size="sm"
                    onPress={fetchLink}
                    isLoading={loading}
                  >
                    Enable Public Link
                  </Button>
                </div>
              )}
            </Modal.Body>

            {shareData?.publicUrl && !confirmAction && (
              <Modal.Footer className="flex items-center justify-between p-4 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => setConfirmAction('revoke')}
                  isDisabled={actionLoading}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Revoke Link
                </Button>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setConfirmAction('regenerate')}
                    isDisabled={actionLoading}
                  >
                    Regenerate
                  </Button>

                  <Button
                    size="sm"
                    color="primary"
                    variant="secondary"
                    onPress={() => window.open(fullUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open Link
                  </Button>
                </div>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default SharePassportModal;
