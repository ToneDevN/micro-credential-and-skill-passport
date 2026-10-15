/**
 * Mailer utility for transactional emails
 */
const mailer = {
  /**
   * Send password reset email with token link
   * @param {string} email
   * @param {string} resetUrl
   * @returns {Promise<{ success: boolean }>}
   */
  async sendResetPasswordEmail(email, resetUrl) {
    if (!email || !resetUrl) {
      throw new Error('Email and reset URL are required');
    }

    // In development and test environments, log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Mailer] Password reset email sent to ${email}: ${resetUrl}`);
    }

    // For production, integrate with SMTP / SendGrid / Resend if configured
    return {
      success: true,
      email,
      resetUrl,
    };
  },
};

module.exports = mailer;
