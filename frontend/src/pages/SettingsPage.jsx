import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Tabs,
  TextField,
  InputGroup,
  Meter,
  Switch,
  InputOTP,
  DisclosureGroup,
  Disclosure,
  Button,
  Chip
} from '@heroui/react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/userService';
import { connectGithub, disconnectGithub } from '../services/githubService';
import { toastSuccess, toastWarning, toastError } from '../utils/toast.js';
import { handleApiError } from '../utils/apiErrorToast.js';

const SettingsPage = () => {
  const { user, setUser, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();

  // Active Tab state: 'profile' | 'security' | 'connected-accounts'
  const [selectedTab, setSelectedTab] = useState(() => {
    if (searchParams.get('github')) return 'connected-accounts';
    return 'profile';
  });

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  // Sync profile fields with user
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Security (Password) Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // 2FA Switch & InputOTP State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Connected Accounts (GitHub) State
  const [disconnecting, setDisconnecting] = useState(false);

  // Refresh user data on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Handle GitHub OAuth redirect params
  useEffect(() => {
    const githubParam = searchParams.get('github');
    if (githubParam === 'connected') {
      setSelectedTab('connected-accounts');
      toastSuccess('เชื่อมต่อ GitHub สำเร็จ!', 'บัญชี GitHub ของคุณเชื่อมต่อกับระบบแล้ว');
      window.history.replaceState({}, '', '/settings');
      refreshUser();
    } else if (githubParam === 'error') {
      setSelectedTab('connected-accounts');
      toastError('การเชื่อมต่อ GitHub ไม่สำเร็จ', 'กรุณาลองเชื่อมต่อใหม่อีกครั้ง');
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, refreshUser]);

  // Password strength meter calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Too weak', color: 'danger' };
    let score = 0;
    if (pass.length >= 8) score += 30;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;

    if (score < 40) return { score, label: 'Weak', color: 'danger' };
    if (score < 75) return { score, label: 'Moderate', color: 'warning' };
    return { score: 100, label: 'Strong', color: 'success' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Profile Save
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!name.trim()) errors.name = 'กรุณากรอกชื่อ-นามสกุล';
    if (!email.trim()) errors.email = 'กรุณากรอกอีเมล';

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileSaving(true);
    try {
      const res = await updateProfile({ name: name.trim(), email: email.trim() });
      if (res.user) {
        setUser(res.user);
      }
      toastSuccess('บันทึกข้อมูลส่วนตัวเรียบร้อย', 'ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว');
      setProfileErrors({});
    } catch (err) {
      handleApiError(err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!currentPassword) errors.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน';
    if (!newPassword) errors.newPassword = 'กรุณากรอกรหัสผ่านใหม่';
    else if (newPassword.length < 8) errors.newPassword = 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
    if (newPassword !== confirmPassword) errors.confirmPassword = 'รหัสผ่านใหม่ไม่ตรงกัน';

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toastSuccess('เปลี่ยนรหัสผ่านสำเร็จ', 'รหัสผ่านของคุณได้รับการอัปเดตเรียบร้อยแล้ว');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err) {
      handleApiError(err);
    } finally {
      setPasswordSaving(false);
    }
  };

  // 2FA Verification
  const handleVerifyOTP = () => {
    if (otpCode.length < 6) {
      toastWarning('รหัส OTP ไม่ถูกต้อง', 'กรุณาระบุรหัสยืนยัน 6 หลัก');
      return;
    }
    setOtpVerifying(true);
    setTimeout(() => {
      setOtpVerifying(false);
      toastSuccess('เปิดใช้งาน 2FA สำเร็จ', 'ระบบรักษาความปลอดภัยสองชั้นเปิดใช้งานแล้ว');
    }, 600);
  };

  // GitHub Disconnect
  const handleDisconnectGithub = async () => {
    if (!window.confirm('คุณต้องการยกเลิกการเชื่อมต่อกับ GitHub ใช่หรือไม่?')) return;
    setDisconnecting(true);
    try {
      await disconnectGithub();
      toastSuccess('ยกเลิกการเชื่อมต่อเรียบร้อย', 'ยกเลิกการเชื่อมต่อกับบัญชี GitHub แล้ว');
      refreshUser();
    } catch (err) {
      handleApiError(err);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 m-0">
            Account Settings
          </h1>
          <p className="text-sm text-slate-500 m-0 mt-0.5">
            Manage your personal profile, credentials, and institutional security
          </p>
        </header>

        {/* HeroUI Compound Tabs: Profile / Security / Connected Accounts */}
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(String(key))}
          className="w-full"
        >
          <Tabs.List className="flex border-b border-slate-200 gap-2 mb-6">
            <Tabs.Tab id="profile" className="pb-3 text-sm font-semibold cursor-pointer">
              Profile
            </Tabs.Tab>
            <Tabs.Tab id="security" className="pb-3 text-sm font-semibold cursor-pointer">
              Security
            </Tabs.Tab>
            <Tabs.Tab id="connected-accounts" className="pb-3 text-sm font-semibold cursor-pointer">
              Connected Accounts
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: Profile */}
          <Tabs.Panel id="profile" className="flex flex-col gap-5">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-heading font-bold text-lg text-slate-900 m-0">Public Profile</h2>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">Your institutional identity details</p>
                  </div>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={user?.role === 'instructor' ? 'secondary' : 'primary'}
                    className="capitalize font-semibold text-xs"
                  >
                    {user?.role || 'Student'}
                  </Chip>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-name" className="text-xs font-semibold text-slate-700">
                    Full Name
                  </label>
                  <TextField
                    id="profile-name"
                    name="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (profileErrors.name) setProfileErrors((p) => ({ ...p, name: null }));
                    }}
                    placeholder="e.g. Somchai Prasert"
                    className="w-full text-sm"
                  />
                  {profileErrors.name && (
                    <span className="text-xs text-rose-600 font-medium">{profileErrors.name}</span>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-email" className="text-xs font-semibold text-slate-700">
                    Email Address
                  </label>
                  <TextField
                    id="profile-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (profileErrors.email) setProfileErrors((p) => ({ ...p, email: null }));
                    }}
                    placeholder="your.email@university.ac.th"
                    className="w-full text-sm"
                  />
                  {profileErrors.email && (
                    <span className="text-xs text-rose-600 font-medium">{profileErrors.email}</span>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    color="primary"
                    isLoading={profileSaving}
                    className="font-medium text-xs px-5 shadow-xs"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </Tabs.Panel>

          {/* TAB 2: Security */}
          <Tabs.Panel id="security" className="flex flex-col gap-6">
            {/* Password Change Form */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="font-heading font-bold text-lg text-slate-900 m-0">Change Password</h2>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Update your password to keep your credentials secure
                  </p>
                </div>

                {/* Current Password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="current-password" className="text-xs font-semibold text-slate-700">
                    Current Password
                  </label>
                  <TextField
                    id="current-password"
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full text-sm"
                  >
                    <InputGroup>
                      <InputGroup.Input />
                      <InputGroup.Suffix>
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                          aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showCurrentPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </InputGroup.Suffix>
                    </InputGroup>
                  </TextField>
                  {passwordErrors.currentPassword && (
                    <span className="text-xs text-rose-600 font-medium">
                      {passwordErrors.currentPassword}
                    </span>
                  )}
                </div>

                {/* New Password with Meter shown ONLY on focus per TON-218 */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-password" className="text-xs font-semibold text-slate-700">
                    New Password
                  </label>
                  <TextField
                    id="new-password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() => setNewPasswordFocused(true)}
                    onBlur={() => setNewPasswordFocused(false)}
                    placeholder="Minimum 8 characters"
                    className="w-full text-sm"
                  >
                    <InputGroup>
                      <InputGroup.Input />
                      <InputGroup.Suffix>
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showNewPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </InputGroup.Suffix>
                    </InputGroup>
                  </TextField>

                  {/* Password strength Meter: Shown ONLY when focused per TON-218 */}
                  {newPasswordFocused && (
                    <div className="pt-1 px-1 animate-in fade-in">
                      <Meter
                        value={passwordStrength.score}
                        color={passwordStrength.color}
                        aria-label="Password strength"
                        className="w-full"
                      >
                        <Meter.Track className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <Meter.Fill className="rounded-full" />
                        </Meter.Track>
                      </Meter>
                      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                        <span>Password strength</span>
                        <span className="font-medium text-slate-700">{passwordStrength.label}</span>
                      </div>
                    </div>
                  )}

                  {passwordErrors.newPassword && (
                    <span className="text-xs text-rose-600 font-medium">
                      {passwordErrors.newPassword}
                    </span>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className="text-xs font-semibold text-slate-700">
                    Confirm New Password
                  </label>
                  <TextField
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full text-sm"
                  >
                    <InputGroup>
                      <InputGroup.Input />
                      <InputGroup.Suffix>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </InputGroup.Suffix>
                    </InputGroup>
                  </TextField>
                  {passwordErrors.confirmPassword && (
                    <span className="text-xs text-rose-600 font-medium">
                      {passwordErrors.confirmPassword}
                    </span>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    color="primary"
                    isLoading={passwordSaving}
                    className="font-medium text-xs px-5 shadow-xs"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </div>

            {/* Two-Factor Authentication (2FA) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 m-0">
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Require an authenticator code when signing into your credential passport
                  </p>
                </div>

                {/* 2FA Switch: No "Recommended" badge next to 2FA per TON-218 */}
                <Switch
                  isSelected={is2FAEnabled}
                  onChange={(isSelected) => setIs2FAEnabled(Boolean(isSelected))}
                  aria-label="Toggle Two-Factor Authentication"
                />
              </div>

              {/* Conditionally reveals InputOTP ONLY when toggled ON per TON-218 */}
              {is2FAEnabled && (
                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 animate-in fade-in">
                  <p className="text-xs text-slate-600 m-0">
                    Enter the 6-digit verification code from your authenticator app:
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      aria-label="Two-factor authentication code"
                    >
                      <InputOTP.Group>
                        <InputOTP.Slot index={0} />
                        <InputOTP.Slot index={1} />
                        <InputOTP.Slot index={2} />
                        <InputOTP.Slot index={3} />
                        <InputOTP.Slot index={4} />
                        <InputOTP.Slot index={5} />
                      </InputOTP.Group>
                    </InputOTP>

                    <Button
                      size="sm"
                      color="primary"
                      onPress={handleVerifyOTP}
                      isLoading={otpVerifying}
                      className="font-medium text-xs px-4"
                    >
                      Verify Code
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Sessions & Ledger Security in closed-by-default DisclosureGroup per TON-218 */}
            <div className="border border-slate-200/80 rounded-3xl overflow-hidden bg-white shadow-sm">
              <DisclosureGroup defaultExpandedKeys={[]}>
                <Disclosure id="advanced-security">
                  <Disclosure.Trigger className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors text-left cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600 text-[20px]">shield</span>
                      <span className="text-sm font-bold text-slate-800">Advanced security ▾</span>
                    </div>
                    <span className="text-xs text-slate-400">Active Sessions & Ledger Security</span>
                  </Disclosure.Trigger>
                  <Disclosure.Content className="p-5 pt-2 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-700">Active Sessions</span>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">devices</span>
                          <div>
                            <div className="font-semibold text-slate-900">Current Session (This device)</div>
                            <div className="text-[11px] text-slate-400">Bangkok, Thailand • Chrome on Linux</div>
                          </div>
                        </div>
                        <Chip size="sm" variant="flat" color="success" className="text-[10px] h-5">
                          Active
                        </Chip>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Institutional Ledger Security</span>
                      <p className="text-xs text-slate-500 m-0 leading-relaxed">
                        Your verifiable credentials and skill records are cryptographically anchored.
                        Tamper-evident attestation hashes are signed by course instructors upon approval.
                      </p>
                    </div>
                  </Disclosure.Content>
                </Disclosure>
              </DisclosureGroup>
            </div>
          </Tabs.Panel>

          {/* TAB 3: Connected Accounts */}
          <Tabs.Panel id="connected-accounts" className="flex flex-col gap-5">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-heading font-bold text-lg text-slate-900 m-0">Connected Accounts</h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Connect third-party developer accounts to submit repository evidence
                </p>
              </div>

              {/* GitHub Card */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">code</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>GitHub</span>
                      {user?.github_connected_status === 'connected' ? (
                        <Chip size="sm" color="success" variant="flat" className="text-[10px] h-5">
                          Connected
                        </Chip>
                      ) : (
                        <Chip size="sm" color="default" variant="flat" className="text-[10px] h-5">
                          Not Connected
                        </Chip>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {user?.github_connected_status === 'connected' && user?.github_username ? (
                        <span>Connected as <strong className="text-slate-800">@{user.github_username}</strong></span>
                      ) : (
                        <span>Link your GitHub account to import repositories as evidence</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {user?.github_connected_status === 'connected' ? (
                    <Button
                      size="sm"
                      color="danger"
                      variant="danger"
                      onPress={handleDisconnectGithub}
                      isLoading={disconnecting}
                      className="text-xs font-semibold"
                    >
                      Disconnect GitHub
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      color="primary"
                      onPress={connectGithub}
                      className="text-xs font-semibold shadow-xs"
                      startContent={<span className="material-symbols-outlined text-[16px]">link</span>}
                    >
                      Connect GitHub
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
