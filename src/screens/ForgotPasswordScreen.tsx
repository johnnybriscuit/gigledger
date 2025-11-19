/**
 * Forgot Password Screen
 * Allows users to request a password reset email
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Constants from 'expo-constants';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput>(null);

  const SITE_URL = Constants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
  const isSiteUrlMissing = !SITE_URL;

  // Fetch CSRF token on mount
  useEffect(() => {
    if (isSiteUrlMissing) return;
    
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token');
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, [isSiteUrlMissing]);

  const validateEmail = () => {
    setEmailError('');
    
    if (!email) {
      setEmailError('Email is required');
      setTimeout(() => emailInputRef.current?.focus(), 100);
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      setTimeout(() => emailInputRef.current?.focus(), 100);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (isSiteUrlMissing) return;
    if (!validateEmail()) return;

    setLoading(true);
    setEmailError('');

    console.debug('[ForgotPassword] Requesting password reset', { email });

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.debug('[ForgotPassword] Response', { status: response.status, data });

      if (!response.ok) {
        if (data.code === 'CSRF_FAILED') {
          console.error('[ForgotPassword] CSRF validation failed');
          // Refetch CSRF token
          const tokenResponse = await fetch('/api/csrf-token');
          const tokenData = await tokenResponse.json();
          setCsrfToken(tokenData.csrfToken);
          setEmailError('Security check failed. Please try again.');
          setTimeout(() => emailInputRef.current?.focus(), 100);
        } else if (data.code === 'RATE_LIMIT_EXCEEDED') {
          console.error('[ForgotPassword] Rate limit exceeded');
          setEmailError('Too many requests. Please try again in a few minutes.');
          setTimeout(() => emailInputRef.current?.focus(), 100);
        } else if (response.status >= 500) {
          console.error('[ForgotPassword] Server error', { status: response.status, data });
          setEmailError('Server error. Please try again later.');
        } else {
          console.error('[ForgotPassword] Unknown error', { status: response.status, data });
          setEmailError('Something went wrong. Please try again.');
        }
        return;
      }

      // Success - show confirmation
      console.log('[ForgotPassword] Password reset email sent');
      setEmailSent(true);
    } catch (error: any) {
      console.error('[ForgotPassword] Error:', error);
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show fatal error if SITE_URL is missing
  if (isSiteUrlMissing) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.errorCard]}>
          <View style={styles.fatalErrorContainer}>
            <Text style={styles.fatalErrorIcon}>⚠️</Text>
            <Text style={styles.fatalErrorTitle}>Configuration Error</Text>
            <Text style={styles.fatalErrorMessage}>
              EXPO_PUBLIC_SITE_URL is not configured. Please set this environment variable and redeploy.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Show success state
  if (emailSent) {
    return (
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successMessage}>
              If an account exists for <Text style={styles.emailHighlight}>{email}</Text>, you'll receive a password reset link.
            </Text>
            <Text style={styles.successInstructions}>
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </Text>

            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
            >
              <Text style={styles.backButtonText}>← Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
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
            accessibilityHint="Enter your email address to receive a password reset link"
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

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Send reset link</Text>
          )}
        </TouchableOpacity>

        {/* Back Link */}
        <TouchableOpacity
          style={styles.backLinkButton}
          onPress={onBack}
          disabled={loading}
        >
          <Text style={styles.backLinkText}>← Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  errorCard: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  backLinkButton: {
    padding: 12,
    alignItems: 'center',
  },
  backLinkText: {
    color: '#6b7280',
    fontSize: 14,
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
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
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
});
