import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkIdentifierRateLimit, getClientIp } from './rateLimit';

export const DEFAULT_PROXY_ALLOWED_ORIGINS = [
  'http://localhost:8090',
  'http://localhost:8081',
  'https://bozzygigs.com',
];

export function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    return [...DEFAULT_PROXY_ALLOWED_ORIGINS];
  }

  const configured = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_PROXY_ALLOWED_ORIGINS, ...configured]));
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

export function applyProxyHeaders(req: VercelRequest, res: VercelResponse, allowedOrigins: string[]) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export async function enforceProxyAccess(
  req: VercelRequest,
  res: VercelResponse,
  action: string,
  {
    limit = 30,
    windowMs = 60_000,
    allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_PROXY_ORIGINS),
  }: {
    limit?: number;
    windowMs?: number;
    allowedOrigins?: string[];
  } = {}
) {
  applyProxyHeaders(req, res, allowedOrigins);

  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (!isAllowedOrigin(origin, allowedOrigins)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return false;
  }

  const identifier = getClientIp(req);
  const rateLimit = await checkIdentifierRateLimit(identifier, action, limit, windowMs);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Too many requests',
      remaining: rateLimit.remaining,
    });
    return false;
  }

  return true;
}
