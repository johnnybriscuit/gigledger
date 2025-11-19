/**
 * Structured audit logging
 * Logs security events with hashed PII for privacy
 */

import crypto from 'crypto';

interface AuditMetadata {
  emailHash?: string;
  ipHash?: string;
  route?: string;
  status?: number;
  note?: string;
  [key: string]: any;
}

/**
 * Hash a value for privacy-preserving logging
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex').substring(0, 16);
}

/**
 * Log an audit event with structured data
 * No raw PII is logged - only hashes
 */
export function audit(event: string, meta?: AuditMetadata): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...meta,
  };

  // Log as JSON for easy parsing
  console.log(JSON.stringify(logEntry));
}

/**
 * Helper to create audit metadata from request
 */
export function createAuditMeta(
  email: string,
  ip: string,
  route: string,
  status: number,
  note?: string
): AuditMetadata {
  return {
    emailHash: hashValue(email),
    ipHash: hashValue(ip),
    route,
    status,
    note,
  };
}
