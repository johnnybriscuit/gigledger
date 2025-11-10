import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { initializeUserData } from '../services/profileService';

export function AuthScreen() {
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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>GigLedger</Text>
        <Text style={styles.subtitle}>Track your music income & expenses</Text>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, !isSignUp && styles.tabActive]}
            onPress={() => {
              setIsSignUp(false);
              setEmailError('');
              setPasswordError('');
            }}
            disabled={loading}
          >
            <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, isSignUp && styles.tabActive]}
            onPress={() => {
              setIsSignUp(true);
              setEmailError('');
              setPasswordError('');
            }}
            disabled={loading}
          >
            <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
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

          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
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
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Create your free account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: -8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
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
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
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
});
