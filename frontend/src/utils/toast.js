import { toast as herouiToast } from '@heroui/react';

/**
 * Normalizes toast arguments to support flexible calling conventions:
 * 1. toastSuccess('Title', 'Description', options)
 * 2. toastSuccess('Message only', options)
 * 3. toastSuccess({ title: '...', description: '...', ...options })
 */
const parseArgs = (first, second, third, defaultVariant = 'default') => {
  let title = '';
  let description = undefined;
  let options = {};

  if (typeof first === 'object' && first !== null) {
    const { title: t, description: d, ...rest } = first;
    title = t || '';
    description = d;
    options = rest;
  } else if (typeof second === 'string') {
    title = first || '';
    description = second;
    if (typeof third === 'object' && third !== null) {
      options = third;
    }
  } else if (typeof second === 'object' && second !== null) {
    title = first || '';
    options = second;
  } else {
    title = first || '';
    if (typeof third === 'object' && third !== null) {
      options = third;
    }
  }

  return {
    title,
    options: {
      description,
      variant: defaultVariant,
      timeout: 3500,
      ...options,
    },
  };
};

/**
 * Trigger a Success Toast (Green)
 */
export const toastSuccess = (first, second, third) => {
  const { title, options } = parseArgs(first, second, third, 'success');
  return herouiToast.success(title, options);
};

/**
 * Trigger an Error / Danger Toast (Red)
 */
export const toastError = (first, second, third) => {
  const { title, options } = parseArgs(first, second, third, 'danger');
  return herouiToast.danger(title, options);
};

/**
 * Trigger a Warning Toast (Amber)
 */
export const toastWarning = (first, second, third) => {
  const { title, options } = parseArgs(first, second, third, 'warning');
  return herouiToast.warning(title, options);
};

/**
 * Trigger an Info / Accent Toast (Blue)
 */
export const toastInfo = (first, second, third) => {
  const { title, options } = parseArgs(first, second, third, 'accent');
  return herouiToast.info(title, options);
};

/**
 * Helper to display loading status while awaiting an async promise
 */
export const toastPromise = (promise, options) => {
  return herouiToast.promise(promise, options);
};

/**
 * Unified Toast Interface
 */
export const toast = Object.assign(
  (title, options) => herouiToast(title, options),
  {
    success: toastSuccess,
    error: toastError,
    danger: toastError,
    warning: toastWarning,
    info: toastInfo,
    promise: toastPromise,
    close: (key) => herouiToast.close(key),
    closeAll: () => herouiToast.clear(),
    clear: () => herouiToast.clear(),
  }
);

export default toast;
