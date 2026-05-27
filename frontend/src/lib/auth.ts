const TOKEN_KEY = "reviewhog_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Wrapper around fetch that includes credentials (cookies) for
 * HttpOnly cookie-based auth.
 *
 * SEC-1: Auth is via HttpOnly cookie set by the backend.
 * SEC-8: localStorage fallback has been removed — stale tokens
 *        were causing 403 errors by being sent as Authorization
 *        headers that overrode valid cookie auth.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Clear any stale localStorage tokens from pre-migration sessions
  // to prevent them from being picked up by other code.
  const staleToken = getToken();
  if (staleToken) {
    removeToken();
  }

  return fetch(url, {
    ...options,
    credentials: "include", // SEC-1: Send HttpOnly cookies cross-origin
  });
}
