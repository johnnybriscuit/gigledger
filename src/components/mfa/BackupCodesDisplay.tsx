/**
 * Backup Codes Display Component
 * Shows one-time backup codes for 2FA recovery
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { BackupCode } from '../../lib/mfa';

interface BackupCodesDisplayProps {
  codes: BackupCode[];
  onDownload?: () => void;
  onContinue?: () => void;
}

export function BackupCodesDisplay({
  codes,
  onDownload,
  onContinue,
}: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopyAll = async () => {
    const codesText = codes.map(c => c.code).join('\n');
    await Clipboard.setStringAsync(codesText);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      const codesText = [
        'GigLedger 2FA Backup Codes',
        '===========================',
        '',
        'Save these codes in a secure location.',
        'Each code can only be used once.',
        '',
        ...codes.map((c, i) => `${i + 1}. ${c.code}`),
        '',
        `Generated: ${new Date().toLocaleString()}`,
      ].join('\n');

      if (Platform.OS === 'web') {
        // Web: trigger download
        const blob = new Blob([codesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gigledger-backup-codes-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Mobile: save to file and share
        const fileName = `gigledger-backup-codes-${Date.now()}.txt`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, codesText);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Save Backup Codes',
          });
        } else {
          Alert.alert(
            'Codes Saved',
            `Backup codes saved to: ${fileUri}`,
            [{ text: 'OK' }]
          );
        }
      }

      onDownload?.();
    } catch (error) {
      console.error('[BackupCodes] Download error:', error);
      Alert.alert(
        'Download Failed',
        'Unable to save backup codes. Please copy them manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Warning Banner */}
      <View style={styles.warningBanner}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Save These Codes</Text>
          <Text style={styles.warningText}>
            Each code works once. Store them securely—you'll need them if you lose your phone.
          </Text>
        </View>
      </View>

      {/* Codes Grid */}
      <ScrollView style={styles.codesScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.codesGrid}>
          {codes.map((code, index) => (
            <View key={index} style={styles.codeItem}>
              <Text style={styles.codeNumber}>{index + 1}</Text>
              <Text style={styles.codeText}>{code.code}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopyAll}
        >
          <Text style={styles.copyButtonText}>
            {copied ? '✓ Copied!' : 'Copy All'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownload}
          disabled={downloading}
        >
          <Text style={styles.downloadButtonText}>
            {downloading ? 'Saving...' : 'Download'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      {onContinue && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>
            I've Saved My Codes
          </Text>
        </TouchableOpacity>
      )}

      {/* Help Text */}
      <Text style={styles.helpText}>
        Print or download these codes and keep them somewhere safe
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  codesScroll: {
    maxHeight: 400,
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  codeItem: {
    width: '48%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginRight: 8,
    width: 20,
  },
  codeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1f2937',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  continueButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
