/**
 * QR Code Display Component
 * Shows QR code for TOTP enrollment with manual key fallback
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

interface QRCodeDisplayProps {
  uri: string;
  secret: string;
  onCopySecret?: () => void;
}

export function QRCodeDisplay({ uri, secret, onCopySecret }: QRCodeDisplayProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySecret = async () => {
    await Clipboard.setStringAsync(secret);
    setCopied(true);
    onCopySecret?.();
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Format secret for display (e.g., "ABCD EFGH IJKL MNOP")
  const formattedSecret = secret.match(/.{1,4}/g)?.join(' ') || secret;

  return (
    <View style={styles.container}>
      {/* QR Code */}
      <View style={styles.qrContainer}>
        <QRCode
          value={uri}
          size={220}
          backgroundColor="white"
          color="black"
        />
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        Scan this QR code with your authenticator app
      </Text>

      {/* Manual Entry Toggle */}
      <TouchableOpacity
        style={styles.manualToggle}
        onPress={() => setShowSecret(!showSecret)}
      >
        <Text style={styles.manualToggleText}>
          {showSecret ? 'Hide' : 'Can\'t scan?'} Enter key manually
        </Text>
      </TouchableOpacity>

      {/* Manual Key Display */}
      {showSecret && (
        <View style={styles.secretContainer}>
          <Text style={styles.secretLabel}>Setup Key:</Text>
          <View style={styles.secretBox}>
            <Text style={styles.secretText}>{formattedSecret}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopySecret}
          >
            <Text style={styles.copyButtonText}>
              {copied ? '✓ Copied!' : 'Copy Key'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.secretHelp}>
            Enter this key in your authenticator app if you can't scan the QR code
          </Text>
        </View>
      )}

      {/* Supported Apps */}
      <View style={styles.appsContainer}>
        <Text style={styles.appsLabel}>Compatible apps:</Text>
        <Text style={styles.appsText}>
          Google Authenticator, 1Password, Authy, Microsoft Authenticator
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  instructions: {
    marginTop: 20,
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  manualToggle: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  manualToggleText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  secretContainer: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 20,
  },
  secretLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  secretBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secretText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1f2937',
    textAlign: 'center',
    letterSpacing: 1,
  },
  copyButton: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secretHelp: {
    marginTop: 12,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  appsContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  appsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  appsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
