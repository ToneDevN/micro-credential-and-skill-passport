import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Spinner,
  Card,
  CardHeader,
  CardContent,
  Button,
  Chip,
  Alert,
  SearchField,
  Label,
  Select,
  ListBox
} from '@heroui/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const SkillExplorePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlParam =
    searchParams.get('q') ||
    searchParams.get('search') ||
    searchParams.get('query') ||
    '';

  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState(urlParam);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [courseSkills, setCourseSkills] = useState({});
  const [loadingCourseId, setLoadingCourseId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'certified' | 'pending' | 'not_started'
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [error, setError] = useState('');
  // Note: Student Enrollment deferred to v2 (TON-220)

  // Pagination state for Explore Skills
  const [viewMode, setViewMode] = useState('courses'); // 'courses' | 'skills'
  const [skillsList, setSkillsList] = useState([]);
  const [skillsPage, setSkillsPage] = useState(1);
  const [skillsTotalPages, setSkillsTotalPages] = useState(1);
  const [skillsTotal, setSkillsTotal] = useState(0);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsLoadingMore, setSkillsLoadingMore] = useState(false);

  const debounceTimerRef = useRef(null);

  // Fetch all courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/courses');
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error('Failed to load courses', err);
      setError('Unable to load courses. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch skills for a specific course
  const fetchSkillsForCourse = async (courseId) => {
    if (courseSkills[courseId]) return;

    try {
      setLoadingCourseId(courseId);
      let skills = [];
      try {
        const res = await api.get(`/courses/${courseId}/public-skills`);
        skills = res.data.skills || [];
      } catch (fallbackErr) {
        const res = await api.get(`/skills/course/${courseId}`);
        skills = res.data.skills || [];
      }
      setCourseSkills((prev) => ({
        ...prev,
        [courseId]: skills,
      }));
    } catch (err) {
      console.error(`Failed to load skills for course ${courseId}`, err);
    } finally {
      setLoadingCourseId(null);
    }
  };

  // Paginated skills loader
  const loadSkills = useCallback(
    async (page = 1, append = false, query = '') => {
      try {
        if (append) {
          setSkillsLoadingMore(true);
        } else {
          setSkillsLoading(true);
        }
        const endpoint = query
          ? `/skills/search?q=${encodeURIComponent(query)}&page=${page}&limit=12`
          : `/skills?page=${page}&limit=12`;
        const res = await api.get(endpoint);
        const data = res.data;
        const skillsData = data.skills || data.data || [];

        if (append) {
          setSkillsList((prev) => [...prev, ...skillsData]);
        } else {
          setSkillsList(skillsData);
        }

        setSkillsPage(data.pagination?.page || data.page || page);
        setSkillsTotalPages(data.pagination?.totalPages || data.totalPages || 1);
        setSkillsTotal(data.pagination?.totalSkills || data.total || skillsData.length || 0);
      } catch (err) {
        console.error('Failed to load skills list', err);
      } finally {
        setSkillsLoading(false);
        setSkillsLoadingMore(false);
      }
    },
    []
  );

  // Search handler
  const performSearch = useCallback(
    async (query) => {
      const q = (query || '').trim();
      if (!q) {
        setIsSearching(false);
        setSkillsList([]);
        return;
      }

      try {
        setSearchLoading(true);
        setIsSearching(true);
        await loadSkills(1, false, q);
      } catch (err) {
        console.error('Search failed', err);
        setSkillsList([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [loadSkills]
  );

  useEffect(() => {
    fetchCourses();
    if (urlParam) {
      performSearch(urlParam);
    }
  }, [fetchCourses, performSearch, urlParam]);

  const handleSearchChange = (valOrEvent) => {
    const val = typeof valOrEvent === 'string' ? valOrEvent : valOrEvent?.target?.value || '';
    setSearchQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setIsSearching(false);
      setSearchParams({});
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchParams({ q: val.trim() });
      performSearch(val.trim());
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSkillsList([]);
    setSearchParams({});
  };

  const handleToggleCourse = (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      fetchSkillsForCourse(courseId);
    }
  };

  // Skill status badge & Action Button per UC-06 & TON-211:
  // ONLY render Chip for Certified (success) / Pending (warning) — NO chip for Not Started.
  // Already-certified skills have disabled action button.
  const renderStudentStatusAndAction = (skill, courseId) => {
    if (user?.role === 'instructor') {
      return null;
    }

    if (!user || (user.role !== 'student')) {
      return (
        <span className="text-slate-400 text-xs">Login to verify</span>
      );
    }

    const status = skill.studentStatus || 'not_started';
    const targetCourseId =
      courseId ||
      (skill.courses && skill.courses.length > 0 ? skill.courses[0]._id : '');
    const verifyLink = targetCourseId
      ? `/student/submit-verification?courseId=${targetCourseId}&skillId=${skill.courseSkillId || skill._id}`
      : `/student/submit-verification?skillId=${skill.courseSkillId || skill._id}`;

    if (status === 'approved' || status === 'certified') {
      return (
        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            color="success"
            variant="flat"
            className="text-xs font-semibold"
            startContent={<span className="material-symbols-outlined text-[14px] mr-0.5">check_circle</span>}
          >
            Certified ✓
          </Chip>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            color="warning"
            variant="flat"
            className="text-xs font-medium"
            startContent={<span className="material-symbols-outlined text-[14px] mr-0.5">hourglass_top</span>}
          >
            Pending
          </Chip>
          <Button size="sm" variant="flat" isDisabled className="text-xs h-7 opacity-70">
            Pending…
          </Button>
        </div>
      );
    }

    if (status === 'rejected') {
      return (
        <Button
          size="sm"
          color="danger"
          variant="flat"
          className="text-xs h-7 font-medium"
          onPress={() => navigate(verifyLink)}
        >
          Re-submit
        </Button>
      );
    }

    // not_started: NO chip element at all per TON-211!
    return (
      <Button
        size="sm"
        color="primary"
        className="text-xs h-7 font-medium"
        onPress={() => navigate(verifyLink)}
      >
        Verify
      </Button>
    );
  };

  // Filter skills based on statusFilter
  const filterSkillsByStatus = (skills) => {
    if (!skills) return [];
    if (statusFilter === 'all') return skills;
    return skills.filter((s) => {
      const st = s.studentStatus || 'not_started';
      if (statusFilter === 'certified') return st === 'approved' || st === 'certified';
      if (statusFilter === 'pending') return st === 'pending';
      if (statusFilter === 'not_started') return st === 'not_started' || !st;
      return true;
    });
  };

  const displayedCourses = selectedCourseFilter === 'all'
    ? courses
    : courses.filter((c) => (c._id?.toString() || c._id) === selectedCourseFilter);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">Explore Skills</h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">
              Browse micro-skills and courses available for verifiable credentialing
            </p>
          </div>
        </header>

        {/* Filter & Search Bar Row */}
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <SearchField
            name="search"
            value={searchQuery}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            className="w-full sm:flex-1"
          >
            <Label>Search</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-[280px]" placeholder="Search..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          {/* Course Select Filter */}
          <Select
            fullWidth
            placeholder="All Courses"
            value={selectedCourseFilter}
            onChange={(val) => setSelectedCourseFilter(val ? String(val) : 'all')}
            className="w-full sm:w-64"
          >
            <Label>Course</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="All Courses">
                  All Courses
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {courses.map((c) => {
                  const idStr = c._id?.toString() || c._id;
                  const label = c.name;
                  return (
                    <ListBox.Item key={idStr} id={idStr} textValue={label}>
                      {label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  );
                })}
              </ListBox>
            </Select.Popover>
          </Select>

          {/* Single Select for Status Filter */}
          {user?.role === 'student' && (
            <Select
              fullWidth
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val ? String(val) : 'all')}
              className="w-full sm:w-44"
            >
              <Label>Status</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="All Statuses">
                    All Statuses
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="certified" textValue="Certified">
                    Certified
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="not_started" textValue="Not Certificated">
                    Not Certificated
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        </div>

        {/* Error Feedback */}
        {error && <Alert status="danger">{error}</Alert>}

        {/* Main Content Area */}
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <div className="text-sm text-slate-500">Loading available courses and skills...</div>
          </div>
        ) : isSearching ? (
          /* SEARCH RESULTS VIEW */
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-heading font-bold text-lg text-slate-900 m-0">
                Search Results ({skillsTotal})
              </h2>
              <Button
                size="sm"
                variant="light"
                onPress={handleClearSearch}
                startContent={<span className="material-symbols-outlined text-[16px]">arrow_back</span>}
              >
                Back to Courses
              </Button>
            </div>

            {skillsList.length === 0 ? (
              <Card className="text-center py-12 px-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <CardContent className="flex flex-col items-center justify-center gap-2 p-0 max-w-sm mx-auto">
                  <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                  <h3 className="font-heading font-bold text-base text-slate-900 m-0">No skills found</h3>
                  <p className="text-xs text-slate-500 m-0">
                    No skills found for &quot;<strong>{searchQuery}</strong>&quot;.
                  </p>
                  <Button size="sm" variant="flat" onPress={handleClearSearch} className="mt-2 font-medium">
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filterSkillsByStatus(skillsList).map((skill) => (
                    <Card
                      key={skill._id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <CardHeader className="flex flex-col items-start p-0 pb-2 gap-1.5">
                        <div className="flex items-center justify-between w-full">
                          <h3 className="font-heading font-bold text-base text-slate-900 m-0 truncate">
                            {skill.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 m-0 line-clamp-2 leading-relaxed">
                          {skill.description}
                        </p>
                        {/* Single muted caption line for metadata */}
                        <div className="text-xs text-slate-400 mt-1">
                          {skill.criteria ? `${skill.criteria} criteria` : 'Standard rubric'} • Assessor: {skill.instructor?.name || 'Instructor'}
                        </div>
                      </CardHeader>

                      {user?.role !== 'instructor' && (
                        <CardContent className="p-0 pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                          {renderStudentStatusAndAction(skill, null)}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Load More Button */}
                {skillsPage < skillsTotalPages && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="flat"
                      onPress={() => loadSkills(skillsPage + 1, true, searchQuery)}
                      isLoading={skillsLoadingMore}
                      className="font-medium"
                    >
                      {skillsLoadingMore
                        ? 'Loading more skills...'
                        : `Load More Skills (${skillsList.length} of ${skillsTotal})`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          /* DEFAULT VIEW: Courses and Skills */
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                color={viewMode === 'courses' ? 'primary' : 'default'}
                variant={viewMode === 'courses' ? 'solid' : 'flat'}
                onPress={() => setViewMode('courses')}
                className="font-medium"
                startContent={<span className="material-symbols-outlined text-[16px]">menu_book</span>}
              >
                Browse by Courses ({displayedCourses.length})
              </Button>
              <Button
                size="sm"
                color={viewMode === 'skills' ? 'primary' : 'default'}
                variant={viewMode === 'skills' ? 'solid' : 'flat'}
                onPress={() => {
                  setViewMode('skills');
                  if (skillsList.length === 0) {
                    loadSkills(1, false);
                  }
                }}
                className="font-medium"
                startContent={<span className="material-symbols-outlined text-[16px]">psychology</span>}
              >
                All Micro-Skills {skillsTotal > 0 ? `(${skillsTotal})` : ''}
              </Button>
            </div>

            {viewMode === 'skills' ? (
              skillsLoading && skillsList.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
                  <Spinner size="lg" color="primary" />
                  <div className="text-sm text-slate-500">Loading skills...</div>
                </div>
              ) : skillsList.length === 0 ? (
                <Card className="text-center py-12 px-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-0">
                    <span className="material-symbols-outlined text-4xl text-slate-300">psychology</span>
                    <h3 className="font-heading font-bold text-base text-slate-900 m-0">No skills available</h3>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filterSkillsByStatus(skillsList).map((skill) => (
                    <Card
                      key={skill._id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <CardHeader className="flex flex-col items-start p-0 pb-2 gap-1.5">
                        <div className="flex items-center justify-between w-full">
                          <h3 className="font-heading font-bold text-base text-slate-900 m-0 truncate">
                            {skill.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 m-0 line-clamp-2 leading-relaxed">
                          {skill.description}
                        </p>
                        {/* Single muted caption line for metadata */}
                        <div className="text-xs text-slate-400 mt-1">
                          {skill.criteria ? `${skill.criteria} criteria` : 'Standard rubric'} • Assessor: {skill.instructor?.name || 'Instructor'}
                        </div>
                      </CardHeader>

                      {user?.role !== 'instructor' && (
                        <CardContent className="p-0 pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                          {renderStudentStatusAndAction(skill, null)}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )
            ) : displayedCourses.length === 0 ? (
              <Card className="text-center py-12 px-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <CardContent className="flex flex-col items-center justify-center gap-2 p-0 max-w-sm mx-auto">
                  <span className="material-symbols-outlined text-4xl text-slate-300">school</span>
                  <h3 className="font-heading font-bold text-base text-slate-900 m-0">No courses match the selection</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {displayedCourses.map((course) => {
                  const isExpanded = expandedCourse === course._id;
                  const rawSkills = courseSkills[course._id];
                  const skills = filterSkillsByStatus(rawSkills);
                  const isLoadingSkills = loadingCourseId === course._id;

                  return (
                    <Card
                      key={course._id}
                      className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all"
                    >
                      {/* Course Card Header */}
                      <div
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                        onClick={() => handleToggleCourse(course._id)}
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-2xl">code</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="font-heading font-bold text-base text-slate-900 m-0 truncate">
                              {course.name}
                            </h2>
                            <p className="text-xs text-slate-500 m-0 mt-0.5 line-clamp-1">
                              {course.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          <span className="text-xs text-slate-400 font-medium hidden md:inline">
                            {course.instructor?.name || 'Instructor'}
                          </span>
                          <Chip size="sm" variant="flat" color="primary" className="text-xs font-semibold">
                            {course.skillCount} {course.skillCount === 1 ? 'skill' : 'skills'}
                          </Chip>



                          <span
                            className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''
                              }`}
                          >
                            expand_more
                          </span>
                        </div>
                      </div>

                      {/* Expanded Skills Breakdown */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 bg-slate-50/40 flex flex-col gap-2.5">
                          {isLoadingSkills ? (
                            <div className="py-6 text-center text-slate-500 flex items-center justify-center text-xs gap-2">
                              <Spinner size="sm" color="primary" />
                              <span>Loading course skills...</span>
                            </div>
                          ) : !skills || skills.length === 0 ? (
                            <div className="py-4 text-center text-slate-500 text-xs">
                              No skills match the current filter in this course.
                            </div>
                          ) : (
                            skills.map((skill) => (
                              <div
                                key={skill._id}
                                className="p-3 bg-white border border-slate-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                              >
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">{skill.name}</div>
                                    <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                                      {skill.description}
                                    </div>
                                    {/* Muted caption line for metadata */}
                                    <div className="text-[11px] text-slate-400 mt-1">
                                      {skill.criteria ? `${skill.criteria} criteria` : 'Standard rubric'} • Assessor: {course.instructor?.name || 'Instructor'}
                                    </div>
                                  </div>
                                </div>

                                {user?.role !== 'instructor' && (
                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    {renderStudentStatusAndAction(skill, course._id)}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default SkillExplorePage;
