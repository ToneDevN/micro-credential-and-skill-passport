import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import './NotificationBell.css';

/**
 * Format relative time string (e.g. "2 hours ago", "Just now")
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(typeof data.count === 'number' ? data.count : 0);
    } catch (err) {
      // Quiet fail on polling error
    }
  }, []);

  // Fetch recent notifications for dropdown
  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 10 });
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('[NotificationBell] failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count on mount and every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // When dropdown opens, fetch latest notifications and sync count
  useEffect(() => {
    if (isOpen) {
      fetchRecentNotifications();
      fetchUnreadCount();
    }
  }, [isOpen, fetchRecentNotifications, fetchUnreadCount]);

  // Click outside and ESC key handlers
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notif) => {
    // If unread, mark as read
    if (!notif.is_read) {
      try {
        await markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('[NotificationBell] markAsRead error:', err);
      }
    }

    setIsOpen(false);

    // Navigate to related destination
    if (notif.type === 'badge_approved') {
      navigate('/student/passport');
    } else if (notif.type === 'badge_rejected') {
      navigate('/student/my-requests');
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationBell] markAllAsRead error:', err);
    }
  };

  return (
    <div className="notification-bell-container" ref={containerRef}>
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        aria-label="Notifications"
        aria-expanded={isOpen}
        title="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="notification-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-header">
            <div className="notification-dropdown-title">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="notification-count-tag">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-dropdown-list">
            {loading ? (
              <div className="notification-loading-state">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty-state">
                <span className="material-symbols-outlined notification-empty-icon">
                  notifications_paused
                </span>
                <p className="notification-empty-title">You're all caught up!</p>
                <p className="notification-empty-desc">
                  No new notifications at this time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isApproved = notif.type === 'badge_approved';
                return (
                  <div
                    key={notif._id}
                    className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                    role="menuitem"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleNotificationClick(notif);
                      }
                    }}
                  >
                    <div
                      className={`notification-item-icon-wrapper ${
                        isApproved ? 'approved' : 'rejected'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {isApproved ? 'verified' : 'cancel'}
                      </span>
                    </div>

                    <div className="notification-item-body">
                      <p className="notification-item-message">{notif.message}</p>
                      <div className="notification-item-footer">
                        <span className="notification-item-time">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                        {!notif.is_read && <span className="notification-unread-dot"></span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="notification-dropdown-footer">
            <Link
              to="/notifications"
              className="notification-view-all-link"
              onClick={() => setIsOpen(false)}
            >
              <span>View all notifications</span>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
