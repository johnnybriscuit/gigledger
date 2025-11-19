import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export function MFAChallengeScreen() {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    initChallenge();
  }, []);

  const initChallenge = async () => {
    try {
      // Get the user's MFA factors
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user session');
      }

      // Get all TOTP factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;

      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (!totpFactor) {
        throw new Error('No verified TOTP factor found');
      }

      setFactorId(totpFactor.id);

      // Create a challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      if (!challenge) {
        throw new Error('Failed to create MFA challenge');
      }

      setChallengeId(challenge.id);
      console.log('[MFA Challenge] Initialized:', challenge.id);
    } catch (err: any) {
      console.error('[MFA Challenge] Init error:', err);
      Alert.alert('Error', err.message || 'Failed to initialize 2FA challenge');
      // @ts-ignore
      navigation.navigate('Auth');
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (attempts >= 5) {
      setError('Too many failed attempts. Please sign in again.');
      setTimeout(() => {
        handleSignOut();
      }, 2000);
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) throw error;

      console.log('[MFA Challenge] Verification successful');

      // Redirect to dashboard
      // @ts-ignore
      navigation.navigate('Dashboard');
    } catch (err: any) {
      console.error('[MFA Challenge] Verification error:', err);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setError('Too many failed attempts. Signing you out...');
        setTimeout(() => {
          handleSignOut();
        }, 2000);
      } else {
        setError(`Invalid code. ${5 - newAttempts} attempts remaining.`);
      }
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // @ts-ignore
    navigation.navigate('Auth');
  };

  const handleUseRecoveryCode = () => {
    Alert.alert(
      'Recovery Code',
      'Enter one of your recovery codes instead of your authenticator code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Recovery Code',
          onPress: () => {
            // TODO: Implement recovery code flow
            Alert.alert('Coming Soon', 'Recovery code support will be added soon.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Two-factor authentication</Text>
        <Text style={styles.description}>
          Enter the 6-digit code from your authenticator app to continue.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Authentication code</Text>
          <TextInput
            style={[styles.input, styles.codeInput, error && styles.inputError]}
            placeholder="000000"
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!verifying && attempts < 5}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.button, (verifying || attempts >= 5) && styles.buttonDisabled]}
          onPress={verifyCode}
          disabled={verifying || code.length !== 6 || attempts >= 5}
        >
          {verifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleUseRecoveryCode}>
            <Text style={styles.linkText}>Use a recovery code</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.linkText}>Sign out</Text>
          </TouchableOpacity>
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
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
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
  codeInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 4,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    color: '#4F46E5',
    fontSize: 14,
  },
  separator: {
    color: '#d1d5db',
    marginHorizontal: 12,
  },
});
