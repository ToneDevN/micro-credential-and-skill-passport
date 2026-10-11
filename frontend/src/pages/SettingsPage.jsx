import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { connectGithub, disconnectGithub } from '../services/githubService';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: string }
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const githubParam = searchParams.get('github');
    if (githubParam === 'connected') {
      setAlert({
        type: 'success',
        message: 'เชื่อมต่อ GitHub สำเร็จ!',
      });
      // Clear query param and refresh user
      window.history.replaceState({}, '', '/settings');
      refreshUser();
    } else if (githubParam === 'error') {
      setAlert({
        type: 'error',
        message: 'การเชื่อมต่อ GitHub ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      });
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, refreshUser]);


  const handleConnect = () => {
    connectGithub();
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm('ต้องการยกเลิกการเชื่อมต่อ GitHub ใช่หรือไม่?');
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await disconnectGithub();
      await refreshUser();
      setAlert({
        type: 'success',
        message: 'ยกเลิกการเชื่อมต่อ GitHub เรียบร้อยแล้ว',
      });
    } catch (err) {
      console.error('[Settings] disconnect error:', err);
      setAlert({
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = user?.github_connected_status === 'connected';

  return (
    <div className="settings-page-container">
      {/* Header */}
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your profile and connected services</p>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`settings-alert ${alert.type}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {alert.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Connected Accounts Card (UC-35, UC-36, TON-134) */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">
            <span className="material-symbols-outlined text-primary">link</span>
            <span>Connected Accounts</span>
          </h2>
        </div>

        <div className="connected-account-row">
          <div className="account-identity">
            <div className="account-icon-container">
              <svg height="26" width="26" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </div>
            <div className="account-details">
              <h4>
                GitHub
                {isConnected && (
                  <span className="connected-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      check
                    </span>
                    Connected
                  </span>
                )}
              </h4>
              <p>
                {isConnected
                  ? `Connected as @${user?.github_username || 'user'}`
                  : 'Connect your GitHub account to easily select repositories for verification.'}
              </p>
            </div>
          </div>

          <div className="account-actions">
            {isConnected ? (
              <button
                type="button"
                className="btn-github-disconnect"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  link_off
                </span>
                <span>{disconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-github-connect"
                onClick={handleConnect}
              >
                <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span>Connect GitHub Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">
            <span className="material-symbols-outlined text-primary">person</span>
            <span>Profile Information</span>
          </h2>
        </div>

        <div className="profile-field-grid">
          <div className="profile-field-item">
            <label>Full Name</label>
            <div className="profile-field-value">{user?.name || '—'}</div>
          </div>
          <div className="profile-field-item">
            <label>Email Address</label>
            <div className="profile-field-value">{user?.email || '—'}</div>
          </div>
          <div className="profile-field-item">
            <label>Account Role</label>
            <div className="profile-field-value text-capitalize">
              {user?.role || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
