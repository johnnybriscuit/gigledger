/**
 * Unit tests for rate limiting utilities
 */

import { getClientIp } from '../rateLimit';

describe('getClientIp', () => {
  describe('x-forwarded-for header (Vercel standard)', () => {
    it('should extract first IP from x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('should handle single IP in x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('should skip private IPs in x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 203.0.113.1',
        },
        socket: { remoteAddress: '198.51.100.1' },
      };
      // Should skip private IP and fall back to socket
      expect(getClientIp(req)).toBe('198.51.100.1');
    });

    it('should handle IPv6 addresses', () => {
      const req = {
        headers: {
          'x-forwarded-for': '2001:db8::1',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('2001:db8::1');
    });
  });

  describe('x-real-ip header', () => {
    it('should use x-real-ip if x-forwarded-for is missing', () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.1',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '198.51.100.1',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });
  });

  describe('socket remoteAddress fallback', () => {
    it('should use socket.remoteAddress if headers are missing', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '203.0.113.1' },
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('should use connection.remoteAddress if socket is missing', () => {
      const req = {
        headers: {},
        connection: { remoteAddress: '203.0.113.1' },
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });
  });

  describe('private IP filtering', () => {
    it('should reject localhost', () => {
      const req = {
        headers: {
          'x-forwarded-for': '127.0.0.1',
        },
        socket: { remoteAddress: '203.0.113.1' },
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('should reject 10.x.x.x private range', () => {
      const req = {
        headers: {
          'x-forwarded-for': '10.0.0.1',
        },
        socket: { remoteAddress: '203.0.113.1' },
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('should reject 192.168.x.x private range', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
        socket: { remoteAddress: '203.0.113.1' },
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('should reject 172.16-31.x.x private range', () => {
      const req = {
        headers: {
          'x-forwarded-for': '172.16.0.1',
        },
        socket: { remoteAddress: '203.0.113.1' },
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });
  });

  describe('edge cases', () => {
    it('should return "unknown" if no IP is available', () => {
      const req = {
        headers: {},
        socket: {},
      };
      expect(getClientIp(req)).toBe('unknown');
    });

    it('should handle IPv6-mapped IPv4 addresses', () => {
      const req = {
        headers: {
          'x-forwarded-for': '::ffff:203.0.113.1',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('::ffff:203.0.113.1');
    });

    it('should handle whitespace in x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': ' 203.0.113.1 , 198.51.100.1 ',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });
  });

  describe('Vercel production scenarios', () => {
    it('should handle typical Vercel x-forwarded-for format', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 76.76.21.21',
          'x-real-ip': '76.76.21.21',
        },
        socket: { remoteAddress: '::1' },
      };
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('should handle Vercel with single proxy', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195',
        },
        socket: {},
      };
      expect(getClientIp(req)).toBe('203.0.113.195');
    });
  });
});
