/**
 * Consolidated auth endpoints — rate-limited, CSRF-protected.
 * One Vercel function serving three routes via the [action] segment:
 *   POST /api/auth/send-magic-link
 *   POST /api/auth/request-password-reset
 *   POST /api/auth/signup-password
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { checkRateLimit, logRateLimitEvent, getClientIp } from '../../src/lib/rateLimit';
import { validatePasswordServer } from '../../src/lib/passwordValidation';
import { requireCsrfToken } from '../../src/lib/csrf';
import { audit, createAuditMeta } from '../../src/lib/audit';

const ROUTE_PREFIX = '/api/auth';
const KNOWN_ACTIONS = ['send-magic-link', 'request-password-reset', 'signup-password'] as const;
type AuthAction = (typeof KNOWN_ACTIONS)[number];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (typeof req.query.action === 'string' ? req.query.action : '') as AuthAction;
  const route = `${ROUTE_PREFIX}/${action}`;
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost:8090';

  // CORS - same-origin only (set headers first, before any checks)
  const origin = req.headers.origin as string | undefined;

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token, cf-turnstile-token');
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

  if (!KNOWN_ACTIONS.includes(action)) {
    return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
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

  switch (action) {
    case 'send-magic-link':
      return sendMagicLink(req, res, route);
    case 'request-password-reset':
      return requestPasswordReset(req, res, route, siteUrl);
    case 'signup-password':
      return signupPassword(req, res, route);
  }
}

/** Hash an IP for safe logging (matches prior auth endpoint logging). */
function ipHash(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

/** Hash an email for safe logging. */
function emailHash(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
}

function getSupabaseClient() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Optional server-side Turnstile verification. Sends the error response and
 * returns false when verification fails or cannot be performed.
 */
async function verifyTurnstile(
  req: VercelRequest,
  res: VercelResponse,
  opts: { ip: string; action: string; route: string; email: string; auditFailEvent: string }
): Promise<boolean> {
  const { ip, action, route, email, auditFailEvent } = opts;
  const turnstileToken = req.headers['cf-turnstile-token'] as string;

  if (!turnstileToken) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'antibot_missing_token',
      action,
      ipHash: ipHash(ip),
    }));
    res.status(403).json({ error: 'Verification required', code: 'ANTIBOT_FAILED' });
    return false;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('[Auth] TURNSTILE_SECRET_KEY not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return false;
  }

  const formData = new URLSearchParams();
  formData.set('secret', secretKey);
  formData.set('response', turnstileToken);
  formData.set('remoteip', ip);

  const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  if (!verifyResponse.ok) {
    console.error(`[Auth] Turnstile verification request failed (${action}):`, verifyResponse.status);
    res.status(502).json({ error: 'Verification service error', code: 'ANTIBOT_UNAVAILABLE' });
    return false;
  }

  const verifyData = await verifyResponse.json();

  if (!verifyData.success) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'antibot_failed',
      action,
      ipHash: ipHash(ip),
      errorCodes: verifyData['error-codes'],
    }));
    audit(auditFailEvent, createAuditMeta(email, ip, route, 403, 'Turnstile verification failed'));
    res.status(403).json({ error: 'Anti-bot verification failed', code: 'ANTIBOT_FAILED' });
    return false;
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'antibot_success',
    action,
    ipHash: ipHash(ip),
  }));
  return true;
}

/** POST /api/auth/send-magic-link — proxies Supabase OTP with rate limiting. */
async function sendMagicLink(req: VercelRequest, res: VercelResponse, route: string) {
  try {
    const { email, redirectTo } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const ip = getClientIp(req);

    audit('magic_link_start', createAuditMeta(email, ip, route, 200));

    // Rate limit: 5 requests per 10 minutes
    const { allowed, remaining } = await checkRateLimit(ip, email, 'magic-link');

    if (!allowed) {
      logRateLimitEvent('blocked', 'magic-link', ip, email, remaining);
      audit('magic_link_rate_limited', createAuditMeta(email, ip, route, 429, 'Rate limit exceeded'));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 600,
      });
    }

    logRateLimitEvent('allowed', 'magic-link', ip, email, remaining);

    if (process.env.EXPO_PUBLIC_ANTIBOT_ENABLED === 'true') {
      const ok = await verifyTurnstile(req, res, {
        ip,
        action: 'magic-link',
        route,
        email,
        auditFailEvent: 'magic_link_antibot_failed',
      });
      if (!ok) return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[Auth] Supabase credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error('[send-magic-link] Supabase error:', error);
      audit('magic_link_error', createAuditMeta(email, ip, route, 500, error.message));
      return res.status(500).json({ error: error.message });
    }

    audit('magic_link_success', createAuditMeta(email, ip, route, 200));
    return res.status(200).json({ message: 'Magic link sent' });
  } catch (error: any) {
    console.error('[send-magic-link] Error:', error);
    audit('magic_link_error', { route, status: 500, note: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/request-password-reset — always returns 200 to prevent
 * user enumeration.
 */
async function requestPasswordReset(req: VercelRequest, res: VercelResponse, route: string, siteUrl: string) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Still return 200 to prevent enumeration, but don't send email
      return res.status(200).json({ ok: true });
    }

    const ip = getClientIp(req);

    audit('password_reset_request_start', createAuditMeta(email, ip, route, 200));

    // Rate limit: 5 requests per 10 minutes
    const { allowed, remaining } = await checkRateLimit(ip, email, 'password-reset');

    if (!allowed) {
      logRateLimitEvent('blocked', 'password-reset', ip, email, remaining);
      audit('password_reset_rate_limited', createAuditMeta(email, ip, route, 429, 'Rate limit exceeded'));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 600,
      });
    }

    logRateLimitEvent('allowed', 'password-reset', ip, email, remaining);

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[Auth] Supabase credentials not configured');
      audit('password_reset_error', createAuditMeta(email, ip, route, 500, 'Server configuration error'));
      // Still return 200 to prevent enumeration
      return res.status(200).json({ ok: true });
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'password_reset_request',
      action: 'password_reset',
      emailHash: emailHash(email),
      ipHash: ipHash(ip),
    }));

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      console.error('[request-password-reset] Supabase error:', error);
      audit('password_reset_error', createAuditMeta(email, ip, route, 500, error.message));
      // Still return 200 to prevent enumeration
      return res.status(200).json({ ok: true });
    }

    audit('password_reset_success', createAuditMeta(email, ip, route, 200));

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'password_reset_request_success',
      action: 'password_reset',
      emailHash: emailHash(email),
      ipHash: ipHash(ip),
    }));

    // Always return 200 to prevent user enumeration
    return res.status(200).json({ ok: true, remaining });
  } catch (error: any) {
    console.error('[request-password-reset] Error:', error);
    audit('password_reset_error', { route, status: 500, note: error.message });
    // Still return 200 to prevent enumeration
    return res.status(200).json({ ok: true });
  }
}

/** POST /api/auth/signup-password — proxies Supabase signUp with validation + rate limiting. */
async function signupPassword(req: VercelRequest, res: VercelResponse, route: string) {
  try {
    const { email, password, redirectTo } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Server-side password validation (double-check)
    const passwordValidation = validatePasswordServer(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.error,
        code: 'WEAK_PASSWORD',
      });
    }

    const ip = getClientIp(req);

    audit('signup_start', createAuditMeta(email, ip, route, 200));

    // Rate limit: 5 requests per 10 minutes
    const { allowed, remaining } = await checkRateLimit(ip, email, 'signup');

    if (!allowed) {
      logRateLimitEvent('blocked', 'signup', ip, email, remaining);
      audit('signup_rate_limited', createAuditMeta(email, ip, route, 429, 'Rate limit exceeded'));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 600,
      });
    }

    logRateLimitEvent('allowed', 'signup', ip, email, remaining);

    if (process.env.EXPO_PUBLIC_ANTIBOT_ENABLED === 'true') {
      const ok = await verifyTurnstile(req, res, {
        ip,
        action: 'signup',
        route,
        email,
        auditFailEvent: 'signup_antibot_failed',
      });
      if (!ok) return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[Auth] Supabase credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'signup_attempt',
      action: 'signup',
      emailHash: emailHash(email),
      ipHash: ipHash(ip),
    }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error('[signup-password] Supabase error:', error);

      if (error.message?.includes('User already registered')) {
        audit('signup_duplicate', createAuditMeta(email, ip, route, 409, 'User already exists'));
        return res.status(409).json({
          error: 'Email already registered',
          code: 'USER_EXISTS',
        });
      }

      if (error.message?.includes('Password should be')) {
        audit('signup_weak_password', createAuditMeta(email, ip, route, 400, 'Weak password'));
        return res.status(400).json({
          error: error.message,
          code: 'WEAK_PASSWORD',
        });
      }

      if (error.message?.includes('not authorized')) {
        audit('signup_unauthorized', createAuditMeta(email, ip, route, 401, 'Email not allowed'));
        return res.status(401).json({
          error: 'Email not allowed',
          code: 'EMAIL_NOT_ALLOWED',
        });
      }

      audit('signup_error', createAuditMeta(email, ip, route, 500, error.message));
      return res.status(500).json({
        error: error.message,
        code: 'SIGNUP_ERROR',
      });
    }

    audit('signup_success', createAuditMeta(email, ip, route, 200));

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'password_signup_success',
      action: 'signup',
      emailHash: emailHash(email),
      ipHash: ipHash(ip),
      emailConfirmationRequired: !data.session,
    }));

    return res.status(200).json({
      ok: true,
      success: true,
      user: data.user,
      session: data.session,
      emailConfirmationRequired: !data.session,
      remaining,
    });
  } catch (error: any) {
    console.error('[signup-password] Error:', error);
    audit('signup_error', { route, status: 500, note: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
