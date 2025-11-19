import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

interface CheckEmailScreenProps {
  email: string;
  onVerified?: () => void;
  onResend?: () => void;
}

export function CheckEmailScreen({ email, onVerified, onResend }: CheckEmailScreenProps) {
  const [checking, setChecking] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  // Poll for email verification every 5 seconds
  useEffect(() => {
    if (!pollingEnabled) return;

    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.email_confirmed_at) {
          console.log('[CheckEmail] Email verified!');
          setPollingEnabled(false);
          onVerified?.();
        }
      } catch (error) {
        console.error('[CheckEmail] Polling error:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingEnabled, onVerified]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      // Force refresh the session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;

      if (session?.user?.email_confirmed_at) {
        console.log('[CheckEmail] Email verified via manual check!');
        onVerified?.();
      } else {
        // Show a message that it's not verified yet
        alert('Email not verified yet. Please check your inbox and click the confirmation link.');
      }
    } catch (error: any) {
      console.error('[CheckEmail] Manual check error:', error);
      alert(error.message || 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.message}>
          We sent a verification link to{' '}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>
        <Text style={styles.instructions}>
          Click the link in the email to verify your account and access GigLedger.
        </Text>

        <View style={styles.statusBox}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.statusText}>Waiting for verification...</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={handleManualCheck}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>I've verified my email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onResend}
        >
          <Text style={styles.secondaryButtonText}>Resend verification email</Text>
        </TouchableOpacity>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Didn't receive the email?</Text>
          <Text style={styles.helpText}>
            • Check your spam folder{'\n'}
            • Make sure you entered the correct email{'\n'}
            • Wait a few minutes and try resending
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  card: {
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
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
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
  instructions: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 24,
  },
  statusText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
});
