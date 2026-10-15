import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, CardContent, CardFooter, Chip, Spinner } from '@heroui/react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';

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
    } catch {
      // Quiet fail on polling error
    }
  }, []);

  // Fetch recent notifications for dropdown
  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 10 });
      setNotifications(data.data || []);
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

    if (notif.type === 'badge_approved' || notif.type === 'course_completed') {
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
    <div className="relative inline-flex items-center" ref={containerRef}>
      <Badge.Anchor>
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          onPress={toggleDropdown}
          aria-label="Notifications"
          aria-expanded={isOpen}
          title="Notifications"
          className={`w-9 h-9 text-slate-700 hover:text-primary rounded-xl transition-colors ${isOpen ? 'text-primary' : ''
            }`}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </Button>
        <Badge

          color="danger"
          shape="circle"
          isInvisible={unreadCount === 0}
          size="sm"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      </Badge.Anchor>


      {isOpen && (
        <Card
          className="absolute top-[calc(100%+8px)] right-0 w-[380px] max-w-[92vw] shadow-2xl border border-slate-200/80 rounded-2xl z-50 overflow-hidden"
          role="menu"
        >
          <CardHeader className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-surface-tertiary">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <Chip size="sm" color="primary" variant="flat" className="h-5 text-[11px] px-1 font-semibold">
                  {unreadCount} new
                </Chip>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="light"
                size="sm"
                color="primary"
                onPress={handleMarkAllRead}
                className="text-xs h-7 px-2 font-medium"
              >
                Mark all as read
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0 max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Spinner size="sm" color="primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-6 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  notifications_paused
                </span>
                <p className="text-sm font-semibold text-slate-800 m-0">You're all caught up!</p>
                <p className="text-xs text-slate-500 m-0">No new notifications at this time.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => {
                  const isApproved = notif.type === 'badge_approved';
                  const isCompleted = notif.type === 'course_completed';
                  return (
                    <div
                      key={notif._id}
                      className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer text-left ${!notif.is_read
                        ? 'bg-blue-50/50 hover:bg-blue-50 border-l-3 border-l-primary'
                        : 'bg-white hover:bg-slate-50'
                        }`}
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCompleted || isApproved
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-rose-100 text-rose-600'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isCompleted ? 'workspace_premium' : isApproved ? 'verified' : 'cancel'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs text-slate-900 leading-snug m-0 mb-1 line-clamp-2 ${!notif.is_read ? 'font-semibold' : ''
                            }`}
                        >
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{formatRelativeTime(notif.created_at)}</span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>

          <CardFooter className="p-2 border-t border-slate-200/80 bg-surface-tertiary/60 text-center">
            <Link
              to="/notifications"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary py-1.5 hover:underline"
              onClick={() => setIsOpen(false)}
            >
              <span>View all notifications</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default NotificationBell;
