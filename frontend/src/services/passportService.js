import api from './api';

/**
 * Generate or get existing share link for authenticated student
 * @returns {Promise<{ success: boolean, publicUrl: string, publicSlug: string, isPublic: boolean }>}
 */
export const getShareLink = async () => {
  const response = await api.post('/passport/share');
  return response.data;
};

/**
 * Regenerate share link (revokes previous link)
 * @returns {Promise<{ success: boolean, publicUrl: string, publicSlug: string, isPublic: boolean }>}
 */
export const regenerateShareLink = async () => {
  const response = await api.post('/passport/share/regenerate');
  return response.data;
};

/**
 * Revoke public sharing (stop sharing)
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const revokeShareLink = async () => {
  const response = await api.delete('/passport/share');
  return response.data;
};

/**
 * Fetch public Skill Passport by slug (Visitor, no auth)
 * @param {string} slug
 * @returns {Promise<{ success: boolean, studentName: string, badges: Array, skillMap: Object }>}
 */
export const getPublicPassport = async (slug) => {
  const response = await api.get(`/passport/public/${encodeURIComponent(slug)}`);
  return response.data;
};
