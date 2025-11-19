/**
 * Reset Password Screen
 * Allows users to set a new password after clicking reset link
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { validatePassword } from '../lib/passwordValidation';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';

interface ResetPasswordScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function ResetPasswordScreen({ onSuccess, onBack }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [sessionValid, setSessionValid] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  // Verify recovery session on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        console.debug('[ResetPassword] Verifying recovery session');
        
        // Get current session (Supabase automatically handles recovery tokens from URL)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[ResetPassword] Session error:', error);
          Alert.alert(
            'Invalid Link',
            'This password reset link is invalid or has expired. Please request a new one.',
            [{ text: 'OK', onPress: onBack }]
          );
          return;
        }

        if (!session) {
          console.error('[ResetPassword] No session found');
          Alert.alert(
            'Invalid Link',
            'This password reset link is invalid or has expired. Please request a new one.',
            [{ text: 'OK', onPress: onBack }]
          );
          return;
        }

        console.log('[ResetPassword] Valid recovery session found');
        setSessionValid(true);
      } catch (error) {
        console.error('[ResetPassword] Verification error:', error);
        Alert.alert(
          'Error',
          'Failed to verify reset link. Please try again.',
          [{ text: 'OK', onPress: onBack }]
        );
      } finally {
        setVerifying(false);
      }
    };

    verifySession();
  }, [onBack]);

  const validatePasswordField = () => {
    setPasswordError('');
    
    if (!password) {
      setPasswordError('Password is required');
      setTimeout(() => passwordInputRef.current?.focus(), 100);
      return false;
    }
    
    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordError(validation.errors[0] || 'Password does not meet requirements');
      setTimeout(() => passwordInputRef.current?.focus(), 100);
      return false;
    }
    
    return true;
  };

  const validateConfirmField = () => {
    setConfirmError('');
    
    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      setTimeout(() => confirmInputRef.current?.focus(), 100);
      return false;
    }
    
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      setTimeout(() => confirmInputRef.current?.focus(), 100);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePasswordField()) return;
    if (!validateConfirmField()) return;

    setLoading(true);
    setPasswordError('');
    setConfirmError('');

    console.debug('[ResetPassword] Updating password');

    try {
      // Update user password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('[ResetPassword] Update error:', error);
        
        if (error.message?.includes('Password should be')) {
          setPasswordError(error.message);
          setTimeout(() => passwordInputRef.current?.focus(), 100);
        } else {
          Alert.alert('Error', error.message || 'Failed to update password. Please try again.');
        }
        return;
      }

      console.log('[ResetPassword] Password updated successfully');

      // Sign out to force re-authentication
      await supabase.auth.signOut();

      // Show success message and navigate to auth
      Alert.alert(
        'Password Updated',
        'Your password has been updated successfully. Please sign in with your new password.',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error: any) {
      console.error('[ResetPassword] Error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while verifying session
  if (verifying) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Verifying reset link...</Text>
          </View>
        </View>
      </View>
    );
  }

  // Show error if session is invalid
  if (!sessionValid) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.errorCard]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Invalid Link</Text>
            <Text style={styles.errorMessage}>
              This password reset link is invalid or has expired.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
            >
              <Text style={styles.backButtonText}>← Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>
            Choose a strong password for your account.
          </Text>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            ref={passwordInputRef}
            style={[styles.input, passwordError && styles.inputError]}
            placeholder="Min 10 characters, letter + number"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError('');
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            accessibilityLabel="New password"
            accessibilityHint="Must be at least 10 characters with a letter and number"
          />
          {password.length > 0 && (
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
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            ref={confirmInputRef}
            style={[styles.input, confirmError && styles.inputError]}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setConfirmError('');
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            accessibilityLabel="Confirm password"
            accessibilityHint="Re-enter your new password"
          />
          {confirmError ? (
            <Text 
              style={styles.errorText}
              role="alert"
              aria-live="polite"
              accessibilityLiveRegion="polite"
            >
              {confirmError}
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
            <Text style={styles.submitButtonText}>Update password</Text>
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
