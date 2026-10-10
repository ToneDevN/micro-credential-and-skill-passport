import React, { useState, useEffect } from 'react';
import api from '../services/api';

const RepositoryInfoPanel = ({ requestId, evidenceUrl }) => {
  const [repoInfo, setRepoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Quick client-side check: if evidenceUrl clearly isn't GitHub, don't bother fetching
  const isLikelyGitHub = evidenceUrl && /github\.com/i.test(evidenceUrl);

  useEffect(() => {
    if (!requestId || !isLikelyGitHub) return;

    let isMounted = true;
    const fetchGithubInfo = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/verification-requests/${requestId}/github-info`);
        if (isMounted) {
          if (res.data && res.data.available) {
            setRepoInfo(res.data);
          } else {
            setRepoInfo(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setRepoInfo(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGithubInfo();

    return () => {
      isMounted = false;
    };
  }, [requestId, isLikelyGitHub]);

  if (!isLikelyGitHub) return null;

  if (loading) {
    return (
      <div className="repo-info-loading d-inline-flex align-items-center gap-1 mt-1 text-muted" style={{ fontSize: '0.75rem' }}>
        <span
          className="spinner-border spinner-border-sm"
          role="status"
          style={{ width: '0.7rem', height: '0.7rem' }}
        ></span>
        <span>Checking repository...</span>
      </div>
    );
  }

  if (!repoInfo || !repoInfo.available) return null;

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return null;
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now - past;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'today';
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 30) return `${diffDays} days ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch {
      return null;
    }
  };

  const relativeTime = formatRelativeTime(repoInfo.lastUpdated);

  return (
    <div className="repo-info-panel-container mt-1">
      <button
        type="button"
        className="repo-info-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle GitHub repository details"
      >
        <span className="material-symbols-outlined repo-info-gh-icon">code</span>
        <span className="repo-info-toggle-label">Repo Info</span>
        {repoInfo.language && (
          <span className="repo-info-chip language">{repoInfo.language}</span>
        )}
        <span className={`material-symbols-outlined repo-info-chevron ${isOpen ? 'open' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="repo-info-details-box animate-fade-in">
          <div className="repo-info-badges-row">
            {repoInfo.language && (
              <span className="repo-info-badge language-badge">
                <span className="repo-info-dot"></span>
                {repoInfo.language}
              </span>
            )}
            <span className="repo-info-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                commit
              </span>
              {repoInfo.commitCount} {repoInfo.commitCount === 1 ? 'commit' : 'commits'}
            </span>
            {repoInfo.stars > 0 && (
              <span className="repo-info-badge">
                <span className="material-symbols-outlined text-warning" style={{ fontSize: 13 }}>
                  star
                </span>
                {repoInfo.stars}
              </span>
            )}
            {relativeTime && (
              <span className="repo-info-badge text-muted">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  schedule
                </span>
                Updated {relativeTime}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryInfoPanel;
