import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Spinner,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  ProgressBar,
  Tooltip
} from '@heroui/react';
import api from '../services/api';

const MyCoursesSection = ({ onRefreshPassport }) => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/students/me/enrollments');
      setEnrollments(res.data.enrollments || []);
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
      setError('Unable to load your enrolled courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleUnenroll = async (courseId) => {
    if (!window.confirm('Are you sure you want to unenroll from this course?')) {
      return;
    }
    try {
      setActionLoadingId(courseId);
      await api.put(`/courses/${courseId}/unenroll`);
      await fetchEnrollments();
      if (onRefreshPassport) onRefreshPassport();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to unenroll from course.';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (courseId) => {
    setExpandedCourseId((prev) => (prev === courseId ? null : courseId));
  };

  if (loading) {
    return (
      <section className="mb-6" aria-label="My Enrolled Courses">
        <Card className="text-center py-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-2 p-0">
            <Spinner size="sm" color="primary" />
            <p className="text-slate-500 text-xs m-0">Loading your enrolled courses...</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-6" aria-label="My Enrolled Courses">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-between text-xs">
          <span>{error}</span>
          <Button
            size="sm"
            variant="secondary"
            onPress={fetchEnrollments}
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card className="text-center py-10 px-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-0 max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
          <h3 className="font-heading font-bold text-base text-slate-900 m-0">
            You haven&apos;t enrolled in any courses yet
          </h3>
          <p className="text-slate-500 text-xs m-0 leading-relaxed">
            Browse Explore Skills to get started. Enrolling allows you to bookmark courses and track your skill completion here.
          </p>
          <Button
            color="primary"
            size="sm"
            className="mt-1 font-semibold"
            onPress={() => navigate('/explore')}
          >
            Browse Explore Skills
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {enrollments.map((item) => {
        const course = item.course || {};
        const total = item.totalCount || 0;
        const earned = item.earnedCount || 0;
        const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
        const isCompleted = item.status === 'completed' || (total > 0 && earned >= total);
        const isProcessing = actionLoadingId === course._id;
        const isExpanded = expandedCourseId === course._id;

        return (
          <Card
            key={item._id || course._id}
            className={`bg-white border rounded-2xl shadow-sm transition-all hover:shadow-md ${
              isCompleted ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200/80'
            }`}
          >
            {/* Course Face: Title + ProgressBar only */}
            <CardHeader className="p-4 pb-2 flex flex-col gap-2">
              <div className="flex items-center justify-between w-full">
                <h3 className="font-heading font-bold text-base text-slate-900 m-0 line-clamp-1 flex-1 pr-2">
                  {course.name || 'Untitled Course'}
                </h3>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Share progress button with tooltip */}
                  <Tooltip delay={0}>
                    <Tooltip.Trigger
                      aria-label="Share course progress"
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(`${window.location.origin}/explore?search=${encodeURIComponent(course.name || '')}`);
                          alert('Copied course link to clipboard!');
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                    </Tooltip.Trigger>
                    <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm">
                      <p className="m-0">Share course progress</p>
                    </Tooltip.Content>
                  </Tooltip>

                  {/* Expand / Collapse toggle */}
                  <Tooltip delay={0}>
                    <Tooltip.Trigger
                      aria-label={isExpanded ? 'Collapse course details' : 'Expand course details'}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      onClick={() => toggleExpand(course._id)}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm">
                      <p className="m-0">{isExpanded ? 'Hide details' : 'Show details'}</p>
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-4 py-3">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-500 font-medium">Progress</span>
                <span className="text-slate-700 font-bold">{percent}%</span>
              </div>
              <ProgressBar
                value={percent}
                color={isCompleted ? 'success' : 'primary'}
                aria-label={`Progress for ${course.name}`}
                className="h-2 rounded-full"
              />
            </CardContent>

            {/* Metadata moved behind an expand toggle */}
            {isExpanded && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 space-y-2.5 text-xs text-slate-600 animate-in fade-in duration-200">
                {course.description && (
                  <p className="m-0 text-slate-500 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                )}
                <div className="flex justify-between items-center text-slate-700">
                  <span>Skills completed:</span>
                  <span className="font-semibold">{earned} / {total}</span>
                </div>
                {course.instructor && (
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Instructor:</span>
                    <span className="font-semibold">{course.instructor.name || course.instructor}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs h-7 px-2.5 font-medium"
                    onPress={() => navigate(`/explore?search=${encodeURIComponent(course.name || '')}`)}
                  >
                    View Skills
                  </Button>
                  {!isCompleted && (
                    <Button
                      size="sm"
                      variant="tertiary"
                      className="text-rose-600 hover:text-rose-700 text-xs h-7 px-2 font-medium"
                      onPress={() => handleUnenroll(course._id)}
                      isDisabled={isProcessing}
                      isLoading={isProcessing}
                    >
                      Unenroll
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default MyCoursesSection;
