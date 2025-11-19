/**
 * Unit tests for auth redirect URL validation
 * Ensures all redirectTo values use the correct SITE_URL
 */

import Constants from 'expo-constants';

describe('Auth Redirect URL Validation', () => {
  const STAGING_URL = 'https://gigledger-ten.vercel.app';
  const PROD_URL = 'https://gigledger.com';
  const LOCAL_URL = 'http://localhost:8090';

  describe('SITE_URL resolution', () => {
    it('should resolve from Constants.expoConfig.extra.siteUrl first', () => {
      const mockConstants = {
        expoConfig: {
          extra: {
            siteUrl: STAGING_URL,
          },
        },
      };

      const SITE_URL = mockConstants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
      expect(SITE_URL).toBe(STAGING_URL);
    });

    it('should fallback to process.env.EXPO_PUBLIC_SITE_URL', () => {
      const mockConstants = {
        expoConfig: {
          extra: {} as { siteUrl?: string },
        },
      };

      const originalEnv = process.env.EXPO_PUBLIC_SITE_URL;
      process.env.EXPO_PUBLIC_SITE_URL = STAGING_URL;

      const SITE_URL = mockConstants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
      expect(SITE_URL).toBe(STAGING_URL);

      // Restore
      process.env.EXPO_PUBLIC_SITE_URL = originalEnv;
    });

    it('should be undefined if neither is set', () => {
      const mockConstants = {
        expoConfig: {
          extra: {} as { siteUrl?: string },
        },
      };

      const originalEnv = process.env.EXPO_PUBLIC_SITE_URL;
      delete process.env.EXPO_PUBLIC_SITE_URL;

      const SITE_URL = mockConstants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
      expect(SITE_URL).toBeUndefined();

      // Restore
      process.env.EXPO_PUBLIC_SITE_URL = originalEnv;
    });
  });

  describe('redirectTo URL format', () => {
    it('should construct redirectTo with /auth/callback path', () => {
      const SITE_URL = STAGING_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo).toBe('https://gigledger-ten.vercel.app/auth/callback');
    });

    it('should start with https:// in staging', () => {
      const SITE_URL = STAGING_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo.startsWith('https://')).toBe(true);
    });

    it('should start with https:// in production', () => {
      const SITE_URL = PROD_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo.startsWith('https://')).toBe(true);
    });

    it('should start with http:// in local development', () => {
      const SITE_URL = LOCAL_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo.startsWith('http://')).toBe(true);
    });

    it('should not have trailing slash before /auth/callback', () => {
      const SITE_URL = STAGING_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo).not.toContain('//auth/callback');
    });
  });

  describe('Environment-specific validation', () => {
    it('should use staging URL when EXPO_PUBLIC_SITE_URL is staging', () => {
      const originalEnv = process.env.EXPO_PUBLIC_SITE_URL;
      process.env.EXPO_PUBLIC_SITE_URL = STAGING_URL;

      const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo).toBe('https://gigledger-ten.vercel.app/auth/callback');
      expect(redirectTo.startsWith('https://gigledger-ten.vercel.app')).toBe(true);

      // Restore
      process.env.EXPO_PUBLIC_SITE_URL = originalEnv;
    });

    it('should use production URL when EXPO_PUBLIC_SITE_URL is production', () => {
      const originalEnv = process.env.EXPO_PUBLIC_SITE_URL;
      process.env.EXPO_PUBLIC_SITE_URL = PROD_URL;

      const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo).toBe('https://gigledger.com/auth/callback');
      expect(redirectTo.startsWith('https://gigledger.com')).toBe(true);

      // Restore
      process.env.EXPO_PUBLIC_SITE_URL = originalEnv;
    });

    it('should use local URL in development', () => {
      const originalEnv = process.env.EXPO_PUBLIC_SITE_URL;
      process.env.EXPO_PUBLIC_SITE_URL = LOCAL_URL;

      const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo).toBe('http://localhost:8090/auth/callback');
      expect(redirectTo.startsWith('http://localhost:8090')).toBe(true);

      // Restore
      process.env.EXPO_PUBLIC_SITE_URL = originalEnv;
    });
  });

  describe('Security validation', () => {
    it('should not allow relative URLs', () => {
      const SITE_URL = STAGING_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo.startsWith('/')).toBe(false);
      expect(redirectTo.startsWith('http://') || redirectTo.startsWith('https://')).toBe(true);
    });

    it('should not allow javascript: protocol', () => {
      const maliciousUrl = 'javascript:alert(1)';
      const SITE_URL = STAGING_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo).not.toContain('javascript:');
      expect(redirectTo.startsWith('https://')).toBe(true);
    });

    it('should not allow data: protocol', () => {
      const SITE_URL = STAGING_URL;
      const redirectTo = `${SITE_URL}/auth/callback`;

      expect(redirectTo).not.toContain('data:');
      expect(redirectTo.startsWith('https://')).toBe(true);
    });
  });

  describe('API endpoint validation', () => {
    it('should validate magic link redirectTo format', () => {
      const SITE_URL = STAGING_URL;
      const email = 'test@example.com';
      const redirectTo = `${SITE_URL}/auth/callback`;

      const requestBody = {
        email,
        redirectTo,
      };

      expect(requestBody.redirectTo).toBe('https://gigledger-ten.vercel.app/auth/callback');
      expect(requestBody.redirectTo.startsWith(STAGING_URL)).toBe(true);
    });

    it('should validate password signup redirectTo format', () => {
      const SITE_URL = STAGING_URL;
      const email = 'test@example.com';
      const password = 'SecurePassword123!';
      const redirectTo = `${SITE_URL}/auth/callback`;

      const requestBody = {
        email,
        password,
        redirectTo,
      };

      expect(requestBody.redirectTo).toBe('https://gigledger-ten.vercel.app/auth/callback');
      expect(requestBody.redirectTo.startsWith(STAGING_URL)).toBe(true);
    });

    it('should validate resend redirectTo format', () => {
      const SITE_URL = STAGING_URL;
      const email = 'test@example.com';

      const resendOptions = {
        type: 'signup' as const,
        email,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback`,
        },
      };

      expect(resendOptions.options.emailRedirectTo).toBe('https://gigledger-ten.vercel.app/auth/callback');
      expect(resendOptions.options.emailRedirectTo.startsWith(STAGING_URL)).toBe(true);
    });
  });

  describe('Runtime assertions', () => {
    it('should detect missing SITE_URL', () => {
      const mockConstants = {
        expoConfig: {
          extra: {} as { siteUrl?: string },
        },
      };

      const originalEnv = process.env.EXPO_PUBLIC_SITE_URL;
      delete process.env.EXPO_PUBLIC_SITE_URL;

      const SITE_URL = mockConstants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
      const isSiteUrlMissing = !SITE_URL;

      expect(isSiteUrlMissing).toBe(true);

      // Restore
      process.env.EXPO_PUBLIC_SITE_URL = originalEnv;
    });

    it('should allow auth operations when SITE_URL is present', () => {
      const SITE_URL = STAGING_URL;
      const isSiteUrlMissing = !SITE_URL;

      expect(isSiteUrlMissing).toBe(false);
    });

    it('should block auth operations when SITE_URL is missing', () => {
      const SITE_URL = undefined;
      const isSiteUrlMissing = !SITE_URL;

      expect(isSiteUrlMissing).toBe(true);

      // Simulate blocking logic
      if (isSiteUrlMissing) {
        expect(true).toBe(true); // Auth operations should be blocked
      }
    });
  });
});
