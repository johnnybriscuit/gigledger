import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { logSecurityEvent } from '../lib/mfa';
import { validatePassword } from '../lib/passwordValidation';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';

interface AuthScreenProps {
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToForgotPassword?: () => void;
}

type AuthMode = 'signin' | 'signup';
type AuthMethod = 'magic' | 'password';

export function AuthScreen({ onNavigateToTerms, onNavigateToPrivacy, onNavigateToForgotPassword }: AuthScreenProps) {
  // Mode: Sign In or Create Account
  const [mode, setMode] = useState<AuthMode>('signin');
  
  // Method: Magic Link or Email + Password
  const [method, setMethod] = useState<AuthMethod>('magic');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Refs for focus management
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  
  // Magic link state
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  // CSRF token
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Runtime assertion: SITE_URL must be configured
  const SITE_URL = Constants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
  const isSiteUrlMissing = !SITE_URL;
  
  // Google OAuth feature flag (default true)
  const GOOGLE_OAUTH_ENABLED = Constants.expoConfig?.extra?.googleOAuthEnabled !== false && 
                                process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED !== 'false';
  
  // Fetch CSRF token on mount (skip if SITE_URL is missing)
  useEffect(() => {
    if (isSiteUrlMissing) return;
    
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token', {
          credentials: 'include', // Ensure cookies are sent/received
        });
        const data = await response.json();
        setCsrfToken(data.csrfToken);
        console.debug('[Auth] CSRF token fetched:', data.csrfToken?.substring(0, 16) + '...');
      } catch (error) {
        console.error('[Auth] Failed to fetch CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, [isSiteUrlMissing]);
  
  // Cooldown timer for magic link
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Reset form when switching modes or methods
  React.useEffect(() => {
    setEmailError('');
    setPasswordError('');
    setEmailSent(false);
    
    // If switching to Create account mode and password is selected, switch to magic
    if (mode === 'signup' && method === 'password') {
      setMethod('magic');
    }
  }, [mode, method]);

  const validateEmail = () => {
    setEmailError('');
    
    if (!email) {
      setEmailError('Email is required');
      // Focus email input on error
      setTimeout(() => emailInputRef.current?.focus(), 100);
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      // Focus email input on error
      setTimeout(() => emailInputRef.current?.focus(), 100);
      return false;
    }
    
    return true;
  };

  const validatePasswordField = () => {
    setPasswordError('');
    
    if (!password) {
      setPasswordError('Password is required');
      // Focus password input on error
      setTimeout(() => passwordInputRef.current?.focus(), 100);
      return false;
    }
    
    // For signup, enforce strong password policy
    if (mode === 'signup') {
      const validation = validatePassword(password);
      if (!validation.valid) {
        // Focus password input on error
        setTimeout(() => passwordInputRef.current?.focus(), 100);
        setPasswordError(validation.errors[0] || 'Password does not meet requirements');
        return false;
      }
    }
    
    return true;
  };

  const handleMagicLink = async () => {
    if (isSiteUrlMissing) return; // Block if SITE_URL is missing
    if (!validateEmail()) return;
    if (cooldown > 0) return;

    setLoading(true);
    setEmailError('');

    try {
      // Call our rate-limited API endpoint
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          email,
          redirectTo: `${SITE_URL}/auth/callback`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'CSRF_FAILED') {
          // Refetch CSRF token
          const tokenResponse = await fetch('/api/csrf-token');
          const tokenData = await tokenResponse.json();
          setCsrfToken(tokenData.csrfToken);
          setEmailError('Security check refreshed—please try again.');
        } else if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setEmailError('Too many attempts. Please try again in a few minutes.');
          setCooldown(60); // Show cooldown even on rate limit
        } else if (data.code === 'ANTIBOT_FAILED') {
          setEmailError('Verification failed. Please refresh and try again.');
        } else {
          setEmailError(data.error || 'Failed to send magic link. Please try again.');
        }
        
        // Log failed attempt
        await logSecurityEvent('magic_link_failed', { email, mode }, false);
        return;
      }

      // Success
      await logSecurityEvent('magic_link_sent', { email, mode });
      setEmailSent(true);
      setCooldown(60); // 60 second cooldown

      console.log('[Auth] Magic link sent to:', email);
    } catch (error: any) {
      console.error('[Auth] Magic link error:', error);
      setEmailError('Something went wrong. Please try again.');
      
      // Log failed attempt
      await logSecurityEvent('magic_link_failed', { email, mode }, false);
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async () => {
    if (isSiteUrlMissing) return; // Block if SITE_URL is missing
    if (!validateEmail()) return;
    if (!validatePasswordField()) return;

    setLoading(true);
    setEmailError('');
    setPasswordError('');

    console.debug('[Auth] Starting password flow', { mode, email });

    try {
      if (mode === 'signup') {
        // Call our rate-limited API endpoint
        console.debug('[Auth] Calling /api/auth/signup-password');
        const response = await fetch('/api/auth/signup-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken || '',
          },
          credentials: 'include', // Ensure cookies are sent
          body: JSON.stringify({
            email,
            password,
            redirectTo: `${SITE_URL}/auth/callback`,
          }),
        });

        const data = await response.json();
        console.debug('[Auth] Signup response', { status: response.status, data });

        if (!response.ok) {
          // Handle specific error codes
          if (data.code === 'CSRF_FAILED') {
            console.error('[Auth] CSRF validation failed');
            // Refetch CSRF token
            const tokenResponse = await fetch('/api/csrf-token', {
              credentials: 'include',
            });
            const tokenData = await tokenResponse.json();
            setCsrfToken(tokenData.csrfToken);
            console.debug('[Auth] CSRF token refetched:', tokenData.csrfToken?.substring(0, 16) + '...');
            setEmailError('Security check failed. Please try again.');
            setTimeout(() => emailInputRef.current?.focus(), 100);
          } else if (data.code === 'RATE_LIMIT_EXCEEDED') {
            console.error('[Auth] Rate limit exceeded');
            setEmailError('Too many attempts. Please try again in a few minutes.');
            setTimeout(() => emailInputRef.current?.focus(), 100);
          } else if (data.code === 'ANTIBOT_FAILED') {
            console.error('[Auth] Anti-bot check failed');
            setEmailError('Verification failed. Please refresh and try again.');
            setTimeout(() => emailInputRef.current?.focus(), 100);
          } else if (data.code === 'WEAK_PASSWORD') {
            console.error('[Auth] Weak password rejected');
            setPasswordError(data.error || 'Password does not meet requirements');
            setTimeout(() => passwordInputRef.current?.focus(), 100);
          } else if (data.code === 'USER_EXISTS') {
            console.error('[Auth] User already exists');
            setEmailError('Email already registered. Try Sign in or Magic link.');
            setTimeout(() => emailInputRef.current?.focus(), 100);
          } else if (response.status === 401) {
            console.error('[Auth] Unauthorized', data);
            setEmailError(data.error || 'Email not allowed');
            setTimeout(() => emailInputRef.current?.focus(), 100);
          } else if (response.status >= 500) {
            console.error('[Auth] Server error', { status: response.status, data });
            setEmailError('Server error. Please try again later.');
          } else {
            console.error('[Auth] Unknown error', { status: response.status, data });
            setEmailError(data.error || 'Signup failed. Please try again.');
          }
          
          // Log failed attempt
          await logSecurityEvent('password_signup_failed', { email, code: data.code }, false);
          return;
        }

        // Success - always navigate to Check Email screen for signups
        console.log('[Auth] Password signup successful', { emailConfirmationRequired: data.emailConfirmationRequired });
        await logSecurityEvent('password_signup', { email });

        // Always show "Check your email" screen for signups
        // Even if emailConfirmationRequired is false, we want users to verify their email
        setEmailSent(true);
        console.log('[Auth] Showing Check Email screen - user must verify email before signing in');
      } else {
        // Sign in with password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Log security event
        await logSecurityEvent('password_signin', { email });

        console.log('[Auth] Password sign-in successful');
      }
    } catch (error: any) {
      console.error('[Auth] Password error:', error);
      
      if (error.message?.includes('Invalid login credentials')) {
        setPasswordError('Invalid email or password');
      } else if (error.message?.includes('Email not confirmed')) {
        setEmailError('Please confirm your email before signing in');
      } else {
        setEmailError(error.message || 'Authentication failed. Please try again.');
      }
      
      // Log failed attempt
      await logSecurityEvent(
        mode === 'signup' ? 'password_signup_failed' : 'password_signin_failed',
        { email },
        false
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSiteUrlMissing) return;

    setLoading(true);
    console.debug('[Auth] Starting Google OAuth flow');

    try {
      // Log OAuth start
      await logSecurityEvent('oauth_google_start', { provider: 'google' });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
          scopes: 'openid email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[Auth] Google OAuth error:', error);
        
        // Check if provider is disabled
        const errorMessage = error.message?.toLowerCase() || '';
        if (errorMessage.includes('identity_provider_disabled') || 
            errorMessage.includes('provider not enabled') ||
            errorMessage.includes('provider is disabled')) {
          setEmailError("Google sign-in isn't enabled right now. Please use Magic Link or Email + Password.");
          await logSecurityEvent('oauth_google_error', { provider: 'google', reason: 'provider_disabled' }, false);
        } else {
          setEmailError('Failed to connect with Google. Please try again.');
          await logSecurityEvent('oauth_google_error', { provider: 'google', error: error.message }, false);
        }
        setLoading(false);
      }
      // If successful, browser will redirect to Google
      // Loading state will persist until redirect happens
    } catch (error: any) {
      console.error('[Auth] Google OAuth error:', error);
      
      // Check if provider is disabled
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('identity_provider_disabled') || 
          errorMessage.includes('provider not enabled') ||
          errorMessage.includes('provider is disabled')) {
        setEmailError("Google sign-in isn't enabled right now. Please use Magic Link or Email + Password.");
        await logSecurityEvent('oauth_google_error', { provider: 'google', reason: 'provider_disabled' }, false);
      } else {
        setEmailError('Failed to connect with Google. Please try again.');
        await logSecurityEvent('oauth_google_error', { provider: 'google', error: error.message }, false);
      }
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (method === 'magic') {
      handleMagicLink();
    } else {
      handlePassword();
    }
  };

  // Magic link confirmation screen
  if (emailSent && method === 'magic') {
    return (
      <ScrollView 
        style={styles.authPage}
        contentContainerStyle={styles.authPageContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authCard}>
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successMessage}>
              We've sent a magic link to{' '}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <Text style={styles.successInstructions}>
              Click the link in the email to {mode === 'signup' ? 'create your account' : 'sign in'}. The link will expire in 1 hour.
            </Text>

            <TouchableOpacity
              style={[styles.resendButton, cooldown > 0 && styles.buttonDisabled]}
              onPress={handleMagicLink}
              disabled={cooldown > 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#4F46E5" />
              ) : (
                <Text style={styles.resendButtonText}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend magic link'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setEmailSent(false);
                setEmail('');
                setCooldown(0);
              }}
            >
              <Text style={styles.backButtonText}>← Use a different email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Show fatal error if SITE_URL is missing
  if (isSiteUrlMissing) {
    return (
      <View style={styles.authPage}>
        <View style={[styles.authCard, styles.errorCard]}>
          <View style={styles.fatalErrorContainer}>
            <Text style={styles.fatalErrorIcon}>⚠️</Text>
            <Text style={styles.fatalErrorTitle}>Configuration Error</Text>
            <Text style={styles.fatalErrorMessage}>
              EXPO_PUBLIC_SITE_URL is not configured. Please set this environment variable and redeploy.
            </Text>
            <Text style={styles.fatalErrorDetails}>
              This is required for secure authentication redirects. Contact your administrator.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.authPage}
      contentContainerStyle={styles.authPageContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.authCard}>
        {/* Header */}
        <View style={styles.authHeader}>
          <Text style={styles.authTitle}>GigLedger</Text>
          <Text style={styles.authSubtitle}>Track your music income & expenses</Text>
        </View>

        {/* Mode Tabs: Sign In | Create Account */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
            onPress={() => setMode('signin')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'signin' }}
          >
            <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>
              Sign in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
            onPress={() => setMode('signup')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'signup' }}
          >
            <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Auth Form */}
        <View style={styles.authForm}>
          {/* Google SSO Button - Only show if enabled */}
          {GOOGLE_OAUTH_ENABLED && (
            <>
              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
                accessibilityLabel="Continue with Google"
                accessibilityHint="Sign in using your Google account"
              >
                {loading ? (
                  <ActivityIndicator color="#1F2937" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <View style={styles.googleTextContainer}>
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                      <Text style={styles.googleSubtext}>We'll never post without your permission</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          {/* Method Selector: Magic Link | Email + Password */}
          {/* In Create account mode: only show Magic link */}
          {/* In Sign in mode: show both Magic link and Email + Password */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[styles.methodOption, method === 'magic' && styles.methodOptionActive]}
              onPress={() => setMethod('magic')}
              accessibilityRole="radio"
              accessibilityState={{ checked: method === 'magic' }}
            >
              <View style={[styles.radio, method === 'magic' && styles.radioActive]}>
                {method === 'magic' && <View style={styles.radioDot} />}
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Magic link</Text>
                <Text style={styles.methodDescription}>Sign in with a link sent to your email</Text>
              </View>
            </TouchableOpacity>

            {/* Only show Email + Password in Sign in mode */}
            {mode === 'signin' && (
              <TouchableOpacity
                style={[styles.methodOption, method === 'password' && styles.methodOptionActive]}
                onPress={() => setMethod('password')}
                accessibilityRole="radio"
                accessibilityState={{ checked: method === 'password' }}
              >
                <View style={[styles.radio, method === 'password' && styles.radioActive]}>
                  {method === 'password' && <View style={styles.radioDot} />}
                </View>
                <View style={styles.methodContent}>
                  <Text style={styles.methodTitle}>Email + Password</Text>
                  <Text style={styles.methodDescription}>Traditional email and password</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              ref={emailInputRef}
              style={[styles.input, emailError && styles.inputError]}
              placeholder="your@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address"
            />
            {emailError ? (
              <Text 
                style={styles.errorText}
                role="alert"
                aria-live="polite"
                accessibilityLiveRegion="polite"
              >
                {emailError}
              </Text>
            ) : null}
          </View>

          {/* Password Input (only for password method) */}
          {method === 'password' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, passwordError && styles.inputError]}
                placeholder={mode === 'signup' ? 'Min 10 characters, letter + number' : 'Enter your password'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                accessibilityLabel="Password"
                accessibilityHint={mode === 'signup' ? 'Must be at least 10 characters with a letter and number' : undefined}
              />
              {mode === 'signup' && password.length > 0 && (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Password strength: ${validatePassword(password).strength}`}
                >
                  <PasswordStrengthMeter password={password} showErrors={false} />
                </View>
              )}
              {passwordError ? (
                <Text 
                  style={styles.errorText} 
                  role="alert" 
                  aria-live="polite"
                  accessibilityLiveRegion="polite"
                >
                  {passwordError}
                </Text>
              ) : null}
              {/* Forgot Password Link (Sign in mode only) */}
              {mode === 'signin' && (
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={onNavigateToForgotPassword}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Helper Text for Create Account */}
          {mode === 'signup' && method === 'password' && (
            <Text style={styles.helperText}>
              You'll receive a verification email to activate your account. After verifying, you will set up two-factor authentication.
            </Text>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.authSubmit, (loading || (method === 'magic' && cooldown > 0)) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || (method === 'magic' && cooldown > 0)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authSubmitText}>
                {method === 'magic' 
                  ? (cooldown > 0 ? `Wait ${cooldown}s` : `Send magic link`)
                  : (mode === 'signup' ? 'Create account' : 'Sign in')
                }
              </Text>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            By continuing, you agree to our{' '}
            <Text style={styles.link} onPress={onNavigateToTerms}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={onNavigateToPrivacy}>
              Privacy Policy
            </Text>
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.authFooter}>
          <Text style={styles.footerText}>
            🔒 Secure authentication • Two-factor authentication available
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authPage: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  authPageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  authCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  modeTabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  authForm: {
    width: '100%',
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 12,
  },
  googleTextContainer: {
    flex: 1,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  googleSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  methodSelector: {
    marginBottom: 24,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  methodOptionActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#f5f3ff',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#4F46E5',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 4,
  },
  authSubmit: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  authSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  forgotPasswordButton: {
    marginTop: 8,
    padding: 4,
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  authFooter: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#4F46E5',
  },
  successInstructions: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  resendButton: {
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  errorCard: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  fatalErrorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  fatalErrorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  fatalErrorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 16,
  },
  fatalErrorMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  fatalErrorDetails: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
