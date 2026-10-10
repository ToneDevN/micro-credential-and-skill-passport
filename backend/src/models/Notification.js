const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['badge_approved', 'badge_rejected'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  related_id: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
