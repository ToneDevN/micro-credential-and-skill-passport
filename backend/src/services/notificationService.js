const { Notification } = require('../models');

/**
 * Creates an in-system notification for a user.
 * Isolated failure: logs and returns null on error without throwing.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {'badge_approved'|'badge_rejected'} type
 * @param {string} message
 * @param {string|mongoose.Types.ObjectId} [relatedId]
 * @returns {Promise<Notification|null>}
 */
async function create(userId, type, message, relatedId) {
  try {
    return await Notification.create({
      user_id: userId,
      type,
      message,
      related_id: relatedId || null,
    });
  } catch (err) {
    console.warn('[NotificationService] create failed:', err.message);
    return null;
  }
}

module.exports = {
  create,
};
