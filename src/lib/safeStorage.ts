/**
 * localStorage that never throws.
 *
 * Safari throws a SecurityError ("The operation is insecure.") on any
 * localStorage access when the user has turned on "Block All Cookies", and
 * other browsers do the same when site data is blocked. The checkout only uses
 * storage to remember add-on picks between visits, so when it is unavailable
 * we carry on without it instead of failing the page.
 */

export const safeGetItem = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSetItem = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full: the selection just won't survive a reload.
  }
};

export const safeRemoveItem = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing was saved, so there is nothing to clean up.
  }
};
