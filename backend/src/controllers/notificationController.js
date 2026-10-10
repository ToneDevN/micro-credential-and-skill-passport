const mongoose = require('mongoose');
const { Notification } = require('../models');

/**
 * @desc    Get paginated notifications for the authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const query = { user_id: userId };
    if (req.query.unread === 'true' || req.query.filter === 'unread') {
      query.is_read = false;
    }

    const [total, notifications] = await Promise.all([
      Notification.countDocuments(query),
      Notification.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const hasMore = skip + notifications.length < total;

    res.status(200).json({
      notifications,
      total,
      page,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get count of unread notifications for the authenticated user
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const count = await Notification.countDocuments({
      user_id: userId,
      is_read: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = await Notification.findOne({
      _id: id,
      user_id: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.is_read) {
      notification.is_read = true;
      await notification.save();
    }

    res.status(200).json({ notification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all unread notifications as read for the authenticated user
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const result = await Notification.updateMany(
      { user_id: userId, is_read: false },
      { $set: { is_read: true } }
    );

    res.status(200).json({
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
