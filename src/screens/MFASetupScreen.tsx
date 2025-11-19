/**
 * MFA Setup Screen
 * Multi-step flow for enrolling TOTP 2FA
 * Steps: 1. Scan QR, 2. Verify code, 3. Save backup codes
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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  enrollTOTP,
  verifyTOTPEnrollment,
  generateBackupCodes,
  type MFAEnrollmentResult,
  type BackupCode,
} from '../lib/mfa';
import { QRCodeDisplay } from '../components/mfa/QRCodeDisplay';
import { BackupCodesDisplay } from '../components/mfa/BackupCodesDisplay';

interface MFASetupScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type SetupStep = 'scan' | 'verify' | 'backup';

export function MFASetupScreen({ onComplete, onSkip }: MFASetupScreenProps) {
  const [step, setStep] = useState<SetupStep>('scan');
  const [loading, setLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<MFAEnrollmentResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);

  // Start enrollment on mount
  useEffect(() => {
    startEnrollment();
  }, []);

  const startEnrollment = async () => {
    try {
      setLoading(true);
      const data = await enrollTOTP();
      setEnrollmentData(data);
    } catch (error) {
      console.error('[MFASetup] Enrollment error:', error);
      Alert.alert(
        'Setup Error',
        'Unable to start 2FA setup. Please try again.',
        [
          { text: 'Retry', onPress: startEnrollment },
          { text: 'Cancel', onPress: onSkip, style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!enrollmentData) return;
    
    if (verificationCode.length !== 6) {
      setVerifyError('Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setVerifyError('');
      
      await verifyTOTPEnrollment(enrollmentData.factorId, verificationCode);
      
      // Generate backup codes
      const codes = await generateBackupCodes(10);
      setBackupCodes(codes);
      
      // Move to backup codes step
      setStep('backup');
    } catch (error) {
      console.error('[MFASetup] Verification error:', error);
      setVerifyError('That 6-digit code didn\'t match. Try again.');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    Alert.alert(
      '2-Step Verification Enabled',
      'Your account is now protected with 2-step verification.',
      [{ text: 'Great!', onPress: onComplete }]
    );
  };

  if (loading && !enrollmentData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Setting up 2-step verification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add 2-Step Verification</Text>
          <Text style={styles.subtitle}>
            {step === 'scan' && 'Use an authenticator app to keep your account safe. It takes ~30 seconds.'}
            {step === 'verify' && 'Enter the 6-digit code from your authenticator app'}
            {step === 'backup' && 'Save these backup codes in case you lose your phone'}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    step === 'scan' ? '33%' :
                    step === 'verify' ? '66%' :
                    '100%',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {step === 'scan' ? '1' : step === 'verify' ? '2' : '3'} of 3
          </Text>
        </View>

        {/* Step Content */}
        {step === 'scan' && enrollmentData && (
          <View style={styles.stepContent}>
            <QRCodeDisplay
              uri={enrollmentData.uri}
              secret={enrollmentData.secret}
            />
            
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep('verify')}
            >
              <Text style={styles.primaryButtonText}>
                I've Scanned the Code
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'verify' && (
          <View style={styles.stepContent}>
            <View style={styles.verifyContainer}>
              <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
              <TextInput
                style={[styles.codeInput, verifyError && styles.codeInputError]}
                value={verificationCode}
                onChangeText={(text) => {
                  setVerificationCode(text.replace(/[^0-9]/g, ''));
                  setVerifyError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                autoFocus
                editable={!loading}
              />
              
              {verifyError ? (
                <Text style={styles.errorText}>{verifyError}</Text>
              ) : null}

              <Text style={styles.verifyHelp}>
                Open your authenticator app and enter the 6-digit code shown for GigLedger
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (loading || verificationCode.length !== 6) && styles.buttonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep('scan')}
            >
              <Text style={styles.secondaryButtonText}>Back to QR Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'backup' && (
          <View style={styles.stepContent}>
            <BackupCodesDisplay
              codes={backupCodes}
              onContinue={handleComplete}
            />
          </View>
        )}

        {/* Skip Option (only on first step) */}
        {step === 'scan' && onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
          >
            <Text style={styles.skipButtonText}>I'll do this later</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
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
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  verifyContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
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
  verifyHelp: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
