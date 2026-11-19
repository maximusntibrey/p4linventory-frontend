// Resolves VITE_API_BASE_URL to the origin prefix for the client. Contract paths already include
// /api/v1, so only an origin is ever used. Empty or relative means same origin.
// Cross-origin hosting is not supported yet (OQ-26): cookies are same-origin and the CSRF token
// comes from document.cookie. Fail at start-up, loudly, rather than quietly sending no session.
export function originOf(value: string | undefined, pageOrigin: string): string {
  if (!value || !/^https?:\/\//i.test(value)) return '';
  const origin = new URL(value).origin;
  if (origin === pageOrigin) return '';
  throw new Error(
    `VITE_API_BASE_URL points to ${origin}, but the app runs on ${pageOrigin}. ` +
      'Cross-origin API hosting is not supported yet (OQ-26): serve the API on the same origin, ' +
      'or leave VITE_API_BASE_URL empty.',
  );
}
