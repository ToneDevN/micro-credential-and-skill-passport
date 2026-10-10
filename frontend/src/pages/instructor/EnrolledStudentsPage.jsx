import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import './EnrolledStudents.css';

const EnrolledStudentsPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [courseRes, studentsRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/courses/${courseId}/enrolled-students`),
        ]);

        if (isMounted) {
          setCourse(courseRes.data.course || null);
          setStudents(studentsRes.data.students || []);
        }
      } catch (err) {
        console.error('Failed to load enrolled students data:', err);
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              'Failed to load enrolled students. Please try again.'
          );
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
  }, [courseId]);

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

  const getInitials = (name) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const filteredStudents = students.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = item.student?.name?.toLowerCase() || '';
    const email = item.student?.email?.toLowerCase() || '';
    return name.includes(query) || email.includes(query);
  });

  if (loading) {
    return (
      <div className="enrolled-canvas">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading enrolled students...</span>
          </div>
          <div className="text-muted">Loading enrolled students...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="enrolled-canvas">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="enrolled-breadcrumb">
        <Link to="/instructor/courses">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>My Courses</span>
        </Link>
        <span>/</span>
        <span className="text-dark fw-medium">{course?.name || 'Course'}</span>
        <span>/</span>
        <span>Enrolled Students</span>
      </nav>

      {/* Header */}
      <header className="enrolled-header">
        <div>
          <h1 className="enrolled-title">
            {course?.name || 'Enrolled Students'}
          </h1>
          <p className="enrolled-subtitle">
            Students currently enrolled and their micro-credential progress
          </p>
        </div>
        <div className="enrolled-count-pill">
          <span className="material-symbols-outlined text-[20px] text-primary">
            group
          </span>
          <span>
            {students.length} {students.length === 1 ? 'Student' : 'Students'}
          </span>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      {students.length === 0 ? (
        /* Empty State */
        <div className="enrolled-empty-card">
          <div className="enrolled-empty-icon">
            <span className="material-symbols-outlined text-[32px]">group_off</span>
          </div>
          <h2 className="enrolled-empty-title">
            ยังไม่มีนักศึกษาลงทะเบียนวิชานี้
          </h2>
          <p className="enrolled-empty-desc">
            No students enrolled in this course yet. When students enroll from Explore Skills, their names, badge progress, and pending requests will appear here.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <Link
              to={`/instructor/courses/${courseId}/skills`}
              className="btn btn-outline-primary"
            >
              Manage Course Skills
            </Link>
            <Link to="/instructor/courses" className="btn btn-primary">
              Back to Courses
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Search Filter */}
          <div className="enrolled-search-bar">
            <div className="enrolled-search-input-wrap">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                className="enrolled-search-input"
                placeholder="Search by student name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Desktop Table */}
          <div className="enrolled-table-card d-none d-md-block">
            <table className="enrolled-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrolled Date</th>
                  <th>Earned Badges</th>
                  <th>Pending Requests</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      No students match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((item) => (
                    <tr key={item.student?._id || item.enrolled_at}>
                      <td>
                        <div className="enrolled-student-cell">
                          <div className="enrolled-avatar">
                            {getInitials(item.student?.name)}
                          </div>
                          <div>
                            <div className="enrolled-student-name">
                              {item.student?.name || 'Unknown Student'}
                            </div>
                            <div className="enrolled-student-email">
                              {item.student?.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">{formatDate(item.enrolled_at)}</td>
                      <td>
                        <span
                          className={`enrolled-badge-pill ${
                            item.badgeCount > 0 ? 'badges' : 'zero'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-[14px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            military_tech
                          </span>
                          <span>
                            {item.badgeCount}{' '}
                            {item.badgeCount === 1 ? 'badge' : 'badges'}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span
                          className={`enrolled-badge-pill ${
                            item.pendingCount > 0 ? 'pending' : 'zero'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            hourglass_top
                          </span>
                          <span>
                            {item.pendingCount}{' '}
                            {item.pendingCount === 1 ? 'pending' : 'pending'}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="enrolled-mobile-list d-md-none">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-muted bg-white rounded-3 border">
                No students match your search criteria.
              </div>
            ) : (
              filteredStudents.map((item) => (
                <div
                  key={item.student?._id || item.enrolled_at}
                  className="enrolled-mobile-card"
                >
                  <div className="enrolled-student-cell">
                    <div className="enrolled-avatar">
                      {getInitials(item.student?.name)}
                    </div>
                    <div>
                      <div className="enrolled-student-name">
                        {item.student?.name || 'Unknown Student'}
                      </div>
                      <div className="enrolled-student-email">
                        {item.student?.email || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="enrolled-mobile-row">
                    <span className="text-muted">Enrolled:</span>
                    <span>{formatDate(item.enrolled_at)}</span>
                  </div>

                  <div className="enrolled-mobile-row">
                    <span className="text-muted">Badges Earned:</span>
                    <span
                      className={`enrolled-badge-pill ${
                        item.badgeCount > 0 ? 'badges' : 'zero'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[13px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        military_tech
                      </span>
                      <span>{item.badgeCount} badges</span>
                    </span>
                  </div>

                  <div className="enrolled-mobile-row">
                    <span className="text-muted">Pending Reviews:</span>
                    <span
                      className={`enrolled-badge-pill ${
                        item.pendingCount > 0 ? 'pending' : 'zero'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        hourglass_top
                      </span>
                      <span>{item.pendingCount} pending</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EnrolledStudentsPage;
