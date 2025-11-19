/**
 * CSRF Protection Utility
 * Double-submit cookie pattern with SameSite=Lax
 */

import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token cookie (call on GET requests to / or /auth)
 */
export function setCsrfCookie(res: VercelResponse, token: string): void {
  res.setHeader('Set-Cookie', [
    `${CSRF_TOKEN_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`,
  ]);
}

/**
 * Verify CSRF token from request
 * Returns true if valid, false otherwise
 */
export function verifyCsrfToken(req: VercelRequest): boolean {
  // Get token from cookie
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieToken = cookies[CSRF_TOKEN_NAME];

  // Get token from header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

/**
 * Parse cookie string into object
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieString) return cookies;

  cookieString.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=').trim();
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Middleware to validate CSRF token on POST requests
 * Returns 403 if invalid
 */
export function requireCsrfToken(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  if (req.method !== 'POST') {
    return true; // Only check POST requests
  }

  if (!verifyCsrfToken(req)) {
    res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_FAILED',
    });
    return false;
  }

  return true;
}
