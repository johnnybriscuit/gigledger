/**
 * Rate-limited password signup endpoint
 * Proxies to Supabase with rate limiting, password validation, and optional Turnstile verification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, logRateLimitEvent, getClientIp } from '../../src/lib/rateLimit';
import { validatePasswordServer } from '../../src/lib/passwordValidation';
import { requireCsrfToken } from '../../src/lib/csrf';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS - same-origin only
  const origin = req.headers.origin as string | undefined;
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost:8090';
  
  if (origin && origin === siteUrl) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json');

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

  // CSRF protection
  if (!requireCsrfToken(req, res)) {
    return; // Response already sent by requireCsrfToken
  }

  try {
    const { email, password, redirectTo } = req.body;

    // Validate input
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

    // Get client IP (Vercel-aware)
    const ip = getClientIp(req);

    // Check rate limit: 5 requests per 10 minutes
    const { allowed, remaining } = await checkRateLimit(ip, email, 'signup');

    if (!allowed) {
      logRateLimitEvent('blocked', 'signup', ip, email, remaining);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 600, // 10 minutes in seconds
      });
    }

    logRateLimitEvent('allowed', 'signup', ip, email, remaining);

    // Optional: Server-side Turnstile verification (no UI widget)
    if (process.env.EXPO_PUBLIC_ANTIBOT_ENABLED === 'true') {
      const turnstileToken = req.headers['cf-turnstile-token'] as string;

      if (!turnstileToken) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'antibot_missing_token',
          action: 'signup',
          ipHash: require('crypto').createHash('sha256').update(ip).digest('hex').substring(0, 16),
        }));
        return res.status(403).json({
          error: 'Verification required',
          code: 'ANTIBOT_FAILED',
        });
      }

      // Verify with Cloudflare
      const secretKey = process.env.TURNSTILE_SECRET_KEY;
      if (!secretKey) {
        console.error('[Auth] TURNSTILE_SECRET_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const formData = new URLSearchParams();
      formData.set('secret', secretKey);
      formData.set('response', turnstileToken);
      formData.set('remoteip', ip);

      const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'antibot_failed',
          action: 'signup',
          ipHash: require('crypto').createHash('sha256').update(ip).digest('hex').substring(0, 16),
          errorCodes: verifyData['error-codes'],
        }));
        return res.status(403).json({
          error: 'Verification failed',
          code: 'ANTIBOT_FAILED',
        });
      }

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'antibot_success',
        action: 'signup',
        ipHash: require('crypto').createHash('sha256').update(ip).digest('hex').substring(0, 16),
      }));
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Auth] Supabase credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sign up via Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error('[Auth] Signup error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Log success
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'password_signup_success',
      action: 'signup',
      emailHash: require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16),
      ipHash: require('crypto').createHash('sha256').update(ip).digest('hex').substring(0, 16),
      emailConfirmationRequired: !data.session,
    }));

    return res.status(200).json({
      success: true,
      user: data.user,
      session: data.session,
      emailConfirmationRequired: !data.session,
      remaining,
    });
  } catch (error: any) {
    console.error('[Auth] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
