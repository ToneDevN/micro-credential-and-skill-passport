import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyRepos } from '../services/githubService';
import { formatRelativeTime } from './NotificationBell';
import './GithubRepoPickerModal.css';

const GithubRepoPickerModal = ({ isOpen, onClose, onSelect }) => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // 'TOKEN_EXPIRED' | 'RATE_LIMIT_EXCEEDED' | 'API_UNAVAILABLE' | 'GENERIC'
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    const fetchRepos = async () => {
      setLoading(true);
      setErrorType(null);
      try {
        const data = await getMyRepos();
        setRepos(data.repos || []);
      } catch (err) {
        console.error('[GithubRepoPickerModal] load repos error:', err);
        const errCode = err.response?.data?.error;
        if (errCode === 'TOKEN_EXPIRED' || err.response?.status === 401) {
          setErrorType('TOKEN_EXPIRED');
        } else if (errCode === 'RATE_LIMIT_EXCEEDED' || err.response?.status === 429) {
          setErrorType('RATE_LIMIT_EXCEEDED');
        } else if (errCode === 'API_UNAVAILABLE' || err.response?.status === 503) {
          setErrorType('API_UNAVAILABLE');
        } else {
          setErrorType('GENERIC');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div
      className="repo-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="repo-modal-heading"
    >
      <div className="repo-modal-card">
        {/* Header */}
        <div className="repo-modal-header">
          <h3 className="repo-modal-title" id="repo-modal-heading">
            <svg height="22" width="22" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span>Select GitHub Repository</span>
          </h3>
          <button
            type="button"
            className="repo-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </div>

        {/* Search Filter Bar */}
        {!loading && !errorType && repos.length > 0 && (
          <div className="repo-modal-search-wrap">
            <div className="repo-modal-search-input-box">
              <span className="material-symbols-outlined repo-modal-search-icon">
                search
              </span>
              <input
                type="text"
                className="repo-modal-search-input"
                placeholder="Search repository name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="repo-modal-content">
          {loading ? (
            <div className="repo-modal-empty">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading repositories...</span>
              </div>
              <p className="mt-2 text-muted">Loading your repositories from GitHub...</p>
            </div>
          ) : errorType === 'TOKEN_EXPIRED' ? (
            <div className="repo-modal-empty">
              <span className="material-symbols-outlined repo-modal-empty-icon text-warning">
                lock_clock
              </span>
              <h4>GitHub Connection Expired</h4>
              <p>
                GitHub token หมดอายุหรือไม่ได้รับอนุญาต กรุณาเชื่อมต่อบัญชีใหม่ที่หน้าการตั้งค่า
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary mt-2"
                onClick={() => {
                  onClose();
                  navigate('/settings');
                }}
              >
                Go to Settings
              </button>
            </div>
          ) : errorType ? (
            <div className="repo-modal-empty">
              <span className="material-symbols-outlined repo-modal-empty-icon text-danger">
                cloud_off
              </span>
              <h4>ไม่สามารถโหลด repository ได้</h4>
              <p>
                {errorType === 'RATE_LIMIT_EXCEEDED'
                  ? 'GitHub API rate limit exceeded. กรุณาลองใหม่ภายหลัง หรือพิมพ์ Evidence URL ด้วยตนเอง'
                  : 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ GitHub คุณสามารถปิดหน้าต่างนี้และกรอก Evidence URL ด้วยตนเอง'}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mt-2"
                onClick={onClose}
              >
                Close & Enter URL Manually
              </button>
            </div>
          ) : repos.length === 0 ? (
            <div className="repo-modal-empty">
              <span className="material-symbols-outlined repo-modal-empty-icon">
                folder_off
              </span>
              <h4>ไม่พบ repository</h4>
              <p>ไม่พบ repository ใน GitHub account ของคุณ</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="repo-modal-empty">
              <span className="material-symbols-outlined repo-modal-empty-icon">
                search_off
              </span>
              <h4>No matching repositories</h4>
              <p>No repository matched &apos;{searchQuery}&apos;</p>
            </div>
          ) : (
            <ul className="repo-list">
              {filteredRepos.map((repo) => (
                <li
                  key={repo.name}
                  className="repo-item"
                  onClick={() => onSelect(repo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelect(repo);
                    }
                  }}
                >
                  <div className="repo-item-main">
                    <h5 className="repo-item-name">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        bookmark
                      </span>
                      <span>{repo.name}</span>
                    </h5>
                    {repo.description && (
                      <p className="repo-item-desc">{repo.description}</p>
                    )}
                    <div className="repo-item-meta">
                      {repo.language && (
                        <span className="repo-lang-badge">
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 12, color: '#6366f1' }}
                          >
                            code
                          </span>
                          <span>{repo.language}</span>
                        </span>
                      )}
                      <span>Updated {formatRelativeTime(repo.updated_at)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="repo-select-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(repo);
                    }}
                  >
                    <span>Select</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      arrow_forward
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="repo-modal-footer">
          <span className="repo-modal-footer-hint">
            Showing {filteredRepos.length} of {repos.length} repositories
          </span>
          <button
            type="button"
            className="repo-modal-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GithubRepoPickerModal;
