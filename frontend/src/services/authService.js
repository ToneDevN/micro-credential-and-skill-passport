import api from './api';

/**
 * Request password reset email
 * @param {string} email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Validate password reset token
 * @param {string} token
 * @returns {Promise<{ valid: boolean }>}
 */
export const validateResetToken = async (token) => {
  const response = await api.get(`/auth/reset-password/${encodeURIComponent(token)}`);
  return response.data;
};

/**
 * Reset password via token
 * @param {string} token
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const resetPassword = async (token, password, confirmPassword) => {
  const response = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, {
    password,
    confirmPassword,
  });
  return response.data;
};
