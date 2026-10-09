import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './SkillExplore.css';

const SkillExplorePage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlParam =
    searchParams.get('q') ||
    searchParams.get('search') ||
    searchParams.get('query') ||
    '';

  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState(urlParam);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [courseSkills, setCourseSkills] = useState({});
  const [loadingCourseId, setLoadingCourseId] = useState(null);
  const [activeFilter, setActiveFilter] = useState(urlParam || 'All');
  const [error, setError] = useState('');

  const debounceTimerRef = useRef(null);

  // Fetch all courses on mount
  useEffect(() => {
    let ignore = false;
    api
      .get('/courses')
      .then((res) => {
        if (!ignore) {
          setCourses(res.data.courses || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Error fetching courses:', err);
          setError('Failed to load courses. Please check your connection.');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Execute skill search
  const performSearch = useCallback(async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);
      setIsSearching(true);
      setError('');
      const res = await api.get('/skills/search', {
        params: { q: trimmed },
      });
      setSearchResults(res.data.skills || []);
    } catch (err) {
      console.error('Error searching skills:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Sync with URL query parameter on mount or when URL changes
  useEffect(() => {
    const q =
      searchParams.get('q') ||
      searchParams.get('search') ||
      searchParams.get('query') ||
      '';
    if (q.trim()) {
      setSearchQuery(q);
      performSearch(q);
    } else if (
      searchParams.has('q') ||
      searchParams.has('search') ||
      searchParams.has('query')
    ) {
      setSearchQuery('');
      setIsSearching(false);
      setSearchResults([]);
      setActiveFilter('All');
    }
  }, [searchParams, performSearch]);

  // Handle search input change with 300ms debounce and URL sync
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchParams({}, { replace: true });
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchParams({ q: val.trim() }, { replace: true });
      performSearch(val);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
    setActiveFilter('All');
    setSearchParams({}, { replace: true });
  };

  // Toggle course accordion and load skills if not cached
  const handleToggleCourse = async (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      return;
    }

    setExpandedCourse(courseId);

    // If already loaded in courseSkills cache, skip API call
    if (courseSkills[courseId]) {
      return;
    }

    try {
      setLoadingCourseId(courseId);
      const res = await api.get(`/courses/${courseId}/public-skills`);
      setCourseSkills((prev) => ({
        ...prev,
        [courseId]: res.data.skills || [],
      }));
    } catch (err) {
      console.error(`Error loading skills for course ${courseId}:`, err);
    } finally {
      setLoadingCourseId(null);
    }
  };

  // Quick category / domain filter handler
  const handleQuickFilter = (domain) => {
    setActiveFilter(domain);
    if (domain === 'All') {
      handleClearSearch();
      return;
    }
    setSearchQuery(domain);
    setSearchParams({ q: domain }, { replace: true });
    performSearch(domain);
  };

  // Calculate total micro-skills count
  const totalSkillsCount = courses.reduce(
    (sum, c) => sum + (c.skillCount || 0),
    0
  );

  return (
    <div className="explore-container">
      <div className="explore-wrapper">
        {/* Page Header */}
        <header className="explore-header">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
            <div>
              <div className="explore-header-badge">
                <span className="material-symbols-outlined">school</span>
                <span>ACADEMIC DIRECTORY</span>
              </div>
              <h1 className="explore-title">Explore Skills</h1>
              <p className="explore-subtitle">
                Browse micro-skills by course or search by keyword
              </p>
            </div>

            {/* Summary Stats Counter Card */}
            <div className="explore-stats-card">
              <div className="explore-stat-item divider">
                <span className="material-symbols-outlined text-primary">
                  category
                </span>
                <span>
                  <strong>{courses.length}</strong> Courses
                </span>
              </div>
              <div className="explore-stat-item">
                <span
                  className="material-symbols-outlined"
                  style={{ color: '#006e4c' }}
                >
                  award_star
                </span>
                <span>
                  <strong>{totalSkillsCount}</strong> Micro-skills
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Search Bar Section */}
        <section className="mb-4">
          <div className="explore-search-card">
            <div className="explore-search-input-wrap">
              <span className="material-symbols-outlined explore-search-icon">
                search
              </span>
              <input
                type="text"
                className="explore-search-input"
                placeholder="Search skills by name or keyword..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <div className="explore-search-actions">
                {searchLoading ? (
                  <div
                    className="spinner-border spinner-border-sm text-primary"
                    role="status"
                  >
                    <span className="visually-hidden">Searching...</span>
                  </div>
                ) : (
                  searchQuery && (
                    <button
                      type="button"
                      className="explore-clear-btn"
                      onClick={handleClearSearch}
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Quick Domain Filter Pills */}
          <div className="explore-filter-pills">
            <span className="explore-filter-label">FILTER BY:</span>
            {['All', 'Web', 'Data', 'API', 'React', 'SQL'].map((item) => (
              <button
                key={item}
                type="button"
                className={`explore-pill-btn ${
                  activeFilter === item ? 'active' : ''
                }`}
                onClick={() => handleQuickFilter(item)}
              >
                {item === 'All' ? 'All Domains' : item}
              </button>
            ))}
          </div>
        </section>

        {/* Error Feedback */}
        {error && (
          <div className="alert alert-danger mb-4 rounded-3" role="alert">
            {error}
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="explore-loading-box">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div>Loading available courses and skills...</div>
          </div>
        ) : isSearching ? (
          /* SEARCH RESULTS VIEW */
          <section>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="fs-5 fw-bold m-0" style={{ fontFamily: 'Space Grotesk' }}>
                Search Results ({searchResults.length})
              </h2>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none"
                onClick={handleClearSearch}
                style={{ color: '#4F46E5' }}
              >
                ← Back to All Courses
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="explore-empty-box">
                <span className="material-symbols-outlined explore-empty-icon">
                  search_off
                </span>
                <div className="explore-empty-title">No skills found</div>
                <p className="m-0 text-muted">
                  No skills found for "<strong>{searchQuery}</strong>". Try a
                  different search term.
                </p>
                <button
                  type="button"
                  className="explore-reset-btn"
                  onClick={handleClearSearch}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="explore-search-results-list">
                {searchResults.map((skill) => (
                  <article key={skill._id} className="explore-search-card-item">
                    <div className="explore-search-header-row">
                      <div className="d-flex align-items-center gap-2">
                        <span className="explore-skill-dot"></span>
                        <h3 className="fs-6 fw-bold m-0 text-dark">
                          {skill.name}
                        </h3>
                      </div>

                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {skill.courses && skill.courses.length > 0 ? (
                          skill.courses.map((c) => (
                            <span
                              key={c._id}
                              className="explore-course-pill-tag"
                            >
                              <span className="material-symbols-outlined fs-6">
                                auto_stories
                              </span>
                              <span>{c.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-muted small">Independent</span>
                        )}
                      </div>
                    </div>

                    <p className="explore-skill-desc my-2 text-secondary">
                      {skill.description}
                    </p>

                    <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-light">
                      <span className="explore-criteria-chip">
                        <span className="material-symbols-outlined">
                          check_circle
                        </span>
                        <span>{skill.criteria}</span>
                      </span>

                      <span
                        className="text-muted small"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Verifiable Micro-Skill
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* DEFAULT ACCORDION / COURSE LIST VIEW */
          <section>
            {courses.length === 0 ? (
              <div className="explore-empty-box">
                <span className="material-symbols-outlined explore-empty-icon">
                  school
                </span>
                <div className="explore-empty-title">No courses available yet</div>
                <p className="m-0 text-muted">
                  Courses and micro-skills will appear here once published by instructors.
                </p>
              </div>
            ) : (
              <div className="explore-courses-list">
                {courses.map((course) => {
                  const isExpanded = expandedCourse === course._id;
                  const skills = courseSkills[course._id];
                  const isLoadingSkills = loadingCourseId === course._id;

                  return (
                    <article
                      key={course._id}
                      className={`explore-course-card ${
                        isExpanded ? 'expanded' : ''
                      }`}
                    >
                      {/* Course Card Header */}
                      <div
                        className="explore-course-header"
                        onClick={() => handleToggleCourse(course._id)}
                      >
                        <div className="explore-course-left">
                          <div className="explore-course-icon">
                            <span className="material-symbols-outlined">
                              code
                            </span>
                          </div>
                          <div>
                            <h2 className="explore-course-name">
                              {course.name}
                            </h2>
                            <p className="explore-course-desc">
                              {course.description}
                            </p>
                          </div>
                        </div>

                        <div className="explore-course-right">
                          <span className="explore-course-instructor d-none d-sm-inline">
                            {course.instructor?.name || 'Instructor'}
                          </span>
                          <span className="explore-skill-count-badge">
                            {course.skillCount}{' '}
                            {course.skillCount === 1 ? 'skill' : 'skills'}
                          </span>
                          <span
                            className={`material-symbols-outlined explore-chevron-icon ${
                              isExpanded ? 'rotated' : ''
                            }`}
                          >
                            expand_more
                          </span>
                        </div>
                      </div>

                      {/* Expanded Skills Breakdown */}
                      {isExpanded && (
                        <div className="explore-skills-body">
                          {isLoadingSkills ? (
                            <div className="p-4 text-center text-muted">
                              <div
                                className="spinner-border spinner-border-sm text-primary me-2"
                                role="status"
                              >
                                <span className="visually-hidden">
                                  Loading skills...
                                </span>
                              </div>
                              Loading course skills...
                            </div>
                          ) : !skills || skills.length === 0 ? (
                            <div className="p-4 text-center text-muted small">
                              No skills assigned to this course yet.
                            </div>
                          ) : (
                            skills.map((skill) => (
                              <div
                                key={skill._id}
                                className="explore-skill-row"
                              >
                                <div className="explore-skill-info">
                                  <span className="explore-skill-dot"></span>
                                  <div>
                                    <span className="explore-skill-name">
                                      {skill.name}
                                    </span>
                                    <span className="text-muted mx-2 d-none d-sm-inline">
                                      •
                                    </span>
                                    <span className="explore-skill-desc">
                                      {skill.description}
                                    </span>
                                  </div>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                  <span className="explore-criteria-chip">
                                    <span className="material-symbols-outlined">
                                      check_circle
                                    </span>
                                    <span>{skill.criteria}</span>
                                  </span>
                                  {user?.role === 'student' && (
                                    <Link
                                      to={`/student/submit-verification?courseId=${course._id}&skillId=${skill.courseSkillId || skill._id}`}
                                      className="btn btn-outline-primary btn-sm py-1 px-2"
                                      style={{ fontSize: '0.75rem', fontWeight: 600 }}
                                    >
                                      Verify
                                    </Link>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </article>
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
