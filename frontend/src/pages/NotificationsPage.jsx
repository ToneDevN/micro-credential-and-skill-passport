import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import { formatRelativeTime } from '../components/NotificationBell';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const limit = 10;

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(typeof data.count === 'number' ? data.count : 0);
    } catch (err) {
      // Quiet fail
    }
  }, []);

  // Load notifications
  const loadNotifications = useCallback(
    async (currentPage = 1, tab = activeTab) => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page: currentPage,
          limit,
          ...(tab === 'unread' ? { unread: 'true' } : {}),
        };
        const data = await getNotifications(params);
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
        setPage(data.page || currentPage);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        console.error('[NotificationsPage] load error:', err);
        setError('Failed to load notifications. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [activeTab, limit]
  );

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    setPage(1);
    loadNotifications(1, activeTab);
  }, [activeTab, loadNotifications]);

  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (activeTab === 'unread') {
        // Reload if currently on unread tab
        loadNotifications(1, 'unread');
      }
    } catch (err) {
      console.error('[NotificationsPage] markAllAsRead error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRowClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('[NotificationsPage] markAsRead error:', err);
      }
    }

    if (notif.type === 'badge_approved') {
      navigate('/student/passport');
    } else if (notif.type === 'badge_rejected') {
      navigate('/student/my-requests');
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      const prevPage = page - 1;
      setPage(prevPage);
      loadNotifications(prevPage, activeTab);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadNotifications(nextPage, activeTab);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="notifications-page-container">
      {/* Header */}
      <div className="notifications-header">
        <div className="notifications-title-area">
          <h1>Notifications</h1>
          <p>Stay updated on your credential requests and badge approvals</p>
        </div>

        <div className="notifications-actions">
          <button
            type="button"
            className="notifications-mark-read-btn"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || actionLoading}
            title="Mark all notifications as read"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              done_all
            </span>
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Card */}
      <div className="notifications-tabs-card">
        <div className="notifications-filter-bar">
          <button
            type="button"
            className={`notifications-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <span>All</span>
          </button>
          <button
            type="button"
            className={`notifications-tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => handleTabChange('unread')}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="notifications-tab-badge">{unreadCount}</span>
            )}
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-danger">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => loadNotifications(page, activeTab)}
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-page-empty">
            <span className="material-symbols-outlined notifications-page-empty-icon">
              {activeTab === 'unread' ? 'mark_chat_read' : 'notifications_none'}
            </span>
            <h3>
              {activeTab === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </h3>
            <p>
              {activeTab === 'unread'
                ? "You've read all your notifications! Check back later for updates on your submissions."
                : 'When instructors review your verification requests or issue badges, alerts will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <ul className="notifications-page-list">
              {notifications.map((notif) => {
                const isApproved = notif.type === 'badge_approved';
                return (
                  <li
                    key={notif._id}
                    className={`notifications-page-row ${!notif.is_read ? 'unread' : ''}`}
                    onClick={() => handleRowClick(notif)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleRowClick(notif);
                      }
                    }}
                  >
                    <div
                      className={`notifications-row-icon-container ${
                        isApproved ? 'approved' : 'rejected'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                        {isApproved ? 'verified' : 'cancel'}
                      </span>
                    </div>

                    <div className="notifications-row-content">
                      <div className="notifications-row-header">
                        <span
                          className={`notifications-row-type ${
                            isApproved ? 'approved' : 'rejected'
                          }`}
                        >
                          {isApproved ? 'Badge Approved' : 'Request Update'}
                        </span>
                        <span className="notifications-row-time">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="notifications-row-message">{notif.message}</p>
                    </div>

                    <div className="notifications-row-indicator">
                      {!notif.is_read && (
                        <span className="notifications-row-unread-dot"></span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination Bar */}
            {total > limit && (
              <div className="notifications-pagination-bar">
                <span className="notifications-pagination-info">
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, total)} of {total}
                </span>
                <div className="notifications-pagination-controls">
                  <button
                    type="button"
                    className="notifications-page-btn"
                    onClick={handlePrevPage}
                    disabled={page <= 1}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      chevron_left
                    </span>
                    <span>Previous</span>
                  </button>
                  <span className="mx-2 small text-muted">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="notifications-page-btn"
                    onClick={handleNextPage}
                    disabled={!hasMore}
                  >
                    <span>Next</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
