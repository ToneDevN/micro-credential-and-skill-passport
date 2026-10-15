const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, StudentPassport } = require('../models');
const { invalidateToken } = require('../middleware/auth');
const mailer = require('../utils/mailer');

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'your_super_secret_key_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user (Student or Instructor)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if email already exists -> 409 Conflict (TON-65)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already in use',
      });
    }

    // Create User (password auto-hashed via pre-save/validate hook)
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    // If role is student, auto-create empty StudentPassport
    if (user.role === 'student') {
      await StudentPassport.create({
        student_id: user._id,
        badges: [],
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        github_username: user.github_username || null,
        github_connected_status: user.github_connected_status || 'not_connected',
      },

    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & return JWT
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        github_username: user.github_username || null,
        github_connected_status: user.github_connected_status || 'not_connected',
      },

    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (Stateless JWT confirmation + invalidation)
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    invalidateToken(token);
  }
  return res.status(200).json({
    success: true,
    message: 'Logged out',
  });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

// @desc    Request password reset link (UC-40, TON-145)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericMessage = 'ส่งลิงก์ reset รหัสผ่านไปที่ email ของคุณแล้ว';

    if (!email || typeof email !== 'string') {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const resetToken = crypto.randomUUID();
      user.password_reset_token = resetToken;
      user.password_reset_expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const clientBase = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetUrl = `${clientBase.replace(/\/+$/, '')}/reset-password?token=${resetToken}`;

      try {
        await mailer.sendResetPasswordEmail(user.email, resetUrl);
      } catch (mailErr) {
        console.error('[forgotPassword] Mail send error:', mailErr.message);
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการส่งอีเมล กรุณาลองใหม่อีกครั้ง',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate password reset token (UC-41, TON-145)
// @route   GET /api/auth/reset-password/:token
// @access  Public
const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(200).json({ valid: false });
    }

    const user = await User.findOne({
      password_reset_token: token,
      password_reset_expires_at: { $gt: new Date() },
    });

    return res.status(200).json({
      valid: !!user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password via token (UC-41, TON-145)
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPasswordWithToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    const user = await User.findOne({
      password_reset_token: token,
      password_reset_expires_at: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'ลิงก์หมดอายุแล้ว กรุณาขอใหม่',
      });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน',
      });
    }

    // Validate password length >= 8
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
      });
    }

    // Update password and clear reset fields
    user.password = password;
    user.password_reset_token = null;
    user.password_reset_expires_at = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  validateResetToken,
  resetPasswordWithToken,
};
