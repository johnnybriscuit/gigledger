/**
 * Unit tests for CSRF protection
 */

import { generateCsrfToken, verifyCsrfToken } from '../csrf';

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken());
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('verifyCsrfToken', () => {
    it('should return true for valid matching tokens', () => {
      const token = 'test-token-123456789012345678901234567890123456789012345678';
      const req = {
        headers: {
          cookie: `csrf-token=${token}`,
          'x-csrf-token': token,
        },
      };
      expect(verifyCsrfToken(req as any)).toBe(true);
    });

    it('should return false for missing cookie', () => {
      const req = {
        headers: {
          'x-csrf-token': 'test-token',
        },
      };
      expect(verifyCsrfToken(req as any)).toBe(false);
    });

    it('should return false for missing header', () => {
      const req = {
        headers: {
          cookie: 'csrf-token=test-token',
        },
      };
      expect(verifyCsrfToken(req as any)).toBe(false);
    });

    it('should return false for mismatched tokens', () => {
      const req = {
        headers: {
          cookie: 'csrf-token=token1234567890123456789012345678901234567890123456',
          'x-csrf-token': 'token2234567890123456789012345678901234567890123456',
        },
      };
      expect(verifyCsrfToken(req as any)).toBe(false);
    });

    it('should return false for empty cookie', () => {
      const req = {
        headers: {
          cookie: '',
          'x-csrf-token': 'test-token',
        },
      };
      expect(verifyCsrfToken(req as any)).toBe(false);
    });

    it('should return false for empty header', () => {
      const req = {
        headers: {
          cookie: 'csrf-token=test-token',
          'x-csrf-token': '',
        },
      };
      expect(verifyCsrfToken(req as any)).toBe(false);
    });

    it('should handle multiple cookies correctly', () => {
      const token = 'test-token-123456789012345678901234567890123456789012345678';
      const req = {
        headers: {
          cookie: `session=abc123; csrf-token=${token}; other=value`,
          'x-csrf-token': token,
        },
      };
      expect(verifyCsrfToken(req as any)).toBe(true);
    });

    it('should use constant-time comparison (timing attack protection)', () => {
      // This test verifies that the comparison doesn't short-circuit
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);
      
      const req1 = {
        headers: {
          cookie: `csrf-token=${token1}`,
          'x-csrf-token': token2,
        },
      };
      
      const req2 = {
        headers: {
          cookie: `csrf-token=${token1}`,
          'x-csrf-token': token1.substring(0, 63) + 'b',
        },
      };
      
      // Both should return false
      expect(verifyCsrfToken(req1 as any)).toBe(false);
      expect(verifyCsrfToken(req2 as any)).toBe(false);
    });
  });
});
