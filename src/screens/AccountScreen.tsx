import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaxSettingsSection } from '../components/TaxSettingsSection';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { formatRelativeTime } from '../lib/profile';

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


export function AccountScreen() {
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingTaxSettings, setIsEditingTaxSettings] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
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

  // Fetch user profile with new hook
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  // Update profile mutation with new hook
  const updateProfileMutation = useUpdateProfile(user?.id || '');

  // Initialize form values when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setHomeAddress(profile.home_address || '');
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
    
    try {
      await updateProfileMutation.mutateAsync({ 
        full_name: fullName,
        home_address: homeAddress || undefined,
      });
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = () => {
    changePasswordMutation.mutate();
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Account Settings</Text>

        {/* Two-column layout on desktop, stacked on mobile */}
        <View style={styles.gridContainer}>
          {/* Left Column: Profile + Tax Settings */}
          <View style={styles.leftColumn}>
            {/* Profile Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Profile</Text>
              </View>

          <View style={styles.card}>
            <View style={styles.fieldCompact}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{user?.email}</Text>
              <Text style={styles.fieldHintCompact}>Cannot be changed</Text>
            </View>

            <View style={styles.fieldCompact}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {isEditingProfile ? (
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your name"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.full_name || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldCompact}>
              <Text style={styles.fieldLabel}>Home Address</Text>
              {isEditingProfile ? (
                <TextInput
                  style={styles.input}
                  value={homeAddress}
                  onChangeText={setHomeAddress}
                  placeholder="123 Main St, City, State ZIP"
                  multiline
                />
              ) : (
                <Text style={styles.fieldValue}>{profile?.home_address || 'Not set'}</Text>
              )}
              <Text style={styles.fieldHintCompact}>For mileage tracking</Text>
            </View>

            {/* Last Saved Indicator */}
            {!isEditingProfile && profile?.updated_at && (
              <View style={styles.lastSavedContainer}>
                <Text style={styles.lastSavedText}>
                  Last saved {formatRelativeTime(profile.updated_at)}
                </Text>
              </View>
            )}

            {isEditingProfile && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setIsEditingProfile(false);
                    setFullName(profile?.full_name || '');
                  }}
                >
                  <Text style={styles.buttonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
            </View>

            {/* Tax Settings Section */}
            <TaxSettingsSection 
              isEditing={isEditingTaxSettings}
              onEditChange={setIsEditingTaxSettings}
              hideEditButton={true}
            />
          </View>

          {/* Right Column: Account Actions */}
          <View style={styles.rightColumn}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Account Actions</Text>
              </View>
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setIsEditingProfile(true)}
                >
                  <Text style={styles.actionButtonText}>✏️ Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setIsEditingTaxSettings(true)}
                >
                  <Text style={styles.actionButtonText}>📊 Edit Tax Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setIsChangingPassword(true)}
                >
                  <Text style={styles.actionButtonText}>🔒 Change Password</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButtonDestructive}
                  onPress={handleSignOut}
                >
                  <Text style={styles.actionButtonDestructiveText}>🚪 Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Change Password Modal (when active) */}
            {isChangingPassword && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Change Password</Text>
                </View>
                <View style={styles.card}>
                  <View style={styles.fieldCompact}>
                    <Text style={styles.fieldLabel}>New Password</Text>
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
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
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
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={() => {
                        setIsChangingPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      <Text style={styles.buttonSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonPrimary]}
                      onPress={handleChangePassword}
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.buttonPrimaryText}>Update</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
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
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  gridContainer: {
    ...Platform.select({
      web: {
        display: 'flex',
        flexDirection: 'row',
        gap: 24,
        '@media (max-width: 768px)': {
          flexDirection: 'column',
        },
      },
      default: {
        flexDirection: 'column',
      },
    }),
  },
  leftColumn: {
    ...Platform.select({
      web: {
        flex: 1,
        minWidth: 0,
      },
      default: {
        width: '100%',
      },
    }),
  },
  rightColumn: {
    ...Platform.select({
      web: {
        width: 320,
        flexShrink: 0,
      },
      default: {
        width: '100%',
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  field: {
    marginBottom: 16,
  },
  fieldCompact: {
    marginBottom: 12,
  },
  fieldHintCompact: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111827',
  },
  fieldHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
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
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  linkButton: {
    padding: 12,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  actionButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  actionButtonDestructive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 14,
    alignItems: 'flex-start',
  },
  actionButtonDestructiveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
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
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  lastSavedText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
