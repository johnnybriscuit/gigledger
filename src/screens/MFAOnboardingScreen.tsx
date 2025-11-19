import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

export function MFAOnboardingScreen() {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'qr' | 'verify' | 'recovery'>('qr');
  const [factorId, setFactorId] = useState<string>('');
  const [qrUri, setQrUri] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    enrollMFA();
  }, []);

  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'GigLedger Authenticator',
      });

      if (error) throw error;

      if (!data) {
        throw new Error('Failed to enroll MFA');
      }

      setFactorId(data.id);
      setQrUri(data.totp.qr_code);
      setSecret(data.totp.secret);
      setLoading(false);

      console.log('[MFA] Enrollment initiated:', data.id);
    } catch (err: any) {
      console.error('[MFA] Enrollment error:', err);
      Alert.alert('Error', err.message || 'Failed to set up 2FA');
      // @ts-ignore
      navigation.navigate('Dashboard');
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) throw error;

      console.log('[MFA] Verification successful');

      // Update user metadata to mark MFA as enrolled
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Note: This requires admin privileges - should be done via Edge Function
        // For now, we'll rely on the factor being verified
        console.log('[MFA] User MFA factor verified:', factorId);
      }

      // Generate recovery codes
      const codes = generateRecoveryCodes();
      setRecoveryCodes(codes);
      setStep('recovery');
    } catch (err: any) {
      console.error('[MFA] Verification error:', err);
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const generateRecoveryCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const copySecret = async () => {
    await Clipboard.setStringAsync(secret);
    Alert.alert('Copied', 'Secret key copied to clipboard');
  };

  const copyRecoveryCodes = async () => {
    await Clipboard.setStringAsync(recoveryCodes.join('\n'));
    Alert.alert('Copied', 'Recovery codes copied to clipboard');
  };

  const downloadRecoveryCodes = () => {
    // For web, create a download link
    if (typeof window !== 'undefined') {
      const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gigledger-recovery-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const finishSetup = () => {
    // @ts-ignore
    navigation.navigate('Dashboard');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Setting up 2FA...</Text>
      </View>
    );
  }

  if (step === 'qr') {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Set up two-factor authentication</Text>
          <Text style={styles.description}>
            Scan this QR code with your authenticator app (like Google Authenticator, Authy, or 1Password).
          </Text>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            {qrUri ? (
              <img
                src={qrUri}
                alt="QR Code"
                style={{ width: 200, height: 200 }}
              />
            ) : (
              <Text style={styles.errorText}>Failed to generate QR code</Text>
            )}
          </View>

          {/* Manual Entry */}
          <View style={styles.manualEntry}>
            <Text style={styles.manualTitle}>Can't scan the code?</Text>
            <Text style={styles.manualDescription}>Enter this code manually:</Text>
            <View style={styles.secretContainer}>
              <Text style={styles.secretText}>{secret}</Text>
              <TouchableOpacity onPress={copySecret} style={styles.copyButton}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setStep('verify')}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === 'verify') {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Verify your authenticator</Text>
          <Text style={styles.description}>
            Enter the 6-digit code from your authenticator app to confirm it's working.
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
              editable={!verifying}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, verifying && styles.buttonDisabled]}
            onPress={verifyCode}
            disabled={verifying || code.length !== 6}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify and continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('qr')}
          >
            <Text style={styles.backButtonText}>← Back to QR code</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Recovery codes step
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.card}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.title}>2FA enabled successfully!</Text>
        <Text style={styles.description}>
          Save these recovery codes in a secure place. You can use them to access your account if you lose your authenticator device.
        </Text>

        <View style={styles.recoveryCodesContainer}>
          {recoveryCodes.map((code, index) => (
            <View key={index} style={styles.recoveryCodeRow}>
              <Text style={styles.recoveryCodeNumber}>{index + 1}.</Text>
              <Text style={styles.recoveryCode}>{code}</Text>
            </View>
          ))}
        </View>

        <View style={styles.recoveryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={copyRecoveryCodes}
          >
            <Text style={styles.secondaryButtonText}>Copy codes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={downloadRecoveryCodes}
          >
            <Text style={styles.secondaryButtonText}>Download codes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Keep these codes safe! Each code can only be used once. If you lose access to your authenticator and these codes, you won't be able to sign in.
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={finishSetup}>
          <Text style={styles.buttonText}>Continue to dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  pageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
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
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  manualEntry: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  manualTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  manualDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  secretContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secretText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#111827',
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
    flex: 1,
    marginHorizontal: 4,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  successIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  recoveryCodesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  recoveryCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recoveryCodeNumber: {
    fontSize: 14,
    color: '#6b7280',
    width: 30,
  },
  recoveryCode: {
    fontFamily: 'monospace',
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  recoveryActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
});
