/**
 * CSRF Token endpoint
 * Sets httpOnly cookie with CSRF token
 * Call this on app load to get a token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateCsrfToken, setCsrfCookie } from '../src/lib/csrf';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only GET allowed
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Generate and set CSRF token
  const token = generateCsrfToken();
  setCsrfCookie(res, token);

  // Return token in response body (client needs it for x-csrf-token header)
  res.status(200).json({ csrfToken: token });
}
