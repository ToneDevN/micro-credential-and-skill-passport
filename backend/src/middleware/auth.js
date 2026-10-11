const jwt = require('jsonwebtoken');
const { User } = require('../models');

const tokenBlacklist = new Set();

const invalidateToken = (token) => {
  if (token) {
    tokenBlacklist.add(token);
  }
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }


  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({
      success: false,
      message: 'Token has been invalidated',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_super_secret_key_change_in_production'
    );

    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      github_username: user.github_username || null,
      github_connected_status: user.github_connected_status || 'not_connected',
    };


    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || tokenBlacklist.has(token)) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_super_secret_key_change_in_production'
    );

    const user = await User.findById(decoded.id).select('-password_hash');
    if (user) {
      req.user = {
        _id: user._id,
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        github_username: user.github_username || null,
        github_connected_status: user.github_connected_status || 'not_connected',
      };

    }
  } catch {
    // Ignore invalid tokens for optional auth
  }

  next();
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
  authorize: restrictTo, // alias for backwards compatibility
  invalidateToken,
};
