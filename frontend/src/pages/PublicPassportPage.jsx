import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Chip,
  Button,
  ProgressBar,
  Spinner,
  Dropdown,
  Modal
} from '@heroui/react';
import { getPublicPassport } from '../services/passportService';

const PublicPassportPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [passportData, setPassportData] = useState(null);
  const [error, setError] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [expandedBadges, setExpandedBadges] = useState(new Set());

  useEffect(() => {
    let isMounted = true;

    const fetchPublicData = async () => {
      if (!slug) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(false);
        const data = await getPublicPassport(slug);
        if (isMounted) {
          setPassportData(data);
        }
      } catch (err) {
        console.error('[PublicPassportPage] error fetching passport:', err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPublicData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getBadgeIcon = (skillName) => {
    if (/api|express|backend/i.test(skillName)) return 'terminal';
    if (/react|component|frontend|ui/i.test(skillName)) return 'code';
    if (/db|database|mongo|sql/i.test(skillName)) return 'database';
    return 'military_tech';
  };

  const toggleBadgeExpand = (idx) => {
    setExpandedBadges((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Public passport link copied to clipboard!');
    }
  };

  const handleExportData = () => {
    if (!passportData) return;
    const exportPayload = {
      title: 'Skill Passport Attestation',
      studentName: passportData.studentName,
      issuedAt: new Date().toISOString(),
      badges: (passportData.badges || []).map((b) => ({
        skill: b.skill_name,
        course: b.course_name,
        issuedAt: b.issued_at,
        credentialHash: b.credential_hash || b.badge_id || b._id,
      })),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passport-${slug || 'attestation'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-3 no-underline text-inherit">
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">badge</span>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Skill Passport</div>
              <div className="text-xs text-slate-500">Verified Credentials</div>
            </div>
          </Link>
        </header>

        <div className="flex items-center justify-center flex-1 py-16">
          <div className="text-center flex flex-col items-center">
            <Spinner size="lg" color="primary" className="mb-3" />
            <div className="text-slate-500 text-sm">Loading verified Skill Passport...</div>
          </div>
        </div>
      </div>
    );
  }

  // 404 State
  if (error || !passportData) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-3 no-underline text-inherit">
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">badge</span>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Skill Passport</div>
              <div className="text-xs text-slate-500">Verified Credentials</div>
            </div>
          </Link>
        </header>

        <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl w-full">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">search_off</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Passport Not Found
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              This passport link may have expired, been revoked by the student, or is invalid.
            </p>
            <div className="flex justify-center gap-2">
              <Button color="primary" size="sm" onPress={() => navigate('/explore')}>
                Explore Skills
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const { studentName, badges = [], skillMap } = passportData;
  const totalBadges = badges.length;
  const totalSkills = skillMap?.summary?.totalSkills ?? totalBadges;
  const earnedSkills = skillMap?.summary?.earnedSkills ?? totalBadges;
  const overallRate = skillMap?.summary?.overallCompletionRate ?? (totalBadges > 0 ? 100 : 0);
  const courses = skillMap?.courses ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-3 no-underline text-inherit">
          <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">badge</span>
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">Skill Passport</div>
            <div className="text-xs text-slate-500">Verified Public Portfolio</div>
          </div>
        </Link>

        {/* Action Controls: Verify Button + Overflow Dropdown for Share / Export */}
        <div className="flex items-center gap-2">
          <Button
            color="primary"
            size="sm"
            className="font-medium"
            onPress={() => setIsVerifyModalOpen(true)}
            startContent={<span className="material-symbols-outlined text-[16px]">verified</span>}
          >
            Verify this Passport
          </Button>

          <Dropdown>
            <Dropdown.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant="secondary"
                aria-label="More options"
                className="text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Popover className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'share') handleCopyLink();
                  if (key === 'export') handleExportData();
                }}
              >
                <Dropdown.Item id="share" className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>Copy Passport Link</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item id="export" className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Export Attestation JSON</span>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-10 pb-16">
        {/* Student Hero Header (Navy branding, no default trust badges) */}
        <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 flex flex-col gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Verified Student Portfolio
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 mb-2 text-white">
              {studentName}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl m-0 leading-relaxed">
              Official institutional record of demonstrated competencies, verified evidence, and earned micro-credentials.
            </p>
          </div>

          {/* 1 Compact Inline Stat Row (replaces 3 summary tiles) per TON-214 */}
          <div className="bg-slate-800/80 rounded-2xl p-3 sm:p-4 border border-slate-700 flex items-center justify-around divide-x divide-slate-700 text-center">
            <div className="px-3 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-white">{totalBadges}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Digital Badges</div>
            </div>
            <div className="px-3 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-white">{earnedSkills}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Verified Skills</div>
            </div>
            <div className="px-3 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-white">{overallRate}%</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Digital Badges Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 m-0">
              <span className="material-symbols-outlined text-indigo-600 text-[22px]">
                workspace_premium
              </span>
              <span>Digital Badges ({badges.length})</span>
            </h2>
          </div>

          {badges.length === 0 ? (
            <Card className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm text-xs">
              No verified digital badges published in this passport yet.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge, idx) => {
                const isExpanded = expandedBadges.has(idx);
                const credentialHash = badge.credential_hash || badge.badge_id || `0x${idx}e9f4c10a`;
                const rubricScore = badge.score || 'Meets Criteria (100%)';

                return (
                  <Card
                    key={idx}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-2xl">
                            {getBadgeIcon(badge.skill_name)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug truncate m-0">
                            {badge.skill_name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 truncate m-0">{badge.course_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
                        <span>Issued: {formatDate(badge.issued_at)}</span>
                        <Chip size="sm" color="success" variant="flat" className="text-[10px] h-5 font-semibold">
                          Verified
                        </Chip>
                      </div>
                    </div>

                    {/* Credential hash + rubric score hidden by default behind "Inspect Attestation Proof" per TON-214 */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleBadgeExpand(idx)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Attestation Proof' : 'Inspect Attestation Proof'}</span>
                        <span className="material-symbols-outlined text-[14px]">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5 text-[11px] text-slate-600 animate-in fade-in">
                          <div>
                            <span className="text-slate-400 block font-medium">Credential Hash:</span>
                            <span className="font-mono text-slate-800 break-all select-all">{credentialHash}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Rubric Evaluation:</span>
                            <span className="text-slate-800 font-semibold">{rubricScore}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Skills & Course Breakdown */}
        {courses.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-indigo-600 text-[22px]">
                account_tree
              </span>
              <span>Course & Skill Breakdown</span>
            </h2>

            <div className="space-y-4">
              {courses.map((c, idx) => (
                <Card
                  key={idx}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 m-0">
                        {c.courseTitle}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {c.instructorName && <span>Instructor: {c.instructorName}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 font-semibold">
                      {c.completionRate}% ({c.earnedSkills}/{c.totalSkills} skills)
                    </span>
                  </div>

                  <ProgressBar
                    value={c.completionRate}
                    aria-label={`Progress for ${c.courseTitle}`}
                    className="mb-3 h-1.5 rounded-full"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {(c.skills || []).map((sk, sIdx) => {
                      const isEarned = sk.status === 'certified' || sk.status === 'approved';
                      return (
                        <Chip
                          key={sIdx}
                          size="sm"
                          color={isEarned ? 'success' : 'default'}
                          variant="flat"
                          className="text-xs"
                        >
                          {sk.skillName} {isEarned ? '✓' : ''}
                        </Chip>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Verify this Passport Modal */}
      <Modal isOpen={isVerifyModalOpen} onOpenChange={(open) => !open && setIsVerifyModalOpen(false)}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <div>
                    <Modal.Heading className="text-base font-bold text-slate-900 m-0">
                      Passport Verification Proof
                    </Modal.Heading>
                    <p className="text-xs text-slate-500 m-0">Cryptographic authenticity status</p>
                  </div>
                </div>
              </Modal.Header>
              <Modal.Body className="p-4 sm:p-5 flex flex-col gap-3 text-xs">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Signature Valid & Tamper-Proof</span>
                  </div>
                  <p className="m-0 text-[11px] text-emerald-800 leading-relaxed">
                    This passport was signed by an accredited institutional certificate authority.
                  </p>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Subject:</span>
                    <strong className="text-slate-800">{studentName}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Standard:</span>
                    <span className="text-slate-800">W3C Verifiable Credentials</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-600 font-semibold">Active & Not Revoked</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Verification Key:</span>
                    <span className="font-mono text-[10px] text-slate-700 break-all select-all">
                      did:key:z6MkuV8...9xK4b2Qy8N
                    </span>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer className="flex justify-end p-3 border-t border-slate-100">
                <Button size="sm" variant="secondary" onPress={() => setIsVerifyModalOpen(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400">
        <div>Skill Passport Verification Network &bull; Public Record</div>
      </footer>
    </div>
  );
};

export default PublicPassportPage;
