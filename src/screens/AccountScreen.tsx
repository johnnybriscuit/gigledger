import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaxSettingsSection } from '../components/TaxSettingsSection';
import { AddressPlacesInput } from '../components/AddressPlacesInput';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { formatRelativeTime } from '../lib/profile';
import { H1, H2, Text, Button, Card } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { usePaymentMethodDetails, PaymentMethod } from '../hooks/usePaymentMethodDetails';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];


interface AccountScreenProps {
  onNavigateToBusinessStructures?: () => void;
  onNavigateToInvoices?: () => void;
}

export function AccountScreen({ onNavigateToBusinessStructures, onNavigateToInvoices }: AccountScreenProps = {}) {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width >= 768;
  const isMobileWeb = isWeb && width < 768;

  // Dev logging for breakpoint verification
  if (__DEV__) {
    console.log('[AccountScreen] width:', width, 'isDesktopWeb:', isDesktopWeb, 'isMobileWeb:', isMobileWeb);
  }
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingTaxSettings, setIsEditingTaxSettings] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [homeAddressFull, setHomeAddressFull] = useState('');
  const [homeAddressPlaceId, setHomeAddressPlaceId] = useState('');
  const [homeAddressLat, setHomeAddressLat] = useState<number | null>(null);
  const [homeAddressLng, setHomeAddressLng] = useState<number | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch payment method details (read-only for display)
  const { data: paymentMethods = [] } = usePaymentMethodDetails(user?.id);

  // Fetch user profile with new hook
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  // Update profile mutation with new hook
  const updateProfileMutation = useUpdateProfile(user?.id || '');

  // Initialize form values when profile loads
  useEffect(() => {
    if (profile) {
      console.log('[AccountScreen] Loading profile data:', {
        home_address: profile.home_address,
        home_address_full: profile.home_address_full,
        home_address_place_id: profile.home_address_place_id,
        home_address_lat: profile.home_address_lat,
        home_address_lng: profile.home_address_lng,
      });
      setFullName(profile.full_name || '');
      setHomeAddress(profile.home_address || '');
      setHomeAddressFull(profile.home_address_full || '');
      setHomeAddressPlaceId(profile.home_address_place_id || '');
      setHomeAddressLat(profile.home_address_lat);
      setHomeAddressLng(profile.home_address_lng);
    }
  }, [profile]);

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to change password');
    },
  });

  const handleSignOut = async () => {
    // On web, use window.confirm instead of Alert.alert
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await supabase.auth.signOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await supabase.auth.signOut();
            },
          },
        ]
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    const updates = { 
      full_name: fullName,
      home_address: homeAddress || undefined,
      home_address_full: homeAddressFull || undefined,
      home_address_place_id: homeAddressPlaceId || undefined,
      home_address_lat: homeAddressLat ?? undefined,
      home_address_lng: homeAddressLng ?? undefined,
    };
    
    console.log('[AccountScreen] Saving profile with updates:', updates);
    
    try {
      const result = await updateProfileMutation.mutateAsync(updates);
      console.log('[AccountScreen] Profile saved successfully:', result);
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('[AccountScreen] Failed to save profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = () => {
    changePasswordMutation.mutate();
  };


  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[
        styles.content,
        isMobileWeb && styles.contentMobile,
        isDesktopWeb && styles.contentDesktop,
      ]}>
        {/* Debug indicator - DEV ONLY */}
        {__DEV__ && (
          <View style={styles.debugBadge}>
            <Text style={styles.debugText}>
              {Platform.OS} | width={width} | isDesktopWeb={isDesktopWeb ? 'true' : 'false'} | {isDesktopWeb ? 'DESKTOP' : 'MOBILE'}
            </Text>
          </View>
        )}
        
        <H1>Account Settings</H1>

        {/* Two-column layout on desktop, stacked on mobile */}
        <View style={[
          styles.gridContainer,
          isDesktopWeb && styles.gridContainerDesktop,
        ]}>
          {/* Left Column: Profile + Tax Settings */}
          <View style={[
            styles.leftColumn,
            isDesktopWeb && styles.leftColumnDesktop,
          ]}>
            {/* Profile Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <H2>Profile</H2>
              </View>

          <Card variant="flat" style={styles.card}>
            <View style={styles.fieldCompact}>
              <Text semibold style={styles.fieldLabel}>Email</Text>
              <Text>{user?.email}</Text>
              <Text subtle style={styles.fieldHintCompact}>Cannot be changed</Text>
            </View>

            <View style={styles.fieldCompact}>
              <Text semibold style={styles.fieldLabel}>Full Name</Text>
              {isEditingProfile ? (
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your name"
                />
              ) : (
                <Text>{profile?.full_name || 'Not set'}</Text>
              )}
            </View>

            {isEditingProfile ? (
              <AddressPlacesInput
                label="Home Address"
                placeholder="123 Main St, City, State ZIP"
                value={homeAddressFull}
                onChange={setHomeAddressFull}
                onSelect={async (item: { description: string; place_id: string }) => {
                  setHomeAddressFull(item.description);
                  setHomeAddressPlaceId(item.place_id);
                  
                  // Fetch place details to get lat/lng
                  try {
                    const response = await fetch(`/api/places/details?place_id=${item.place_id}`, {
                      credentials: 'include',
                    });
                    
                    if (response.ok) {
                      const details = await response.json();
                      if (details.location) {
                        setHomeAddressLat(details.location.lat);
                        setHomeAddressLng(details.location.lng);
                      }
                    }
                  } catch (error) {
                    console.error('Error fetching place details:', error);
                  }
                }}
              />
            ) : (
              <View style={styles.fieldCompact}>
                <Text semibold style={styles.fieldLabel}>Home Address</Text>
                <Text>{profile?.home_address_full || 'Not set'}</Text>
                <Text subtle style={styles.fieldHintCompact}>For mileage auto-calculation</Text>
              </View>
            )}

            {/* Last Saved Indicator */}
            {!isEditingProfile && profile?.updated_at && (
              <View style={styles.lastSavedContainer}>
                <Text subtle style={{ fontStyle: 'italic' }}>
                  Last saved {formatRelativeTime(profile.updated_at)}
                </Text>
              </View>
            )}

            {isEditingProfile && (
              <View style={styles.buttonRow}>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setIsEditingProfile(false);
                    setFullName(profile?.full_name || '');
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  style={{ flex: 1 }}
                >
                  {updateProfileMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    'Save'
                  )}
                </Button>
              </View>
            )}
          </Card>
            </View>

            {/* Tax Settings Section */}
            <TaxSettingsSection 
              isEditing={isEditingTaxSettings}
              onEditChange={setIsEditingTaxSettings}
              hideEditButton={true}
              onNavigateToBusinessStructures={onNavigateToBusinessStructures}
            />

            {/* Payment Methods Section - Read-only shortcut */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <H2>Payment Methods</H2>
              </View>
              <Card variant="flat" style={styles.card}>
                <Text subtle style={styles.sectionDescription}>
                  Payment methods are managed in Invoices → Settings.
                </Text>

                {/* Read-only summary */}
                {paymentMethods.length > 0 ? (
                  <View style={styles.paymentMethodsSummary}>
                    {paymentMethods.map((pm) => (
                      <View key={pm.method} style={styles.paymentMethodSummaryRow}>
                        <Text style={styles.paymentMethodSummaryText}>
                          {pm.enabled ? '✅' : '☐'} {pm.method.charAt(0).toUpperCase() + pm.method.slice(1)}
                          {pm.enabled && pm.details ? `: ${pm.details}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text subtle style={styles.noPaymentMethodsText}>
                    No payment methods configured yet.
                  </Text>
                )}

                <Button
                  variant="primary"
                  onPress={() => {
                    if (onNavigateToInvoices) {
                      onNavigateToInvoices();
                    } else {
                      Alert.alert('Navigation', 'Please navigate to Invoices → Settings to manage payment methods.');
                    }
                  }}
                  style={styles.goToInvoiceSettingsButton}
                >
                  Go to Invoice Settings
                </Button>
              </Card>
            </View>
          </View>

          {/* Right Column: Account Actions */}
          <View style={[
            styles.rightColumn,
            isDesktopWeb && styles.rightColumnDesktop,
          ]}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <H2>Account Actions</H2>
              </View>
              <Card variant="flat" style={styles.card}>
                <Button
                  variant="ghost"
                  onPress={() => setIsEditingProfile(true)}
                  style={styles.actionButton}
                >
                  ✏️ Edit Profile
                </Button>

                <Button
                  variant="ghost"
                  onPress={() => setIsEditingTaxSettings(true)}
                  style={styles.actionButton}
                >
                  📊 Edit Tax Settings
                </Button>

                <Button
                  variant="ghost"
                  onPress={() => setIsChangingPassword(true)}
                  style={styles.actionButton}
                >
                  🔒 Change Password
                </Button>

                <Button
                  variant="destructive"
                  onPress={handleSignOut}
                  style={styles.actionButton}
                >
                  🚪 Sign Out
                </Button>
              </Card>
            </View>

            {/* Change Password Modal (when active) */}
            {isChangingPassword && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <H2>Change Password</H2>
                </View>
                <Card variant="flat" style={styles.card}>
                  <View style={styles.fieldCompact}>
                    <Text semibold style={styles.fieldLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldCompact}>
                    <Text semibold style={styles.fieldLabel}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setIsChangingPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onPress={handleChangePassword}
                      disabled={changePasswordMutation.isPending}
                      style={{ flex: 1 }}
                    >
                      {changePasswordMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        'Update'
                      )}
                    </Button>
                  </View>
                </Card>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
  },
  content: {
    padding: parseInt(spacing[5]),
    paddingBottom: parseInt(spacing[10]),
    width: '100%',
  },
  contentMobile: {
    padding: parseInt(spacing[4]),
    paddingBottom: parseInt(spacing[8]),
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  contentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
  },
  // Mobile-first: base styles apply to ALL (mobile default)
  gridContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  gridContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // Mobile-first column styles
  leftColumn: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexShrink: 1,
    alignSelf: 'stretch',
    marginRight: 0,
    marginBottom: parseInt(spacing[6]),
    position: 'relative',
  },
  leftColumnDesktop: {
    flex: 1,
    width: undefined,
    maxWidth: undefined,
    marginRight: parseInt(spacing[6]),
    marginBottom: 0,
  },
  rightColumn: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexShrink: 1,
    alignSelf: 'stretch',
    marginRight: 0,
    marginBottom: parseInt(spacing[6]),
    position: 'relative',
  },
  rightColumnDesktop: {
    width: 320,
    maxWidth: 320,
    flexShrink: 0,
    marginBottom: 0,
  },
  // Debug badge styles
  debugBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 8,
    marginBottom: parseInt(spacing[4]),
  },
  debugText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    color: '#92400e',
  },
  section: {
    marginBottom: parseInt(spacing[4]),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  card: {
    gap: parseInt(spacing[3]),
  },
  fieldCompact: {
    gap: parseInt(spacing[1]),
  },
  fieldHintCompact: {
    marginTop: parseInt(spacing[1]),
  },
  fieldLabel: {
    marginBottom: parseInt(spacing[2]),
  },
  input: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.sm),
    padding: parseInt(spacing[3]),
    fontSize: parseInt(typography.fontSize.body.size),
    color: colors.text.DEFAULT,
  },
  selectButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    color: '#9ca3af',
  },
  selectButtonIcon: {
    fontSize: 14,
    color: '#6b7280',
  },
  radioGroup: {
    gap: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  radioOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 16,
    color: '#111827',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
    marginTop: parseInt(spacing[2]),
  },
  actionButton: {
    marginBottom: parseInt(spacing[3]),
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  stateList: {
    maxHeight: 400,
  },
  stateOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stateOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  stateOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  lastSavedContainer: {
    marginTop: parseInt(spacing[2]),
    paddingTop: parseInt(spacing[2]),
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  sectionDescription: {
    marginBottom: parseInt(spacing[4]),
    fontSize: 14,
    lineHeight: 20,
  },
  paymentMethodRow: {
    marginBottom: parseInt(spacing[4]),
    paddingBottom: parseInt(spacing[4]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[2]),
  },
  paymentMethodLabel: {
    fontSize: 16,
  },
  warningText: {
    marginTop: parseInt(spacing[2]),
    fontSize: 13,
    color: colors.warning.DEFAULT,
  },
  paymentMethodsSummary: {
    marginTop: parseInt(spacing[3]),
    marginBottom: parseInt(spacing[4]),
  },
  paymentMethodSummaryRow: {
    paddingVertical: parseInt(spacing[2]),
  },
  paymentMethodSummaryText: {
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  noPaymentMethodsText: {
    marginTop: parseInt(spacing[2]),
    marginBottom: parseInt(spacing[4]),
    fontSize: 14,
    fontStyle: 'italic',
  },
  goToInvoiceSettingsButton: {
    marginTop: parseInt(spacing[2]),
  },
});
