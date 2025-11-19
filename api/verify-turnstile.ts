/**
 * Vercel Serverless Function: Verify Cloudflare Turnstile CAPTCHA
 * Server-side only anti-abuse check - no client widget
 * Only executes when EXPO_PUBLIC_ANTIBOT_ENABLED=true
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Anti-bot disabled by default - return success
  if (process.env.EXPO_PUBLIC_ANTIBOT_ENABLED !== 'true') {
    console.log('[Turnstile] Anti-bot disabled, bypassing verification');
    return res.status(200).json({ success: true, action: 'bypass', message: 'Anti-bot protection disabled' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { token, action } = req.body || {};
    
    // Validate input
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid token' });
    }

    if (action && !['signup', 'login', 'expense'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    // Get secret key from environment
    const secretKey = process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error('[Turnstile] Secret key not configured');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    // Get client IP for verification
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                     (req.headers['x-real-ip'] as string) || 
                     '';

    // Prepare form data for Cloudflare API
    const form = new URLSearchParams();
    form.set('secret', secretKey);
    form.set('response', token);
    if (clientIp) {
      form.set('remoteip', clientIp);
    }

    console.log('[Turnstile] Verifying token with Cloudflare...');

    // Call Cloudflare siteverify API
    const cfResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });

    if (!cfResp.ok) {
      console.error('[Turnstile] Cloudflare API error:', cfResp.status);
      return res.status(500).json({ success: false, error: 'Verification service error' });
    }

    const data = await cfResp.json();
    console.log('[Turnstile] Cloudflare response:', {
      success: data?.success,
      action: data?.action,
      hostname: data?.hostname,
      errorCodes: data?.['error-codes'],
    });

    // Validate action if provided
    const actionOk = !action || data?.action === action;
    if (!actionOk) {
      console.error('[Turnstile] Action mismatch:', { expected: action, received: data?.action });
      return res.status(400).json({
        success: false,
        error: 'Action mismatch',
      });
    }

    // Check success
    const ok = Boolean(data?.success) && actionOk;
    
    if (!ok) {
      return res.status(400).json({
        success: false,
        action: data?.action,
        error: data?.['error-codes']?.[0] || 'verification_failed',
      });
    }

    // Success!
    return res.status(200).json({
      success: true,
      action: data?.action,
      hostname: data?.hostname,
    });
  } catch (err: any) {
    console.error('[Turnstile] Verification error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'server_error',
    });
  }
}
