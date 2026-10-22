import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListBox,
  ListBoxItem,
  Button,
  Chip,
  Spinner,
  Alert
} from '@heroui/react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import { formatRelativeTime } from '../components/NotificationBell';
import { toastSuccess } from '../utils/toast.js';
import { useAuth } from '../context/AuthContext';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'verification' | 'course'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(typeof data.count === 'number' ? data.count : 0);
    } catch {
      // Quiet fail
    }
  }, []);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: 1,
        limit: 50,
      };
      if (filter === 'unread') {
        params.unread = 'true';
      }

      const data = await getNotifications(params);
      let items = data.data || [];

      // Client-side filtering for category types
      if (filter === 'verification') {
        items = items.filter((n) =>
          /verification|submission|review/i.test(n.type || n.title || '')
        );
      } else if (filter === 'course') {
        items = items.filter((n) =>
          /course|enrolled|enrollment/i.test(n.type || n.title || '')
        );
      }

      setNotifications(items);
    } catch (err) {
      console.error('[NotificationsPage] load error:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark single as read
  const handleItemClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigation link based on notification type
    if (notification.link) {
      navigate(notification.link);
    } else if (/verification|submission|request/i.test(notification.type || '')) {
      if (user?.role === 'instructor') {
        navigate(notification.related_id ? `/instructor/requests/${notification.related_id}` : '/instructor/requests');
      } else {
        navigate('/student/my-requests');
      }
    } else if (/badge/i.test(notification.type || '')) {
      navigate('/student/passport');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 && notifications.every((n) => n.is_read)) return;

    setActionLoading(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toastSuccess('ทำเครื่องหมายว่าอ่านแล้วทั้งหมด', 'การแจ้งเตือนทั้งหมดถูกตั้งเป็นอ่านแล้ว');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Determine type-based accent style (success-soft / danger-soft / gold / neutral per TON-218)
  const getAccentDetails = (item) => {
    const typeStr = (item.type || item.title || '').toLowerCase();

    if (typeStr.includes('approved') || typeStr.includes('success')) {
      return {
        accentClass: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
        iconBg: 'bg-emerald-100 text-emerald-700',
        icon: 'verified',
        badgeColor: 'success',
      };
    }
    if (typeStr.includes('rejected') || typeStr.includes('declined') || typeStr.includes('error')) {
      return {
        accentClass: 'bg-rose-50/70 border-rose-200 text-rose-950',
        iconBg: 'bg-rose-100 text-rose-700',
        icon: 'cancel',
        badgeColor: 'danger',
      };
    }
    if (typeStr.includes('verification') || typeStr.includes('request') || typeStr.includes('submission')) {
      return {
        accentClass: 'bg-indigo-50/70 border-indigo-200 text-indigo-950',
        iconBg: 'bg-indigo-100 text-indigo-700',
        icon: 'rate_review',
        badgeColor: 'primary',
      };
    }
    if (typeStr.includes('badge') || typeStr.includes('credential') || typeStr.includes('milestone')) {
      return {
        accentClass: 'bg-amber-50/70 border-amber-200 text-amber-950',
        iconBg: 'bg-amber-100 text-amber-700',
        icon: 'military_tech',
        badgeColor: 'warning',
      };
    }
    return {
      accentClass: 'bg-white border-slate-200 text-slate-900',
      iconBg: 'bg-slate-100 text-slate-600',
      icon: 'notifications',
      badgeColor: 'default',
    };
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header with Filter & Mark all as read */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <Chip size="sm" color="primary" variant="solid" className="text-xs font-bold h-5">
                  {unreadCount} unread
                </Chip>
              )}
            </div>
            <p className="text-sm text-slate-500 m-0 mt-0.5">
              Stay updated on verification evaluations, badge issuances, and courses
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* Filter select (All / Unread / Verification Updates / Course Updates per TON-218) */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white border border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none transition-all shadow-2xs cursor-pointer font-medium"
              aria-label="Filter notifications"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="verification">Verification Updates</option>
              <option value="course">Course Updates</option>
            </select>

            {/* Mark all as read button per TON-218 */}
            <Button
              size="sm"
              variant="bordered"
              onPress={handleMarkAllRead}
              isLoading={actionLoading}
              isDisabled={unreadCount === 0}
              className="text-xs font-semibold h-8"
              startContent={
                !actionLoading && <span className="material-symbols-outlined text-[16px]">done_all</span>
              }
            >
              Mark all as read
            </Button>
          </div>
        </header>

        {error && <Alert status="danger">{error}</Alert>}

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" color="primary" />
            <p className="text-slate-500 text-sm m-0">Loading your notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-3xl">notifications_off</span>
            </div>
            <h3 className="font-heading font-bold text-lg text-slate-900 m-0">No notifications</h3>
            <p className="text-xs text-slate-500 m-0 leading-relaxed max-w-xs">
              {filter === 'unread'
                ? 'You have read all your notifications!'
                : 'When verification requests are evaluated or badges are awarded, you will see notifications here.'}
            </p>
          </div>
        ) : (
          /* ListBox of notification items with type-based accents & unread dots per TON-218 */
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden p-3">
            <ListBox
              aria-label="Notifications List"
              selectionMode="none"
              className="w-full flex flex-col gap-2 p-0"
            >
              {notifications.map((item) => {
                const accent = getAccentDetails(item);
                const isUnread = !item.is_read;

                return (
                  <ListBoxItem
                    key={item._id}
                    id={item._id}
                    textValue={item.title || 'Notification'}
                    onPress={() => handleItemClick(item)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      accent.accentClass
                    } ${isUnread ? 'shadow-2xs font-medium' : 'opacity-85'}`}
                  >
                    {/* Unread Dot Indicator per TON-218 */}
                    <div className="pt-2 shrink-0">
                      {isUnread ? (
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"
                          title="Unread notification"
                        />
                      ) : (
                        <div className="w-2.5 h-2.5" />
                      )}
                    </div>

                    {/* Icon with Soft Accent */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent.iconBg}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{accent.icon}</span>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 truncate">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(item.created_at || item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 m-0 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </ListBoxItem>
                );
              })}
            </ListBox>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
