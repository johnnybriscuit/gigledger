import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { initializeUserData } from '../services/profileService';

interface AuthScreenProps {
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

export function AuthScreen({ onNavigateToTerms, onNavigateToPrivacy }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateForm = () => {
    setEmailError('');
    setPasswordError('');
    
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    
    if (!email.includes('@')) {
      setEmailError('Please enter a valid email');
      return false;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    
    if (isSignUp && !agreeToTerms) {
      Alert.alert('Terms Required', 'Please agree to the terms and conditions');
      return false;
    }
    
    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Initialize user data (profile + settings) - idempotent
        if (data.user) {
          await initializeUserData(data.user.id, data.user.email || email);
        }

        // Success - App.tsx will handle redirect to onboarding
        console.log('[Auth] Sign up successful, user will be redirected to onboarding');
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authPage}>
      <View style={styles.authCard}>
        {/* Header */}
        <View style={styles.authHeader}>
          <Text style={styles.authTitle}>GigLedger</Text>
          <Text style={styles.authSubtitle}>Track your music income & expenses</Text>
        </View>

        {/* Toggle Bar */}
        <View style={styles.authToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, !isSignUp && styles.toggleButtonActive]}
            onPress={() => {
              setIsSignUp(false);
              setEmailError('');
              setPasswordError('');
            }}
            disabled={loading}
          >
            <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isSignUp && styles.toggleButtonActive]}
            onPress={() => {
              setIsSignUp(true);
              setEmailError('');
              setPasswordError('');
            }}
            disabled={loading}
          >
            <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.authForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.authLabel}>Email</Text>
            <TextInput
              style={[styles.authInput, emailError && styles.inputError]}
              placeholder="your@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.authLabel}>Password</Text>
            <TextInput
              style={[styles.authInput, passwordError && styles.inputError]}
              placeholder={isSignUp ? "Create password (min 6 characters)" : "Enter your password"}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              autoCapitalize="none"
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {isSignUp && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              disabled={loading}
            >
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.authSubmit, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authSubmitText}>
                {isSignUp ? 'Create your free account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer with Terms and Privacy links */}
        {(onNavigateToTerms || onNavigateToPrivacy) && (
          <View style={styles.authFooter}>
            <View style={styles.footerLinks}>
              {onNavigateToTerms && (
                <TouchableOpacity onPress={onNavigateToTerms}>
                  <Text style={styles.footerLink}>Terms of Service</Text>
                </TouchableOpacity>
              )}
              {onNavigateToTerms && onNavigateToPrivacy && (
                <Text style={styles.footerSeparator}> • </Text>
              )}
              {onNavigateToPrivacy && (
                <TouchableOpacity onPress={onNavigateToPrivacy}>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Page container
  authPage: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  // Centered card
  authCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Header
  authHeader: {
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Toggle bar
  authToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 32,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#2563eb',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  // Form
  authForm: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  authLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  authInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  authSubmit: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  authSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  authFooter: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    fontSize: 13,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 13,
    color: '#6b7280',
    marginHorizontal: 8,
  },
});
