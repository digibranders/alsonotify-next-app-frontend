const AUTH_FLAG_KEY = 'isAuthenticated';

/**
 * Set a lightweight localStorage flag after successful login.
 * This is a UI hint only — the real auth is the httpOnly cookie
 * set by the backend via Set-Cookie header.
 */
export const setAuthFlag = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_FLAG_KEY, '1');
  }
};

/**
 * Check whether the user has an active auth session (UI hint).
 * Used to enable/disable queries — the server is the source of truth.
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_FLAG_KEY) === '1';
};

/**
 * Clear the auth flag on logout or 401.
 * The actual httpOnly cookie is cleared by the backend via POST /auth/logout.
 */
export const clearAuthFlag = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_FLAG_KEY);
  }
};
