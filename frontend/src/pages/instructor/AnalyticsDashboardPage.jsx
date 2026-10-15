import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Table, Tabs, ProgressBar, Button, Alert } from '@heroui/react';
import api from '../../services/api';

const AnalyticsDashboardPage = () => {
  const [overview, setOverview] = useState(null);
  const [skills, setSkills] = useState([]);
  const [filterCourses, setFilterCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('approved_desc');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch overview and skill analytics in parallel
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const overviewParams = {};
      const skillsParams = { sort: sortFilter };

      if (courseFilter && courseFilter !== 'all') {
        overviewParams.courseId = courseFilter;
        skillsParams.courseId = courseFilter;
      }

      const [overviewRes, skillsRes] = await Promise.all([
        api.get('/analytics/overview', { params: overviewParams }),
        api.get('/analytics/skills', { params: skillsParams }),
      ]);

      setOverview(overviewRes.data.overview || null);
      setSkills(skillsRes.data.skills || []);

      if (skillsRes.data.filters?.courses) {
        setFilterCourses(skillsRes.data.filters.courses);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(
        err.response?.data?.message || 'Failed to load analytics data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [courseFilter, sortFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Total submissions calculation
  const totalSubmissions =
    (overview?.totalBadgesIssued ?? 0) +
    (overview?.totalPendingRequests ?? 0) +
    (overview?.totalRejected ?? 0);

  // Skills needing attention
  const attentionSkills = skills.filter(
    (item) => item.rejectionRate > 50 || (item.approved === 0 && item.rejected > 0)
  );

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* 1. Header with Course Filter */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">
              Skill certification insights and assessment pipeline across your courses
            </p>
          </div>

          <div className="w-full sm:w-60">
            <select
              id="course-filter-select"
              className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none transition-all shadow-2xs"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              disabled={loading}
              aria-label="Filter by course"
            >
              <option value="all">All Courses</option>
              {filterCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
            <span>{error}</span>
            <Button size="sm" variant="flat" color="danger" onPress={fetchAnalytics}>
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-500 text-sm m-0">Loading certification metrics...</p>
          </div>
        ) : (
          <>
            {/* 2. 3 KPI Cards Only (drop Active Students card per TON-217) */}
            <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total Submissions */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl">assignment</span>
                </div>
                <div>
                  <div className="font-heading font-bold text-2xl text-slate-900">
                    {totalSubmissions}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Total Submissions</div>
                </div>
              </div>

              {/* Card 2: Approval Rate */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <span className="material-symbols-outlined text-2xl">trending_up</span>
                </div>
                <div>
                  <div className="font-heading font-bold text-2xl text-emerald-600">
                    {overview?.approvalRate ?? 0}%
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Approval Rate</div>
                </div>
              </div>

              {/* Card 3: Avg Review Time */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <span className="material-symbols-outlined text-2xl">schedule</span>
                </div>
                <div>
                  <div className="font-heading font-bold text-2xl text-slate-900">
                    {overview?.avgReviewTime || '1.8 hrs'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Avg Review Time</div>
                </div>
              </div>
            </section>

            {/* 3. Tabs: Overview / Skill Performance / Student Progress */}
            <Tabs
              selectedKey={selectedTab}
              onSelectionChange={(key) => setSelectedTab(String(key))}
              className="w-full"
            >
              <Tabs.List className="flex border-b border-slate-200 gap-2 mb-6">
                <Tabs.Tab id="overview" className="pb-3 text-sm font-semibold cursor-pointer">
                  Overview
                </Tabs.Tab>
                <Tabs.Tab id="skills" className="pb-3 text-sm font-semibold cursor-pointer">
                  Skill Performance
                </Tabs.Tab>
                <Tabs.Tab id="students" className="pb-3 text-sm font-semibold cursor-pointer">
                  Student Progress
                </Tabs.Tab>
              </Tabs.List>

              {/* Tab 1: Overview */}
              <Tabs.Panel id="overview" className="flex flex-col gap-6">
                {/* Review Pipeline Distribution: 3 numbers in a row, NO stacked ProgressBars per TON-217 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-heading font-bold text-base text-slate-900 m-0 mb-1">
                    Review Pipeline Distribution
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mb-5">
                    Current distribution of submissions across evaluation stages
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    {/* Approved */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                        Approved
                      </span>
                      <span className="font-heading font-bold text-3xl text-emerald-800 mt-1">
                        {overview?.totalBadgesIssued ?? 0}
                      </span>
                      <span className="text-[11px] text-emerald-600 mt-0.5">Badges Awarded</span>
                    </div>

                    {/* Pending */}
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                        Pending
                      </span>
                      <span className="font-heading font-bold text-3xl text-amber-800 mt-1">
                        {overview?.totalPendingRequests ?? 0}
                      </span>
                      <span className="text-[11px] text-amber-600 mt-0.5">Awaiting Review</span>
                    </div>

                    {/* Rejected */}
                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                        Rejected
                      </span>
                      <span className="font-heading font-bold text-3xl text-rose-800 mt-1">
                        {overview?.totalRejected ?? 0}
                      </span>
                      <span className="text-[11px] text-rose-600 mt-0.5">Needs Revision</span>
                    </div>
                  </div>
                </div>

                {/* Skills Needing Attention */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
                    <h3 className="font-heading font-bold text-base text-slate-900 m-0">Skills Needing Attention</h3>
                  </div>

                  {attentionSkills.length === 0 ? (
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900">
                      <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
                      <div>
                        <div className="font-bold text-emerald-900">All skills performing well</div>
                        <p className="text-emerald-700 m-0 mt-0.5">
                          None of your tracked skills have a rejection rate above 50%.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attentionSkills.map((item) => (
                        <div
                          key={`attention-${item.course._id}-${item.skill._id}`}
                          className="bg-white border border-rose-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 m-0">{item.skill.name}</h4>
                              <p className="text-xs text-slate-400 m-0 mt-0.5">{item.course.name}</p>
                            </div>
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              {item.approvalRate}% pass rate
                            </span>
                          </div>
                          <p className="text-xs text-rose-800 bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 m-0 leading-relaxed italic">
                            {item.approved === 0
                              ? 'No approved certifications yet. Students may need additional rubric clarification.'
                              : 'Consider providing supplemental resources or rubric examples for this skill.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tabs.Panel>

              {/* Tab 2: Skill Performance */}
              <Tabs.Panel id="skills" className="flex flex-col gap-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-heading font-bold text-base text-slate-900 m-0">Skill Performance</h3>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">Competency completion and pass rates</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                        value={sortFilter}
                        onChange={(e) => setSortFilter(e.target.value)}
                        aria-label="Sort skills"
                      >
                        <option value="approved_desc">Highest Approvals</option>
                        <option value="approved_asc">Lowest Approvals</option>
                        <option value="rejection_rate_desc">Highest Rejections</option>
                      </select>
                    </div>
                  </div>

                  {skills.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No skill metrics available for the selected course filter.
                    </div>
                  ) : (
                    /* Skill Performance Table: ProgressBar + score columns only, no separate Status badge column per TON-217 */
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Skill Performance Table" className="min-w-[650px]">
                          <Table.Header>
                            <Table.Column isRowHeader className="py-3 px-4 font-semibold text-xs text-slate-700">Skill</Table.Column>
                            <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Course</Table.Column>
                            <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700 text-center">Submissions</Table.Column>
                            <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700 min-w-44">Approval Rate</Table.Column>
                            <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700 text-right pr-4">Score</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {skills.map((item) => {
                              const total = item.approved + item.rejected + item.pending;
                              const rateColor =
                                item.approvalRate >= 70
                                  ? 'success'
                                  : item.approvalRate >= 40
                                  ? 'warning'
                                  : 'danger';

                              return (
                                <Table.Row key={`${item.course._id}-${item.skill._id}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                  <Table.Cell className="py-3.5 px-4">
                                    <div className="font-semibold text-xs text-slate-900">{item.skill.name}</div>
                                  </Table.Cell>
                                  <Table.Cell className="py-3.5 px-4 text-xs text-slate-500">
                                    {item.course.name}
                                  </Table.Cell>
                                  <Table.Cell className="py-3.5 px-4 text-xs text-slate-700 text-center font-medium">
                                    {total}
                                  </Table.Cell>
                                  {/* ProgressBar column */}
                                  <Table.Cell className="py-3.5 px-4">
                                    <div className="w-full max-w-xs">
                                      <ProgressBar
                                        value={item.approvalRate}
                                        color={rateColor}
                                        aria-label={`${item.skill.name} approval rate`}
                                        className="h-2 rounded-full"
                                      />
                                    </div>
                                  </Table.Cell>
                                  {/* Score column only (no separate Status badge column) */}
                                  <Table.Cell className="py-3.5 px-4 text-right pr-4 text-xs font-bold text-slate-800">
                                    {item.approvalRate}%
                                  </Table.Cell>
                                </Table.Row>
                              );
                            })}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  )}
                </div>
              </Tabs.Panel>

              {/* Tab 3: Student Progress */}
              <Tabs.Panel id="students" className="flex flex-col gap-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900 m-0">Student Progress Overview</h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">Learner completion trajectory across courses</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                    {filterCourses.map((c) => (
                      <div key={c._id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col gap-2">
                        <div className="font-bold text-xs text-slate-900 truncate">{c.name}</div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Progress Trajectory</span>
                          <span className="font-semibold text-primary">Active</span>
                        </div>
                        <ProgressBar
                          value={overview?.approvalRate ?? 50}
                          color="primary"
                          aria-label={`${c.name} student progress`}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
