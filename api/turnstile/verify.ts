/**
 * Vercel Serverless Function: Verify Cloudflare Turnstile CAPTCHA
 * POST /api/turnstile/verify
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VerifyRequest {
  token: string;
  action: 'signup' | 'login' | 'expense';
}

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { token, action } = req.body as VerifyRequest;

    // Validate input
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid token' });
    }

    if (!action || !['signup', 'login', 'expense'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Invalid action' });
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error('[Turnstile] TURNSTILE_SECRET_KEY not configured');
      return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    // POST to Cloudflare siteverify
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    if (!verifyResponse.ok) {
      console.error('[Turnstile] Cloudflare API error:', verifyResponse.status);
      return res.status(500).json({ ok: false, error: 'Verification service error' });
    }

    const data: TurnstileResponse = await verifyResponse.json();

    console.log('[Turnstile] Verification response:', {
      success: data.success,
      hostname: data.hostname,
      action: data.action,
      errorCodes: data['error-codes'],
    });

    // Check success
    if (!data.success) {
      return res.status(400).json({
        ok: false,
        error: 'Verification failed',
        errorCodes: data['error-codes'] || [],
      });
    }

    // Validate action matches
    if (data.action && data.action !== action) {
      console.error('[Turnstile] Action mismatch:', { expected: action, received: data.action });
      return res.status(400).json({
        ok: false,
        error: 'Action mismatch',
      });
    }

    // Validate hostname
    const allowedHostnames = [
      'localhost',
      'localhost:8090',
      'localhost:8081',
      '127.0.0.1',
      'gigledger-ten.vercel.app',
    ];

    if (data.hostname && !allowedHostnames.some(h => data.hostname?.includes(h))) {
      console.error('[Turnstile] Invalid hostname:', data.hostname);
      return res.status(400).json({
        ok: false,
        error: 'Invalid hostname',
      });
    }

    // Success!
    console.log('[Turnstile] Verification successful');
    return res.status(200).json({
      ok: true,
      hostname: data.hostname,
      action: data.action,
      timestamp: data.challenge_ts,
    });
  } catch (error) {
    console.error('[Turnstile] Verification error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
}
