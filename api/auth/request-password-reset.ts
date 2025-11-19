/**
 * Password Reset Request Endpoint
 * Rate-limited, CSRF-protected endpoint to request password reset email
 * Always returns 200 to prevent user enumeration
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, logRateLimitEvent, getClientIp } from '../../src/lib/rateLimit';
import { requireCsrfToken } from '../../src/lib/csrf';
import { audit, createAuditMeta } from '../../src/lib/audit';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS - same-origin only (set headers first, before any checks)
  const origin = req.headers.origin as string | undefined;
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost:8090';
  
  // Always set CORS headers for same-origin requests
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');
  
  if (origin && origin === siteUrl) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  // Validate content-type
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' });
  }

  // CSRF protection (CORS headers already set above)
  if (!requireCsrfToken(req, res)) {
    return; // Response already sent by requireCsrfToken
  }

  try {
    const { email } = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Still return 200 to prevent enumeration, but don't send email
      return res.status(200).json({ ok: true });
    }

    // Get client IP (Vercel-aware)
    const ip = getClientIp(req);

    // Audit: Request started
    audit('password_reset_request_start', createAuditMeta(email, ip, '/api/auth/request-password-reset', 200));

    // Check rate limit: 5 requests per 10 minutes
    const { allowed, remaining } = await checkRateLimit(ip, email, 'password-reset');

    if (!allowed) {
      logRateLimitEvent('blocked', 'password-reset', ip, email, remaining);
      audit('password_reset_rate_limited', createAuditMeta(email, ip, '/api/auth/request-password-reset', 429, 'Rate limit exceeded'));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 600, // 10 minutes in seconds
      });
    }

    logRateLimitEvent('allowed', 'password-reset', ip, email, remaining);

    // Get Supabase credentials
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Auth] Supabase credentials not configured');
      audit('password_reset_error', createAuditMeta(email, ip, '/api/auth/request-password-reset', 500, 'Server configuration error'));
      // Still return 200 to prevent enumeration
      return res.status(200).json({ ok: true });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Request password reset
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'password_reset_request',
      action: 'password_reset',
      emailHash: require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16),
      ipHash: require('crypto').createHash('sha256').update(ip).digest('hex').substring(0, 16),
    }));

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      console.error('[request-password-reset] Supabase error:', error);
      audit('password_reset_error', createAuditMeta(email, ip, '/api/auth/request-password-reset', 500, error.message));
      // Still return 200 to prevent enumeration
      return res.status(200).json({ ok: true });
    }

    audit('password_reset_success', createAuditMeta(email, ip, '/api/auth/request-password-reset', 200));

    // Log success
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'password_reset_request_success',
      action: 'password_reset',
      emailHash: require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16),
      ipHash: require('crypto').createHash('sha256').update(ip).digest('hex').substring(0, 16),
    }));

    // Always return 200 to prevent user enumeration
    return res.status(200).json({
      ok: true,
      remaining,
    });
  } catch (error: any) {
    console.error('[request-password-reset] Error:', error);
    audit('password_reset_error', { route: '/api/auth/request-password-reset', status: 500, note: error.message });
    // Still return 200 to prevent enumeration
    return res.status(200).json({ ok: true });
  }
}
