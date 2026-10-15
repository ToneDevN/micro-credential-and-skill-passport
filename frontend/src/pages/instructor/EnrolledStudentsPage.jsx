import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Spinner, Table, Avatar, Input, Chip, Button, Alert } from '@heroui/react';
import api from '../../services/api';

const EnrolledStudentsPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [courseRes, studentsRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/courses/${courseId}/enrolled-students`, {
            params: { page, limit: 20 },
          }),
        ]);

        if (isMounted) {
          setCourse(courseRes.data.course || null);
          setStudents(studentsRes.data.students || studentsRes.data.data || []);
          setTotal(studentsRes.data.total ?? (studentsRes.data.students || []).length);
          setTotalPages(studentsRes.data.totalPages || 1);
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
  }, [courseId, page]);

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
      <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-8 text-center flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" color="primary" />
        <div className="text-slate-500 text-sm">Loading enrolled students...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link to="/instructor/courses" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>My Courses</span>
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-700 font-semibold truncate max-w-xs">{course?.name || 'Course'}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-bold">Enrolled Students</span>
        </nav>

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
              {course?.name || 'Enrolled Students'}
            </h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">
              Students currently enrolled and their micro-credential progress
            </p>
          </div>
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-xs self-start sm:self-auto text-xs font-semibold text-slate-800">
            <span className="material-symbols-outlined text-[18px] text-primary">group</span>
            <span>
              {total} {total === 1 ? 'Student' : 'Students'}
            </span>
          </div>
        </header>

        {/* Error Banner */}
        {error && <Alert status="danger">{error}</Alert>}

        {total === 0 ? (
          /* Empty State */
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center py-12 px-6 flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">group_off</span>
            </div>
            <h2 className="font-heading font-bold text-lg text-slate-900 m-0">
              ยังไม่มีนักศึกษาลงทะเบียนวิชานี้
            </h2>
            <p className="text-xs text-slate-500 m-0 leading-relaxed">
              No students enrolled in this course yet. When students enroll from Explore Skills, their names, badge progress, and pending requests will appear here.
            </p>
            <div className="flex justify-center gap-2.5 mt-2">
              <Button
                variant="bordered"
                color="primary"
                className="font-medium"
                onPress={() => navigate(`/instructor/courses/${courseId}/skills`)}
              >
                Manage Course Skills
              </Button>
              <Button
                color="primary"
                className="font-medium"
                onPress={() => navigate('/instructor/courses')}
              >
                Back to Courses
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search Filter */}
            <div className="w-full">
              <Input
                type="text"
                placeholder="Search by student name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="bordered"
                size="md"
                className="bg-white rounded-2xl shadow-2xs"
                startContent={<span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>}
              />
            </div>

            {/* Table Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Enrolled Students Table" className="min-w-[650px]">
                      <Table.Header>
                        <Table.Column isRowHeader className="py-3 px-4 font-semibold text-xs text-slate-700">Student</Table.Column>
                        <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Enrolled Date</Table.Column>
                        <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700">Earned Badges</Table.Column>
                        <Table.Column className="py-3 px-4 font-semibold text-xs text-slate-700 pr-5">Pending Requests</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {filteredStudents.length === 0 ? (
                          <Table.Row>
                            <Table.Cell colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                              No students match your search criteria.
                            </Table.Cell>
                          </Table.Row>
                        ) : (
                          filteredStudents.map((item) => (
                            <Table.Row key={item.student?._id || item.enrolled_at} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <Table.Cell className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <Avatar
                                    size="sm"
                                    name={getInitials(item.student?.name)}
                                    className="bg-indigo-100 text-indigo-700 font-bold text-xs"
                                  />
                                  <div>
                                    <div className="font-bold text-slate-900 text-sm">
                                      {item.student?.name || 'Unknown Student'}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      {item.student?.email || '—'}
                                    </div>
                                  </div>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="py-3.5 px-4 text-xs text-slate-500">
                                {formatDate(item.enrolled_at)}
                              </Table.Cell>
                              <Table.Cell className="py-3.5 px-4 text-xs">
                                {item.badgeCount > 0 ? (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="success"
                                    className="text-[11px] font-semibold"
                                    startContent={<span className="material-symbols-outlined text-[14px] mr-0.5">military_tech</span>}
                                  >
                                    {item.badgeCount} {item.badgeCount === 1 ? 'badge' : 'badges'}
                                  </Chip>
                                ) : (
                                  <span className="text-slate-400">0 badges</span>
                                )}
                              </Table.Cell>
                              <Table.Cell className="py-3.5 px-4 pr-5 text-xs">
                                {item.pendingCount > 0 ? (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="warning"
                                    className="text-[11px] font-semibold"
                                    startContent={<span className="material-symbols-outlined text-[14px] mr-0.5">hourglass_top</span>}
                                  >
                                    {item.pendingCount} pending
                                  </Chip>
                                ) : (
                                  <span className="text-slate-400">None</span>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          ))
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No students match your search criteria.
                  </div>
                ) : (
                  filteredStudents.map((item) => (
                    <div
                      key={item.student?._id || item.enrolled_at}
                      className="p-4 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          size="sm"
                          name={getInitials(item.student?.name)}
                          className="bg-indigo-100 text-indigo-700 font-bold text-xs"
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            {item.student?.name || 'Unknown Student'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.student?.email || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">Enrolled:</span>
                        <span className="text-slate-600">{formatDate(item.enrolled_at)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {item.badgeCount > 0 ? (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="success"
                            className="text-[10px] h-5"
                            startContent={<span className="material-symbols-outlined text-[12px] mr-0.5">military_tech</span>}
                          >
                            {item.badgeCount} badges
                          </Chip>
                        ) : (
                          <span className="text-slate-400 text-xs">0 badges</span>
                        )}

                        {item.pendingCount > 0 ? (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="warning"
                            className="text-[10px] h-5"
                            startContent={<span className="material-symbols-outlined text-[12px] mr-0.5">hourglass_top</span>}
                          >
                            {item.pendingCount} pending
                          </Chip>
                        ) : (
                          <span className="text-slate-400 text-xs">No pending</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">
                    Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} students
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => setPage((prev) => Math.max(1, prev - 1))}
                      isDisabled={page <= 1}
                      className="text-xs h-7"
                    >
                      Previous
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={p === page ? 'solid' : 'light'}
                        color={p === page ? 'primary' : 'default'}
                        onPress={() => setPage(p)}
                        className="text-xs min-w-7 h-7 px-2 font-semibold"
                      >
                        {p}
                      </Button>
                    ))}

                    <Button
                      size="sm"
                      variant="bordered"
                      onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      isDisabled={page >= totalPages}
                      className="text-xs h-7"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnrolledStudentsPage;
