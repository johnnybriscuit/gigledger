import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

interface AuthCallbackScreenProps {
  onNavigateToMFASetup?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToAuth?: () => void;
}

export function AuthCallbackScreen({ 
  onNavigateToMFASetup, 
  onNavigateToDashboard,
  onNavigateToAuth 
}: AuthCallbackScreenProps = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        setError('Your sign-in link is invalid or has expired.');
        setLoading(false);
        return;
      }

      console.log('[AuthCallback] Session established for:', session.user.email);

      // Check if MFA is enrolled
      const mfaEnrolled = session.user.app_metadata?.mfa_enrolled === true;

      if (!mfaEnrolled) {
        // First time login - redirect to MFA setup
        console.log('[AuthCallback] Redirecting to MFA setup');
        onNavigateToMFASetup?.();
      } else {
        // MFA already enrolled - redirect to dashboard
        console.log('[AuthCallback] Redirecting to dashboard');
        onNavigateToDashboard?.();
      }
    } catch (err: any) {
      console.error('[AuthCallback] Error:', err);
      setError(err.message || 'An error occurred during sign-in.');
      setLoading(false);
    }
  };

  const handleResendLink = () => {
    onNavigateToAuth?.();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Signing you in...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Sign-in failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={handleResendLink}>
          <Text style={styles.buttonText}>Request a new link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
