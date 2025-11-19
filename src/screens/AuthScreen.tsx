import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { logSecurityEvent } from '../lib/mfa';
import { validatePassword } from '../lib/passwordValidation';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';

interface AuthScreenProps {
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

type AuthMode = 'signin' | 'signup';
type AuthMethod = 'magic' | 'password';

export function AuthScreen({ onNavigateToTerms, onNavigateToPrivacy }: AuthScreenProps) {
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
  
  // Magic link state
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const SITE_URL = Constants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost:8090';
  
  // Cooldown timer for magic link
  React.useEffect(() => {
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
  }, [mode, method]);

  const validateEmail = () => {
    setEmailError('');
    
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const validatePasswordField = () => {
    setPasswordError('');
    
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    
    // For signup, enforce strong password policy
    if (mode === 'signup') {
      const validation = validatePassword(password);
      if (!validation.valid) {
        setPasswordError(validation.errors[0] || 'Password does not meet requirements');
        return false;
      }
    }
    
    return true;
  };

  const handleMagicLink = async () => {
    if (!validateEmail()) return;
    if (cooldown > 0) return;

    setLoading(true);
    setEmailError('');

    try {
      // Call our rate-limited API endpoint
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${SITE_URL}/auth/callback`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
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
    if (!validateEmail() || !validatePasswordField()) return;

    setLoading(true);
    setEmailError('');
    setPasswordError('');

    try {
      if (mode === 'signup') {
        // Call our rate-limited API endpoint
        const response = await fetch('/api/auth/signup-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            redirectTo: `${SITE_URL}/auth/callback`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle specific error codes
          if (data.code === 'RATE_LIMIT_EXCEEDED') {
            setEmailError('Too many attempts. Please try again in a few minutes.');
          } else if (data.code === 'ANTIBOT_FAILED') {
            setEmailError('Verification failed. Please refresh and try again.');
          } else if (data.code === 'WEAK_PASSWORD') {
            setPasswordError(data.error || 'Password does not meet requirements');
            // Focus password input
            return; // Don't throw, just return to keep form state
          } else {
            throw new Error(data.error || 'Signup failed');
          }
          
          // Log failed attempt
          await logSecurityEvent('password_signup_failed', { email }, false);
          return;
        }

        // Success
        await logSecurityEvent('password_signup', { email });

        // Check if email confirmation is required
        if (data.emailConfirmationRequired) {
          Alert.alert(
            'Check your email',
            'We sent you a confirmation link. Please check your email to verify your account.',
            [{ text: 'OK' }]
          );
        }

        console.log('[Auth] Password signup successful');
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
          {/* Method Selector: Magic Link | Email + Password */}
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
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
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
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Password Input (only for password method) */}
          {method === 'password' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
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
                <PasswordStrengthMeter password={password} showErrors={false} />
              )}
              {passwordError ? (
                <Text style={styles.errorText} role="alert" aria-live="polite">{passwordError}</Text>
              ) : null}
            </View>
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
});
