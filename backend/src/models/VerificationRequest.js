const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema(
  {
    student_skill_status_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentSkillStatus',
      required: [true, 'StudentSkillStatus ID is required'],
      index: true,
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    evidence_url: {
      type: String,
      required: [true, 'Evidence URL is required'],
      trim: true,
      validate: {
        validator: function (v) {
          try {
            new URL(v);
            return true;
          } catch (err) {
            return false;
          }
        },
        message: (props) => `${props.value} is not a valid URL!`,
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid verification request status',
      },
      default: 'pending',
    },
    feedback: {
      type: String,
      default: '',
      trim: true,
    },
    submitted_at: {
      type: Date,
      default: Date.now,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for instructor pending queue query
verificationRequestSchema.index({ reviewed_by: 1, status: 1 });

const VerificationRequest = mongoose.model(
  'VerificationRequest',
  verificationRequestSchema
);

module.exports = VerificationRequest;
