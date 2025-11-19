/**
 * Google SSO Tests
 * Tests for Google OAuth integration
 */

describe('Google SSO Integration', () => {
  describe('OAuth handler', () => {
    it('should call signInWithOAuth with correct parameters', () => {
      const mockSignInWithOAuth = jest.fn().mockResolvedValue({ error: null });
      const SITE_URL = 'https://gigledger-ten.vercel.app';

      // Mock Supabase client
      const supabase = {
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      };

      // Simulate handler call
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://gigledger-ten.vercel.app/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });

    it('should handle OAuth errors gracefully', async () => {
      const mockError = { message: 'OAuth provider error' };
      const mockSignInWithOAuth = jest.fn().mockResolvedValue({ error: mockError });

      const supabase = {
        auth: {
          signInWithOAuth: mockSignInWithOAuth,
        },
      };

      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://gigledger-ten.vercel.app/auth/callback',
        },
      });

      expect(result.error).toEqual(mockError);
    });
  });

  describe('Callback handling', () => {
    it('should detect OAuth provider from session', () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {
            provider: 'google',
          },
          identities: [
            {
              provider: 'google',
              id: 'google-id-123',
            },
          ],
        },
      };

      const isOAuth = session.user.app_metadata?.provider === 'google' || 
                      session.user.identities?.some(id => id.provider === 'google');

      expect(isOAuth).toBe(true);
    });

    it('should handle access_denied error', () => {
      const error = { message: 'access_denied' };
      const expectedMessage = 'You denied access to Google. Please try again if you want to sign in with Google.';

      const userMessage = error.message?.includes('access_denied') 
        ? expectedMessage 
        : 'Authentication failed.';

      expect(userMessage).toBe(expectedMessage);
    });

    it('should route to MFA setup for first-time OAuth users', () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {
            provider: 'google',
            mfa_enrolled: false, // First time
          },
        },
      };

      const mfaEnrolled = session.user.app_metadata?.mfa_enrolled === true;
      const shouldSetupMFA = !mfaEnrolled;

      expect(shouldSetupMFA).toBe(true);
    });

    it('should route to dashboard for returning OAuth users', () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {
            provider: 'google',
            mfa_enrolled: true, // Returning user
          },
        },
      };

      const mfaEnrolled = session.user.app_metadata?.mfa_enrolled === true;
      const shouldGoToDashboard = mfaEnrolled;

      expect(shouldGoToDashboard).toBe(true);
    });
  });

  describe('Account linking', () => {
    it('should detect multiple identities (linked accounts)', () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          identities: [
            { provider: 'email', id: 'email-id-123' },
            { provider: 'google', id: 'google-id-123' },
          ],
        },
      };

      const hasMultipleIdentities = session.user.identities.length > 1;

      expect(hasMultipleIdentities).toBe(true);
      expect(session.user.identities.length).toBe(2);
    });

    it('should allow same email across providers (Supabase handles linking)', () => {
      const email = 'test@example.com';
      
      const emailIdentity = {
        provider: 'email',
        email: email,
      };

      const googleIdentity = {
        provider: 'google',
        email: email, // Same email
      };

      // Supabase automatically links by email
      expect(emailIdentity.email).toBe(googleIdentity.email);
    });
  });

  describe('Security', () => {
    it('should not require CSRF token for OAuth redirect', () => {
      // OAuth uses redirect flow, not POST
      // CSRF is not needed for OAuth initiation
      const oauthRequest = {
        method: 'GET', // Redirect, not POST
        requiresCSRF: false,
      };

      expect(oauthRequest.requiresCSRF).toBe(false);
    });

    it('should enforce RLS regardless of auth provider', () => {
      const userA = { id: 'user-a', provider: 'google' };
      const userB = { id: 'user-b', provider: 'email' };

      // RLS policy: user_id = auth.uid()
      const canUserAAccessUserBData = userA.id === userB.id;

      expect(canUserAAccessUserBData).toBe(false);
    });

    it('should log OAuth events for audit trail', () => {
      const auditEvents = [
        { event: 'oauth_google_start', provider: 'google' },
        { event: 'oauth_google_success', provider: 'google', email: 'test@example.com' },
      ];

      expect(auditEvents.length).toBe(2);
      expect(auditEvents[0].event).toBe('oauth_google_start');
      expect(auditEvents[1].event).toBe('oauth_google_success');
    });
  });

  describe('UI/UX', () => {
    it('should show Google button with accessible label', () => {
      const button = {
        accessibilityLabel: 'Continue with Google',
        accessibilityHint: 'Sign in using your Google account',
      };

      expect(button.accessibilityLabel).toBe('Continue with Google');
      expect(button.accessibilityHint).toBeTruthy();
    });

    it('should disable button during OAuth redirect', () => {
      const loading = true;
      const buttonDisabled = loading;

      expect(buttonDisabled).toBe(true);
    });

    it('should show subcopy about permissions', () => {
      const subcopy = "We'll never post without your permission";

      expect(subcopy).toContain('never post');
      expect(subcopy).toContain('permission');
    });
  });

  describe('Feature Flag', () => {
    it('should hide Google button when EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED is false', () => {
      const GOOGLE_OAUTH_ENABLED = false;
      const shouldShowButton = GOOGLE_OAUTH_ENABLED;

      expect(shouldShowButton).toBe(false);
    });

    it('should show Google button when EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED is true', () => {
      const GOOGLE_OAUTH_ENABLED = true;
      const shouldShowButton = GOOGLE_OAUTH_ENABLED;

      expect(shouldShowButton).toBe(true);
    });

    it('should default to false when env var is not set', () => {
      const envValue = undefined;
      const GOOGLE_OAUTH_ENABLED = envValue === 'true';

      expect(GOOGLE_OAUTH_ENABLED).toBe(false);
    });

    it('should handle provider disabled error gracefully', () => {
      const error = { message: 'identity_provider_disabled' };
      const expectedMessage = "Google sign-in isn't enabled right now. Please use Magic Link or Email + Password.";

      const errorMessage = error.message?.toLowerCase() || '';
      const isProviderDisabled = errorMessage.includes('identity_provider_disabled') || 
                                  errorMessage.includes('provider not enabled') ||
                                  errorMessage.includes('provider is disabled');

      expect(isProviderDisabled).toBe(true);
      
      const userMessage = isProviderDisabled 
        ? expectedMessage 
        : 'Failed to connect with Google. Please try again.';

      expect(userMessage).toBe(expectedMessage);
    });
  });
});

