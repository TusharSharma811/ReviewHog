/**
 * Wrapper around fetch that:
 * 1. Includes credentials for the HttpOnly session cookie.
 * 2. Preserves caller-provided headers.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}
