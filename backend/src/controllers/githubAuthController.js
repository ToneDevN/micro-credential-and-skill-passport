const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { encrypt } = require('../utils/encryption');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';
const GITHUB_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID || 'mock_client_id';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET || 'mock_client_secret';

const getClientBaseUrl = () => {
  const url = process.env.CLIENT_URL || 'http://localhost:5173';
  return url.replace(/\/+$/, '');
};

/**
 * @desc    Initiate GitHub OAuth connection flow
 * @route   GET /api/auth/github/connect
 * @access  Private (Authenticated users)
 */
const connectGithub = async (req, res, next) => {
  try {
    const userId = (req.user._id || req.user.id).toString();

    let clientBase = req.get('origin') || req.get('referer');
    if (clientBase) {
      try {
        clientBase = new URL(clientBase).origin;
      } catch (e) {
        clientBase = null;
      }
    }

    const statePayload = { userId };
    if (clientBase) {
      statePayload.clientBase = clientBase;
    }

    // Create a tamper-proof state token containing user ID & originating client URL
    const state = jwt.sign(statePayload, JWT_SECRET, { expiresIn: '15m' });

    let authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo&state=${state}`;

    if (process.env.GITHUB_OAUTH_CALLBACK_URL) {
      authorizeUrl += `&redirect_uri=${encodeURIComponent(process.env.GITHUB_OAUTH_CALLBACK_URL)}`;
    }

    return res.redirect(302, authorizeUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle GitHub OAuth callback
 * @route   GET /api/auth/github/callback
 * @access  Public
 */
const githubCallback = async (req, res, next) => {
  let clientBase = getClientBaseUrl();
  let errorRedirect = `${clientBase}/settings?github=error`;
  let successRedirect = `${clientBase}/settings?github=connected`;

  try {
    const { code, state, error } = req.query;

    // Handle user denial or GitHub error parameter
    if (error || !code || !state) {
      return res.redirect(302, errorRedirect);
    }

    // Verify and decode state token
    let decoded;
    try {
      decoded = jwt.verify(state, JWT_SECRET);
      if (decoded && decoded.clientBase) {
        clientBase = decoded.clientBase.replace(/\/+$/, '');
        errorRedirect = `${clientBase}/settings?github=error`;
        successRedirect = `${clientBase}/settings?github=connected`;
      }
    } catch (stateErr) {
      return res.redirect(302, errorRedirect);
    }


    if (!decoded || !decoded.userId) {
      return res.redirect(302, errorRedirect);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.redirect(302, errorRedirect);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      return res.redirect(302, errorRedirect);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData || !tokenData.access_token || tokenData.error) {
      return res.redirect(302, errorRedirect);
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'MicroCredential-App',
      },
    });

    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error('[GitHub user profile fetch failed]:', userResponse.status, errText);
      return res.redirect(302, errorRedirect);
    }

    const ghUserData = await userResponse.json();
    if (!ghUserData || !ghUserData.login) {
      return res.redirect(302, errorRedirect);
    }

    // Encrypt access token before storing
    const encryptedToken = encrypt(accessToken);

    user.github_username = ghUserData.login;
    user.github_access_token = encryptedToken;
    user.github_connected_status = 'connected';
    await user.save();

    return res.redirect(302, successRedirect);
  } catch (err) {
    console.error('[GitHub OAuth callback error]:', err.message);
    return res.redirect(302, errorRedirect);
  }
};

/**
 * @desc    Disconnect GitHub account
 * @route   DELETE /api/users/me/github
 * @access  Private (Authenticated users)
 */
const disconnectGithub = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.github_username = null;
    user.github_access_token = null;
    user.github_connected_status = 'not_connected';
    await user.save();

    return res.status(200).json({ message: 'GitHub disconnected' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  connectGithub,
  githubCallback,
  disconnectGithub,
};
