/**
 * MFA Verification Screen
 * Prompts for 6-digit TOTP code or backup code during login
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  createMFAChallenge,
  verifyMFAChallenge,
  verifyBackupCode,
  addTrustedDevice,
  type MFAFactor,
} from '../lib/mfa';

interface MFAVerifyScreenProps {
  factor: MFAFactor;
  onVerified: () => void;
  onCancel: () => void;
}

type VerifyMode = 'totp' | 'backup';

const TRUSTED_DEVICE_KEY = 'gl_mfa_trusted_device';

export function MFAVerifyScreen({ factor, onVerified, onCancel }: MFAVerifyScreenProps) {
  const [mode, setMode] = useState<VerifyMode>('totp');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [trustDevice, setTrustDevice] = useState(false);

  // Create MFA challenge on mount
  useEffect(() => {
    initChallenge();
  }, []);

  const initChallenge = async () => {
    try {
      const id = await createMFAChallenge(factor.id);
      setChallengeId(id);
    } catch (error) {
      console.error('[MFAVerify] Challenge creation error:', error);
      Alert.alert(
        'Verification Error',
        'Unable to start verification. Please try logging in again.',
        [{ text: 'OK', onPress: onCancel }]
      );
    }
  };

  const handleVerifyTOTP = async () => {
    if (!challengeId) {
      setError('Verification not ready. Please wait.');
      return;
    }

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await verifyMFAChallenge(factor.id, challengeId, code);

      // If user wants to trust this device, save token
      if (trustDevice) {
        await saveTrustedDevice();
      }

      onVerified();
    } catch (error) {
      console.error('[MFAVerify] Verification error:', error);
      setError('That code didn\'t match. Try again.');
      setCode('');
      
      // Create new challenge for next attempt
      initChallenge();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBackup = async () => {
    if (code.length < 8) {
      setError('Please enter a valid backup code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const isValid = await verifyBackupCode(code);

      if (!isValid) {
        throw new Error('Invalid backup code');
      }

      // If user wants to trust this device, save token
      if (trustDevice) {
        await saveTrustedDevice();
      }

      Alert.alert(
        'Backup Code Used',
        'You have successfully verified using a backup code. Consider regenerating your backup codes from account settings.',
        [{ text: 'OK', onPress: onVerified }]
      );
    } catch (error) {
      console.error('[MFAVerify] Backup code error:', error);
      setError('That backup code didn\'t work. Try another one.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const saveTrustedDevice = async () => {
    try {
      const deviceName = Platform.OS === 'ios' ? 'iPhone' :
                        Platform.OS === 'android' ? 'Android' :
                        'Web Browser';
      
      const deviceToken = await addTrustedDevice(deviceName);
      
      // Save token to secure storage
      if (Platform.OS === 'web') {
        localStorage.setItem(TRUSTED_DEVICE_KEY, deviceToken);
      } else {
        await SecureStore.setItemAsync(TRUSTED_DEVICE_KEY, deviceToken);
      }
    } catch (error) {
      console.error('[MFAVerify] Error saving trusted device:', error);
      // Don't fail verification if trust device fails
    }
  };

  const handleSubmit = () => {
    if (mode === 'totp') {
      handleVerifyTOTP();
    } else {
      handleVerifyBackup();
    }
  };

  const toggleMode = () => {
    setMode(mode === 'totp' ? 'backup' : 'totp');
    setCode('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>2-Step Verification</Text>
          <Text style={styles.subtitle}>
            {mode === 'totp'
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Enter one of your backup codes'}
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.codeInput, error && styles.codeInputError]}
            value={code}
            onChangeText={(text) => {
              if (mode === 'totp') {
                setCode(text.replace(/[^0-9]/g, ''));
              } else {
                setCode(text.toUpperCase().replace(/[^A-Z0-9-]/g, ''));
              }
              setError('');
            }}
            keyboardType={mode === 'totp' ? 'number-pad' : 'default'}
            maxLength={mode === 'totp' ? 6 : 9}
            placeholder={mode === 'totp' ? '000000' : 'ABCD-EFGH'}
            autoFocus
            editable={!loading}
            autoCapitalize="characters"
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>

        {/* Trust Device Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setTrustDevice(!trustDevice)}
          disabled={loading}
        >
          <View style={[styles.checkbox, trustDevice && styles.checkboxChecked]}>
            {trustDevice && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Remember this device for 30 days
          </Text>
        </TouchableOpacity>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (loading || code.length < (mode === 'totp' ? 6 : 8)) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || code.length < (mode === 'totp' ? 6 : 8)}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        {/* Toggle Mode */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleMode}
          disabled={loading}
        >
          <Text style={styles.toggleButtonText}>
            {mode === 'totp'
              ? 'Use a backup code instead'
              : 'Use authenticator app code'}
          </Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel & Sign Out</Text>
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {mode === 'totp'
              ? 'Lost your phone? Use a backup code to sign in.'
              : 'Each backup code can only be used once.'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    letterSpacing: 8,
  },
  codeInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  verifyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  toggleButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  helpContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  helpText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
