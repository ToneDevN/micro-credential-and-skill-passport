import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Spinner,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Tabs,
  Tooltip
} from '@heroui/react';
import api from '../../services/api';
import MyCoursesSection from '../../components/MyCoursesSection';
import SharePassportModal from '../../components/SharePassportModal';

const PassportDashboardPage = () => {
  const navigate = useNavigate();
  const [passport, setPassport] = useState(null);
  const [skillMap, setSkillMap] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Fetch passport, skill map, and recent activities in parallel
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [passportRes, skillMapRes, activityRes] = await Promise.allSettled([
          api.get('/passport/my'),
          api.get('/passport/my/skill-map'),
          api.get('/verification-requests/my?limit=3'),
        ]);

        if (isMounted) {
          if (passportRes.status === 'fulfilled') {
            setPassport(passportRes.value.data.passport || { badges: [], totalBadges: 0 });
          }
          if (skillMapRes.status === 'fulfilled') {
            setSkillMap(
              skillMapRes.value.data || {
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
          if (activityRes.status === 'fulfilled') {
            setRecentActivity((activityRes.value.data.requests || []).slice(0, 3));
          }
        }
      } catch (err) {
        console.error('Failed to load student dashboard data', err);
        if (isMounted) {
          setError('Failed to load dashboard data. Please try again later.');
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

  const totalBadges = passport?.totalBadges ?? passport?.badges?.length ?? 0;
  const pendingSkills = skillMap?.summary?.pendingSkills ?? 0;
  const completionRate = skillMap?.summary?.overallCompletionRate ?? 0;

  const renderStatusChip = (status) => {
    switch (status) {
      case 'approved':
      case 'certified':
        return <Chip size="sm" color="success" variant="flat">Approved</Chip>;
      case 'pending':
        return <Chip size="sm" color="warning" variant="flat">Pending</Chip>;
      case 'rejected':
        return <Chip size="sm" color="danger" variant="flat">Rejected</Chip>;
      default:
        return <Chip size="sm" variant="flat">{status || 'In Review'}</Chip>;
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* 1. Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">Student Dashboard</h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">Track your course progress, badges, and skill verifications</p>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip delay={0}>
              <Tooltip.Trigger
                aria-label="Share public passport"
                className="inline-block"
              >
                <Button
                  color="primary"
                  onPress={() => setIsShareModalOpen(true)}
                  isDisabled={totalBadges === 0}
                  className="font-medium shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px] mr-1.5">share</span>
                  Share Passport
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm">
                <p className="m-0">
                  {totalBadges === 0
                    ? 'Earn at least 1 badge to enable sharing'
                    : 'Generate a public link to share your passport'}
                </p>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </header>

        {/* Share Modal */}
        <SharePassportModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          badgeCount={totalBadges}
        />

        {error && <Alert status="danger">{error}</Alert>}

        {/* 2. Summary stats as one compact inline row (divider-separated) */}
        <section
          aria-label="Summary Statistics"
          className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100"
        >
          {/* Stat 1: Badges Earned */}
          <div className="flex items-center gap-3.5 py-2 sm:py-0 px-3 sm:px-6">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">military_tech</span>
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-slate-900">{totalBadges}</div>
              <div className="text-xs text-slate-500 font-medium">Badges Earned</div>
            </div>
          </div>

          {/* Stat 2: Skills In Progress */}
          <div className="flex items-center gap-3.5 py-2 sm:py-0 px-3 sm:px-6">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">hourglass_top</span>
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-slate-900">{pendingSkills}</div>
              <div className="text-xs text-slate-500 font-medium">Skills In Progress</div>
            </div>
          </div>

          {/* Stat 3: Completion Rate */}
          <div className="flex items-center gap-3.5 py-2 sm:py-0 px-3 sm:px-6">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-slate-900">{completionRate}%</div>
              <div className="text-xs text-slate-500 font-medium">Completion Rate</div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-500 text-sm m-0">Loading dashboard data...</p>
          </div>
        ) : (
          /* 3. HeroUI Tabs for Dashboard Sections */
          <Tabs defaultSelectedKey="courses" className="w-full" variant="secondary">
            <Tabs.ListContainer className="border-b border-slate-200">
              <Tabs.List aria-label="Dashboard views">
                <Tabs.Tab id="courses">
                  My Courses
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="activity">
                  Recent Activity
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="badges">
                  Digital Badges
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="skillmap">
                  Skill Map
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            {/* TAB 1: My Courses */}
            <Tabs.Panel id="courses" className="pt-6">
              <MyCoursesSection />
            </Tabs.Panel>

            {/* TAB 2: Recent Activity (3 items + View All) */}
            <Tabs.Panel id="activity" className="pt-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900 m-0">Recent Verification Activity</h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">Latest verification submissions and review status</p>
                  </div>
                  <Link
                    to="/student/my-requests"
                    className="text-xs text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>View all</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No recent verification submissions.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentActivity.map((req) => (
                      <div key={req._id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {req.skill?.name || 'Skill Verification'}
                            </div>
                            <div className="text-xs text-slate-400">
                              Submitted {formatDate(req.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {renderStatusChip(req.status)}
                          <Link
                            to="/student/my-requests"
                            className="text-slate-400 hover:text-slate-600"
                            aria-label="View request details"
                          >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tabs.Panel>

            {/* TAB 3: Digital Badges */}
            <Tabs.Panel id="badges" className="pt-6">
              <section aria-label="Digital Badges Catalog" className="flex flex-col gap-6">
                {Object.keys(groupedBadges).length === 0 ? (
                  <Card className="text-center py-12 px-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center gap-3 p-0 max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <span className="material-symbols-outlined text-3xl">military_tech</span>
                      </div>
                      <h3 className="font-heading font-bold text-lg text-slate-900 m-0">No badges earned yet</h3>
                      <p className="text-slate-500 text-xs m-0 leading-relaxed">
                        Submit verification requests on completed course skills to earn your verifiable credentials.
                      </p>
                      <Button
                        color="primary"
                        className="mt-2 font-medium"
                        onPress={() => navigate('/explore')}
                      >
                        Explore Skills
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  Object.entries(groupedBadges).map(([courseName, badges]) => (
                    <div key={courseName} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600 text-[20px]">school</span>
                        <h2 className="font-heading font-bold text-base text-slate-900 m-0">{courseName}</h2>
                        <span className="text-xs text-slate-400">({badges.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {badges.map((b) => (
                          <Card key={b.badge_id || b._id} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-2xl">military_tech</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-heading font-bold text-sm text-slate-900 truncate m-0">
                                  {b.skill_name || 'Verified Skill'}
                                </h4>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Earned {formatDate(b.issued_at)}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </Tabs.Panel>

            {/* TAB 4: Skill Map */}
            <Tabs.Panel id="skillmap" className="pt-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 sm:p-6">
                <h3 className="font-heading font-bold text-base text-slate-900 m-0 mb-4">Course Skill Map</h3>
                {skillMap?.courses?.length === 0 ? (
                  <p className="text-slate-400 text-xs">No skill map data available.</p>
                ) : (
                  <div className="space-y-4">
                    {skillMap?.courses?.map((c) => (
                      <div key={c.course_id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-heading font-bold text-sm text-slate-900 m-0">{c.course_name}</h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {c.earnedSkills} / {c.totalSkills} Earned
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {c.skills?.map((s) => (
                            <Chip
                              key={s.skill_id}
                              size="sm"
                              color={s.status === 'earned' ? 'success' : s.status === 'pending' ? 'warning' : 'default'}
                              variant="flat"
                              className="text-xs"
                            >
                              {s.name}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tabs.Panel>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default PassportDashboardPage;
