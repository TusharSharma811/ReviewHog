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
 * HttpOnly cookie-based auth, with localStorage token as fallback
 * for backward compatibility during migration.
 *
 * SEC-1: Primary auth is now via HttpOnly cookie set by the backend.
 * SEC-8: localStorage fallback will be removed in a future version.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Fallback: if a localStorage token exists (pre-migration sessions),
  // send it as Authorization header. New sessions use HttpOnly cookies.
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // SEC-1: Send HttpOnly cookies cross-origin
  });
}
