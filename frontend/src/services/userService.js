import api from './api';

/**
 * Update authenticated user's profile (name, email)
 * @param {{ name: string, email?: string }} data
 * @returns {Promise<any>}
 */
export const updateProfile = async (data) => {
  const response = await api.put('/users/me', data);
  return response.data;
};

/**
 * Change authenticated user's password
 * @param {{ currentPassword: string, newPassword: string, confirmNewPassword: string }} data
 * @returns {Promise<any>}
 */
export const changePassword = async (data) => {
  const response = await api.put('/users/me/password', data);
  return response.data;
};
