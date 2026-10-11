const mongoose = require('mongoose');
const { VerificationRequest, User } = require('../models');
const { getRepoDetails } = require('../services/githubService');
const { decrypt } = require('../utils/encryption');

/**
 * @desc    Get GitHub repository info for a verification request's evidence URL
 * @route   GET /api/verification-requests/:id/github-info or /api/v1/verification-requests/:id/github-info
 * @access  Private (Instructor only)
 */
const getGithubInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const verificationRequest = await VerificationRequest.findById(id);
    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const info = await getRepoDetails(verificationRequest.evidence_url);

    return res.status(200).json(info);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated user's GitHub repositories
 * @route   GET /api/users/me/github/repos
 * @access  Private
 */
const getMyRepos = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user || user.github_connected_status !== 'connected' || !user.github_access_token) {
      return res.status(400).json({ error: 'NOT_CONNECTED' });
    }

    const token = decrypt(user.github_access_token);
    if (!token) {
      return res.status(503).json({ error: 'API_UNAVAILABLE' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let ghResponse;
    try {
      ghResponse = await fetch(
        'https://api.github.com/user/repos?sort=updated&per_page=100',
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'MicroCredential-App',
          },
          signal: controller.signal,
        }
      );
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error('[getMyRepos fetch error]:', fetchErr.message);
      return res.status(503).json({ error: 'API_UNAVAILABLE' });
    } finally {
      clearTimeout(timeoutId);
    }

    if (ghResponse.status === 401) {
      // Token revoked or expired: flip status to not_connected
      user.github_connected_status = 'not_connected';
      await user.save();
      return res.status(401).json({ error: 'TOKEN_EXPIRED' });
    }

    if (ghResponse.status === 403 || ghResponse.status === 429) {
      return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
    }

    if (!ghResponse.ok) {
      return res.status(503).json({ error: 'API_UNAVAILABLE' });
    }

    const rawRepos = await ghResponse.json();
    if (!Array.isArray(rawRepos)) {
      return res.status(200).json({ repos: [] });
    }

    // Whitelist only the 5 fields specified in UC-39
    const repos = rawRepos.map((r) => ({
      name: r.name || '',
      description: r.description || null,
      language: r.language || null,
      updated_at: r.updated_at || '',
      html_url: r.html_url || '',
    }));

    return res.status(200).json({ repos });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGithubInfo,
  getMyRepos,
};

