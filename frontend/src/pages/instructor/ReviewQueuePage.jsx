import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Spinner,
  Avatar,
  Chip,
  Button,
  Alert,
  Select,
  ListBox,
  Label,
} from '@heroui/react';
import api from '../../services/api';
import RequestDetailPage from './RequestDetailPage';

const ReviewQueuePage = () => {
  const { id: routeRequestId } = useParams();
  const [requests, setRequests] = useState([]);
  const [filterCourses, setFilterCourses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        status: statusFilter,
        sort: 'date_desc',
        page,
        limit: 15,
      };
      if (courseFilter && courseFilter !== 'all') {
        params.courseId = courseFilter;
      }

      const res = await api.get('/verification-requests/instructor', { params });
      const list = res.data.data || [];
      setRequests(list);
      setTotal(res.data.total ?? list.length);
      setTotalPages(res.data.totalPages || 1);

      if (res.data.filters?.courses) {
        setFilterCourses(res.data.filters.courses);
      }

      if (res.data.counts) {
        setCounts(res.data.counts);
      }

      // Automatically select first request or routeRequestId if available
      if (list.length > 0) {
        if (routeRequestId) {
          const match = list.find((r) => r._id === routeRequestId);
          setSelectedRequest(match || list[0]);
        } else {
          setSelectedRequest((prev) => {
            if (!prev) return list[0];
            const stillThere = list.find((r) => r._id === prev._id);
            return stillThere || list[0];
          });
        }
      } else {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error('Failed to load verification requests:', err);
      setError('Failed to load verification requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, courseFilter, page, routeRequestId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

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

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* Header (No 4 quick-stat badges per TON-216) */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
              Verification Reviews
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 m-0 mt-0.5">
              Evaluate student submissions, inspect code artifacts, and award badges
            </p>
          </div>

          <Select
            placeholder="All Courses"
            value={courseFilter}
            onChange={(val) => {
              setCourseFilter(val ? String(val) : 'all');
              setPage(1);
            }}
            className="w-full sm:w-60"
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
                {filterCourses.map((c) => {
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
        </header>

        {error && <Alert status="danger">{error}</Alert>}

        {/* Filter Tabs */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'pending', label: 'Pending', count: counts.pending },
            { id: 'approved', label: 'Approved', count: counts.approved },
            { id: 'rejected', label: 'Rejected', count: counts.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${statusFilter === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${statusFilter === tab.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'bg-slate-200/70 text-slate-600'
                  }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Split Workspace */}
        {loading && requests.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-500 text-sm m-0">Loading verification submissions...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 m-0">
              {statusFilter === 'pending'
                ? 'All caught up! No pending reviews.'
                : 'No submissions found'}
            </h3>
            <p className="text-xs text-slate-500 m-0 leading-relaxed max-w-xs">
              {statusFilter === 'pending'
                ? 'When students submit skill evidence for your courses, they will appear in this review queue.'
                : 'Try adjusting your status or course filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Submissions Queue List (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Submissions Queue ({total})</span>
                  <span>{page} of {totalPages}</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
                  {requests.map((req) => {
                    const isSelected = selectedRequest?._id === req._id;
                    const isPending = req.status === 'pending';

                    return (
                      <button
                        key={req._id}
                        type="button"
                        onClick={() => setSelectedRequest(req)}
                        className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${isSelected
                            ? 'bg-indigo-50/70 border-l-3 border-l-primary'
                            : 'hover:bg-slate-50/70'
                          }`}
                      >
                        <Avatar size="sm" className="shrink-0 mt-0.5">
                          {req.student?.avatar && (
                            <Avatar.Image src={req.student.avatar} alt={req.student?.name || 'Student'} />
                          )}
                          <Avatar.Fallback className="rounded-xl border-none bg-gradient-to-br from-pink-500 to-purple-500 text-white font-semibold text-xs">
                            {getInitials(req.student?.name)}
                          </Avatar.Fallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {req.student?.name || 'Unknown Student'}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {formatDate(req.submitted_at)}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                            {req.skill?.name || 'Skill'}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px]">
                            <span className="text-slate-400 truncate max-w-[150px]">
                              {req.course?.name || ''}
                            </span>
                            {req.status === 'approved' ? (
                              <Chip size="sm" color="success" variant="flat" className="text-[10px] h-5 font-semibold">
                                Approved
                              </Chip>
                            ) : req.status === 'rejected' ? (
                              <Chip size="sm" color="danger" variant="flat" className="text-[10px] h-5 font-semibold">
                                Rejected
                              </Chip>
                            ) : (
                              <Chip size="sm" color="warning" variant="flat" className="text-[10px] h-5 font-semibold">
                                Pending
                              </Chip>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                    <Button
                      size="sm"
                      variant="bordered"
                      className="text-xs h-7"
                      isDisabled={page <= 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <span className="text-slate-500 font-medium">Page {page} of {totalPages}</span>
                    <Button
                      size="sm"
                      variant="bordered"
                      className="text-xs h-7"
                      isDisabled={page >= totalPages}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Split Workspace Detail (7 cols) */}
            <div className="lg:col-span-7">
              <RequestDetailPage
                request={selectedRequest}
                onStatusChange={fetchRequests}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQueuePage;
