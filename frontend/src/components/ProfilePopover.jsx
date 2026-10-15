import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Chip, Popover } from '@heroui/react';
import { useAuth } from '../context/AuthContext';
import { toastSuccess } from '../utils/toast.js';

const ProfilePopover = ({ onLogout }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await logout();
      toastSuccess('ออกจากระบบแล้ว', 'กลับมาใหม่เมื่อพร้อม');
      navigate('/login');
    }
  };

  const getUserInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const userInitial = getUserInitials(user?.name);

  return (
    <Popover>
      <Button
        variant="tertiary"
        aria-label="Open user profile menu"
        className="h-auto p-1 pl-1.5 pr-2.5 rounded-xl transition-colors text-inherit font-normal cursor-pointer border border-transparent hover:border-slate-200"
      >
        <Avatar>
          <Avatar.Fallback className="rounded-xl border-none bg-gradient-to-br from-pink-500 to-purple-500 text-white">
            {userInitial}
          </Avatar.Fallback>
        </Avatar>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-900 leading-tight">
            {user?.name}
          </span>
        </div>
        <span className="material-symbols-outlined text-slate-400 text-lg">
          arrow_drop_down
        </span>
      </Button>

      <Popover.Content
        placement="bottom end"
        offset={8}
        className="w-64 p-0 shadow-xl border border-slate-200/80 rounded-2xl bg-white overflow-hidden z-50"
      >
        <Popover.Dialog className="p-0 outline-none">
          {({ close }) => (
            <>
              {/* User Profile Header */}
              <div className="p-3.5 bg-surface-tertiary border-b border-slate-200/80 flex items-center gap-3">
                <Avatar size="md" className="w-10 h-10 shrink-0">
                  <Avatar.Fallback className="rounded-xl border-none bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold text-sm">
                    {userInitial}
                  </Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {user?.name}
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    {user?.email || (user?.role === 'instructor' ? 'Instructor Account' : 'Student Account')}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="p-1.5 flex flex-col gap-0.5">
                {user?.role === 'student' && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                    onClick={() => {
                      close();
                      navigate('/student/passport');
                    }}
                  >
                    <span className="material-symbols-outlined text-slate-500 text-[18px]">badge</span>
                    <span>Skill Passport</span>
                  </button>
                )}

                {user?.role === 'instructor' && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                    onClick={() => {
                      close();
                      navigate('/instructor/courses');
                    }}
                  >
                    <span className="material-symbols-outlined text-slate-500 text-[18px]">school</span>
                    <span>Manage Courses</span>
                  </button>
                )}

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                  onClick={() => {
                    close();
                    navigate('/settings');
                  }}
                >
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">settings</span>
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-slate-100"></div>

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
                  onClick={() => {
                    close();
                    handleLogout();
                  }}
                >
                  <span className="material-symbols-outlined text-red-500 text-[18px]">logout</span>
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
};

export default ProfilePopover;
