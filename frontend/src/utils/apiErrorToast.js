import { toastError, toastWarning } from './toast.js';

/**
 * Extracts a concise, human-readable error message from an Axios error,
 * Network error, or generic Error object.
 *
 * @param {Error|object} err Axios error or standard Error instance
 * @param {string} [fallback='เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'] Fallback message
 * @returns {string} Extracted message
 */
export const extractErrorMessage = (err, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง') => {
  if (!err) return fallback;

  // 1. Network / Connection errors
  if (err.code === 'ERR_NETWORK' || (!err.response && err.request)) {
    return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  }

  // 2. Timeout error
  if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
    return 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง';
  }

  // 3. Backend response payload
  const data = err.response?.data;
  if (data) {
    // Array of validation errors (e.g. Express-validator: [{ msg: '...' }])
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      return first.msg || first.message || String(first);
    }

    // Dictionary of field errors: { errors: { email: 'Invalid email' } }
    if (typeof data.errors === 'object' && data.errors !== null) {
      const values = Object.values(data.errors);
      if (values.length > 0) return String(values[0]);
    }

    // Single message string
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }

    // Single error string
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
  }

  // 4. General Error message
  if (typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }

  return fallback;
};

/**
 * Maps API errors / HTTP status codes to user-friendly toasts.
 *
 * @param {Error|object} err Axios error object or general error
 * @param {string} [customFallback] Optional custom fallback message
 * @returns {string} The extracted error message string for additional local UI state use
 */
export const handleApiError = (err, customFallback) => {
  const status = err?.response?.status;
  const msg = extractErrorMessage(err, customFallback);

  switch (status) {
    case 400:
      toastWarning('ข้อมูลไม่ถูกต้อง', msg);
      break;
    case 401:
      toastError('ไม่มีสิทธิ์เข้าถึง', 'เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
      break;
    case 403:
      toastError('การเข้าถึงถูกปฏิเสธ', msg || 'คุณไม่มีสิทธิ์ในการดำเนินการนี้');
      break;
    case 404:
      toastWarning('ไม่พบข้อมูล', msg || 'ไม่พบรายการที่ต้องการ');
      break;
    case 409:
      toastWarning('ไม่สามารถดำเนินการได้', msg || 'ข้อมูลมีอยู่แล้วหรือเกิดความขัดแย้งในระบบ');
      break;
    case 422:
      toastWarning('ข้อมูลไม่ผ่านการตรวจสอบ', msg);
      break;
    case 429:
      toastWarning('ส่งคำขอบ่อยเกินไป', 'ระบบกำลังจำกัดความถี่การส่งคำขอ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      toastError('เซิร์ฟเวอร์ขัดข้อง', 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง');
      break;
    default:
      toastError('เกิดข้อผิดพลาด', msg);
      break;
  }

  return msg;
};

export default handleApiError;
