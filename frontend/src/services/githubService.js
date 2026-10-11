import api from './api';

/**
 * Initiates the GitHub OAuth authorization flow via browser redirect
 */
export const connectGithub = () => {
  const token = localStorage.getItem('token');
  const apiBase = api.defaults.baseURL || '';
  // Extract base or use relative path
  let connectUrl;
  if (apiBase.startsWith('http')) {
    const origin = apiBase.replace(/\/api\/v1\/?$/, '');
    connectUrl = `${origin}/api/auth/github/connect${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  } else {
    connectUrl = `/api/auth/github/connect${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }
  window.location.href = connectUrl;
};

/**
 * Disconnects the currently connected GitHub account
 */
export const disconnectGithub = async () => {
  const response = await api.delete('/users/me/github');
  return response.data;
};

/**
 * Fetches the list of GitHub repositories for the authenticated student
 */
export const getMyRepos = async () => {
  const response = await api.get('/users/me/github/repos');
  return response.data;
};
