import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Spinner,
  Input,
  Button,
  Chip
} from '@heroui/react';
import { getMyRepos } from '../services/githubService';
import { formatRelativeTime } from './NotificationBell';

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

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl max-h-[85vh] flex flex-col">
            <Modal.CloseTrigger />
            <Modal.Header className="p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                </div>
                <div>
                  <Modal.Heading className="text-base font-bold text-slate-900 m-0">Select GitHub Repository</Modal.Heading>
                  <p className="text-xs text-slate-500 m-0">Choose repository evidence for verification</p>
                </div>
              </div>
            </Modal.Header>

            {/* Search Filter Bar */}
            {!loading && !errorType && repos.length > 0 && (
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <Input
                  type="text"
                  placeholder="Filter repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs"
                  autoFocus
                />
              </div>
            )}

            {/* Body */}
            <Modal.Body className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                  <Spinner size="lg" color="primary" />
                  <p className="mt-2 text-slate-500 text-xs m-0">Loading your GitHub repositories...</p>
                </div>
              ) : errorType === 'TOKEN_EXPIRED' ? (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2 max-w-sm mx-auto">
                  <span className="material-symbols-outlined text-3xl text-amber-500">lock_clock</span>
                  <h4 className="font-heading font-bold text-base text-slate-900 m-0">GitHub Token Expired</h4>
                  <p className="text-xs text-slate-500 m-0 leading-relaxed">
                    Please reconnect your GitHub account in settings.
                  </p>
                  <Button
                    color="primary"
                    size="sm"
                    className="mt-2"
                    onPress={() => {
                      onClose();
                      navigate('/settings');
                    }}
                  >
                    Go to Settings
                  </Button>
                </div>
              ) : errorType ? (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2 max-w-sm mx-auto">
                  <span className="material-symbols-outlined text-3xl text-rose-500">cloud_off</span>
                  <h4 className="font-heading font-bold text-base text-slate-900 m-0">Unable to load repositories</h4>
                  <p className="text-xs text-slate-500 m-0">
                    You can close this modal and paste your evidence URL manually.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onPress={onClose}
                  >
                    Enter URL Manually
                  </Button>
                </div>
              ) : repos.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No repositories found in your account.
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No repository matched &apos;{searchQuery}&apos;
                </div>
              ) : (
                /* Compact ListBox rows (repo name + select button only, metadata revealed on hover) */
                <div className="flex flex-col gap-1.5">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.name}
                      className="group p-2.5 rounded-xl border border-slate-200/80 hover:border-indigo-500/50 hover:bg-indigo-50/20 transition-all flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => onSelect(repo)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-indigo-600 transition-colors">
                            bookmark
                          </span>
                          <span className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                            {repo.name}
                          </span>
                        </div>
                        {/* Revealed on hover/expand */}
                        <div className="hidden group-hover:flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          {repo.language && (
                            <Chip size="sm" variant="flat" color="primary" className="h-4 text-[10px] px-1 font-medium">
                              {repo.language}
                            </Chip>
                          )}
                          <span>Updated {formatRelativeTime(repo.updated_at)}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0 text-xs h-7 px-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                        onPress={() => onSelect(repo)}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <span className="text-xs text-slate-500">
                {filteredRepos.length} repositories
              </span>
              <Button size="sm" variant="secondary" onPress={onClose}>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default GithubRepoPickerModal;
