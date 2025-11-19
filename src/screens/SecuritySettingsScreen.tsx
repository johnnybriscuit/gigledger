/**
 * Security Settings Screen
 * Manage 2FA, backup codes, and trusted devices
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { format } from 'date-fns';
import {
  isMFAEnabled,
  getMFAFactors,
  unenrollMFA,
  generateBackupCodes,
  getRemainingBackupCodesCount,
  getTrustedDevices,
  removeTrustedDevice,
  removeAllTrustedDevices,
  getSecurityEvents,
  type MFAFactor,
  type TrustedDevice,
  type SecurityEvent,
  type BackupCode,
} from '../lib/mfa';
import { BackupCodesDisplay } from '../components/mfa/BackupCodesDisplay';

interface SecuritySettingsScreenProps {
  onNavigateToMFASetup: () => void;
  onBack?: () => void;
}

export function SecuritySettingsScreen({
  onNavigateToMFASetup,
  onBack,
}: SecuritySettingsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactor, setMfaFactor] = useState<MFAFactor | null>(null);
  const [backupCodesCount, setBackupCodesCount] = useState(0);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<BackupCode[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      const [enabled, factors, codesCount, devices, events] = await Promise.all([
        isMFAEnabled(),
        getMFAFactors(),
        getRemainingBackupCodesCount(),
        getTrustedDevices(),
        getSecurityEvents(20),
      ]);

      setMfaEnabled(enabled);
      setMfaFactor(factors.find(f => f.status === 'verified') || null);
      setBackupCodesCount(codesCount);
      setTrustedDevices(devices);
      setSecurityEvents(events);
    } catch (error) {
      console.error('[SecuritySettings] Load error:', error);
      Alert.alert('Error', 'Failed to load security settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEnableMFA = () => {
    onNavigateToMFASetup();
  };

  const handleDisableMFA = () => {
    Alert.alert(
      'Disable 2-Step Verification?',
      'Your account will be less secure. You can re-enable it anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!mfaFactor) return;
              
              setLoading(true);
              await unenrollMFA(mfaFactor.id);
              
              Alert.alert(
                'Disabled',
                '2-step verification has been disabled.',
                [{ text: 'OK', onPress: loadSecurityData }]
              );
            } catch (error) {
              console.error('[SecuritySettings] Disable MFA error:', error);
              Alert.alert('Error', 'Failed to disable 2-step verification');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRegenerateBackupCodes = async () => {
    Alert.alert(
      'Regenerate Backup Codes?',
      'Your old backup codes will stop working. Save the new codes securely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            try {
              setLoading(true);
              const codes = await generateBackupCodes(10);
              setNewBackupCodes(codes);
              setShowBackupCodes(true);
              await loadSecurityData();
            } catch (error) {
              console.error('[SecuritySettings] Regenerate codes error:', error);
              Alert.alert('Error', 'Failed to generate backup codes');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveDevice = (device: TrustedDevice) => {
    Alert.alert(
      'Remove Trusted Device?',
      `${device.device_name || 'This device'} will require 2FA on next login.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTrustedDevice(device.id);
              await loadSecurityData();
            } catch (error) {
              console.error('[SecuritySettings] Remove device error:', error);
              Alert.alert('Error', 'Failed to remove device');
            }
          },
        },
      ]
    );
  };

  const handleRemoveAllDevices = () => {
    Alert.alert(
      'Remove All Trusted Devices?',
      'All devices will require 2FA on next login.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAllTrustedDevices();
              await loadSecurityData();
            } catch (error) {
              console.error('[SecuritySettings] Remove all devices error:', error);
              Alert.alert('Error', 'Failed to remove devices');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (showBackupCodes && newBackupCodes.length > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>New Backup Codes</Text>
            <Text style={styles.subtitle}>
              Save these codes securely. Your old codes no longer work.
            </Text>
          </View>

          <BackupCodesDisplay
            codes={newBackupCodes}
            onContinue={() => {
              setShowBackupCodes(false);
              setNewBackupCodes([]);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Security Settings</Text>
          <Text style={styles.subtitle}>
            Manage your account security and authentication
          </Text>
        </View>

        {/* 2FA Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2-Step Verification</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>🔐</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Authenticator App</Text>
                <Text style={styles.cardDescription}>
                  {mfaEnabled
                    ? 'Enabled - Your account is protected'
                    : 'Add an extra layer of security'}
                </Text>
              </View>
              <View style={[styles.badge, mfaEnabled && styles.badgeActive]}>
                <Text style={[styles.badgeText, mfaEnabled && styles.badgeTextActive]}>
                  {mfaEnabled ? 'Active' : 'Off'}
                </Text>
              </View>
            </View>

            {mfaEnabled ? (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleDisableMFA}
                >
                  <Text style={styles.secondaryButtonText}>Disable</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleEnableMFA}
                >
                  <Text style={styles.primaryButtonText}>Enable 2FA</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Backup Codes Section */}
        {mfaEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Backup Codes</Text>
            
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>🔑</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Recovery Codes</Text>
                  <Text style={styles.cardDescription}>
                    {backupCodesCount} unused codes remaining
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleRegenerateBackupCodes}
                >
                  <Text style={styles.secondaryButtonText}>Regenerate Codes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Trusted Devices Section */}
        {mfaEnabled && trustedDevices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trusted Devices</Text>
              <TouchableOpacity onPress={handleRemoveAllDevices}>
                <Text style={styles.sectionAction}>Remove All</Text>
              </TouchableOpacity>
            </View>

            {trustedDevices.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>
                    {device.device_name || 'Unknown Device'}
                  </Text>
                  <Text style={styles.deviceMeta}>
                    Last used: {format(new Date(device.last_used_at), 'MMM d, yyyy')}
                  </Text>
                  <Text style={styles.deviceMeta}>
                    Expires: {format(new Date(device.expires_at), 'MMM d, yyyy')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deviceRemove}
                  onPress={() => handleRemoveDevice(device)}
                >
                  <Text style={styles.deviceRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Security Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {securityEvents.length === 0 ? (
            <Text style={styles.emptyText}>No recent security events</Text>
          ) : (
            securityEvents.slice(0, 10).map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventIcon}>
                  <Text style={styles.eventIconText}>
                    {event.success ? '✓' : '✗'}
                  </Text>
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventType}>
                    {formatEventType(event.event_type)}
                  </Text>
                  <Text style={styles.eventTime}>
                    {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatEventType(type: string): string {
  const formats: Record<string, string> = {
    signup_success: 'Account created',
    login_success: 'Signed in',
    login_failed: 'Failed sign in attempt',
    mfa_enrollment_completed: '2FA enabled',
    mfa_unenrolled: '2FA disabled',
    backup_codes_generated: 'Backup codes generated',
    backup_code_used: 'Backup code used',
    trusted_device_added: 'Device trusted',
    trusted_device_removed: 'Device removed',
  };

  return formats[type] || type.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionAction: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  badgeTextActive: {
    color: '#16a34a',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  deviceMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  deviceRemove: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deviceRemoveText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventIconText: {
    fontSize: 16,
  },
  eventContent: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
