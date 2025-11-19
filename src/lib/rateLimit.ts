/**
 * Rate limiting utility
 * 5 requests per 10 minutes per IP+email combination
 * Uses in-memory storage (fallback) or Upstash Redis if available
 */

import crypto from 'crypto';
import type { VercelRequest } from '@vercel/node';

/**
 * Extract client IP from request headers
 * Prefers first public IP in x-forwarded-for (Vercel standard)
 * Falls back to socket remote address
 */
export function getClientIp(req: any): string {
  // Check x-forwarded-for header (Vercel, most proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be: "client, proxy1, proxy2"
    const ips = typeof forwardedFor === 'string' 
      ? forwardedFor.split(',').map(ip => ip.trim())
      : [forwardedFor];
    
    // Return first IP (client IP)
    const clientIp = ips[0];
    if (clientIp && isPublicIp(clientIp)) {
      return clientIp;
    }
  }

  // Check x-real-ip header (some proxies)
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && isPublicIp(realIp)) {
    return realIp;
  }

  // Fallback to socket remote address
  const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (socketIp) {
    return socketIp;
  }

  // Last resort
  return 'unknown';
}

/**
 * Check if IP is public (not private/local)
 */
function isPublicIp(ip: string): boolean {
  // Remove IPv6 prefix if present
  const cleanIp = ip.replace(/^::ffff:/, '');
  
  // Check for private ranges
  if (cleanIp === 'localhost' || cleanIp === '127.0.0.1' || cleanIp === '::1') {
    return false;
  }
  
  // Private IPv4 ranges
  if (cleanIp.startsWith('10.') || 
      cleanIp.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) {
    return false;
  }
  
  return true;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback
const memoryStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 300000);
}

/**
 * Hash a value for privacy (don't store raw IPs/emails)
 */
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
}

/**
 * Generate rate limit key
 */
function getRateLimitKey(ip: string, email: string, action: string): string {
  const ipHash = hashValue(ip);
  const emailHash = hashValue(email.toLowerCase());
  return `ratelimit:${action}:${ipHash}:${emailHash}`;
}

/**
 * Check rate limit (in-memory fallback)
 */
async function checkRateLimitMemory(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Check rate limit with Upstash Redis (if available)
 */
async function checkRateLimitRedis(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number }> {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    // Fallback to memory
    return checkRateLimitMemory(key, limit, windowMs);
  }

  try {
    // Use Redis INCR with expiry
    const response = await fetch(`${UPSTASH_URL}/incr/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
      },
    });

    const data = await response.json();
    const count = data.result;

    // Set expiry on first request
    if (count === 1) {
      await fetch(`${UPSTASH_URL}/pexpire/${key}/${windowMs}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
        },
      });
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining };
  } catch (error) {
    console.error('[RateLimit] Redis error, falling back to memory:', error);
    return checkRateLimitMemory(key, limit, windowMs);
  }
}

/**
 * Main rate limit check
 * @param ip - Client IP address
 * @param email - User email
 * @param action - Action being rate-limited (e.g., 'magic-link', 'signup')
 * @param limit - Max requests (default: 5)
 * @param windowMs - Time window in milliseconds (default: 10 minutes)
 */
export async function checkRateLimit(
  ip: string,
  email: string,
  action: string,
  limit: number = 5,
  windowMs: number = 600000 // 10 minutes
): Promise<{ allowed: boolean; remaining: number }> {
  const key = getRateLimitKey(ip, email, action);
  return checkRateLimitRedis(key, limit, windowMs);
}

/**
 * Log rate limit event (structured logging)
 */
export function logRateLimitEvent(
  event: 'allowed' | 'blocked',
  action: string,
  ip: string,
  email: string,
  remaining: number
) {
  const ipHash = hashValue(ip);
  const emailHash = hashValue(email.toLowerCase());

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: `ratelimit_${event}`,
    action,
    ipHash,
    emailHash,
    remaining,
  }));
}
