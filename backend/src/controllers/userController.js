const { User } = require('../models');

/**
 * @desc    Update user profile (name, email)
 * @route   PUT /api/users/me or /api/v1/users/me
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const trimmedName = name.trim();
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // If email is provided, check uniqueness excluding current user
    if (email !== undefined && email !== null) {
      if (typeof email !== 'string' || email.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Email cannot be empty',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email นี้ถูกใช้งานแล้ว',
        });
      }

      user.email = normalizedEmail;
    }

    user.name = trimmedName;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'บันทึกข้อมูลสำเร็จ',
      user: {
        id: user._id.toString(),
        _id: user._id,
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

/**
 * @desc    Change password
 * @route   PUT /api/users/me/password or /api/v1/users/me/password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate current password presence and correctness
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
      });
    }

    // Validate new password presence
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสผ่านใหม่',
      });
    }

    // Check minimum length (>= 8 chars)
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
      });
    }

    // Check if new password is same as current password
    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม',
      });
    }

    // Check confirmation password
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน',
      });
    }

    // Update password using virtual to trigger hashing in pre-validate hook
    user.password = newPassword;
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
  updateProfile,
  changePassword,
};
