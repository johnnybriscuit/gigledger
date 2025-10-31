import React, { useState } from 'react';
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
import { updateUserTaxProfile } from '../services/taxService';

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

const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married Filing Jointly' },
  { value: 'hoh', label: 'Head of Household' },
];

export function AccountScreen() {
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedFilingStatus, setSelectedFilingStatus] = useState<'single' | 'married' | 'hoh'>('single');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery<{
    id: string;
    email: string;
    full_name: string;
    home_address: string | null;
    state_code: string | null;
    filing_status: 'single' | 'married' | 'hoh';
  } | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      const profile = data as any;
      
      // Set initial form values
      setFullName(profile.full_name || '');
      setHomeAddress(profile.home_address || '');
      setSelectedState(profile.state_code || null);
      setSelectedFilingStatus(profile.filing_status || 'single');
      
      return profile;
    },
  });

  // Fetch user email
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase
        .from('profiles')
        .update(updates) as any)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  // Update tax settings mutation
  const updateTaxMutation = useMutation({
    mutationFn: async () => {
      if (!selectedState) throw new Error('State is required');
      await updateUserTaxProfile(selectedState, selectedFilingStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditingTax(false);
      Alert.alert('Success', 'Tax settings updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update tax settings');
    },
  });

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

  const handleSaveProfile = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    updateProfileMutation.mutate({ 
      full_name: fullName,
      home_address: homeAddress || null,
    });
  };

  const handleSaveTax = () => {
    if (!selectedState) {
      Alert.alert('Error', 'State is required');
      return;
    }
    updateTaxMutation.mutate();
  };

  const handleChangePassword = () => {
    changePasswordMutation.mutate();
  };

  const selectedStateName = US_STATES.find((s) => s.code === selectedState)?.name;
  const selectedFilingStatusLabel = FILING_STATUSES.find((s) => s.value === selectedFilingStatus)?.label;

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

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile</Text>
            {!isEditingProfile && (
              <TouchableOpacity onPress={() => setIsEditingProfile(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{user?.email}</Text>
              <Text style={styles.fieldHint}>Email cannot be changed</Text>
            </View>

            <View style={styles.field}>
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

            <View style={styles.field}>
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
              <Text style={styles.fieldHint}>Used for automatic mileage calculation</Text>
            </View>

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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tax Settings</Text>
            {!isEditingTax && (
              <TouchableOpacity onPress={() => setIsEditingTax(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>State of Residence</Text>
              {isEditingTax ? (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowStatePicker(true)}
                >
                  <Text style={[styles.selectButtonText, !selectedState && styles.placeholder]}>
                    {selectedStateName || 'Select your state'}
                  </Text>
                  <Text style={styles.selectButtonIcon}>▼</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.fieldValue}>{selectedStateName || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Filing Status</Text>
              {isEditingTax ? (
                <View style={styles.radioGroup}>
                  {FILING_STATUSES.map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.radioOption,
                        selectedFilingStatus === status.value && styles.radioOptionSelected,
                      ]}
                      onPress={() => setSelectedFilingStatus(status.value as 'single' | 'married' | 'hoh')}
                    >
                      <View style={styles.radioCircle}>
                        {selectedFilingStatus === status.value && <View style={styles.radioCircleInner} />}
                      </View>
                      <Text style={styles.radioLabel}>{status.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.fieldValue}>{selectedFilingStatusLabel || 'Not set'}</Text>
              )}
            </View>

            {isEditingTax && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setIsEditingTax(false);
                    setSelectedState(profile?.state_code || null);
                    setSelectedFilingStatus(profile?.filing_status || 'single');
                  }}
                >
                  <Text style={styles.buttonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleSaveTax}
                  disabled={updateTaxMutation.isPending}
                >
                  {updateTaxMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Security</Text>
          </View>

          <View style={styles.card}>
            {!isChangingPassword ? (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setIsChangingPassword(true)}
              >
                <Text style={styles.linkButtonText}>Change Password</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.field}>
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

                <View style={styles.field}>
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
                      <Text style={styles.buttonPrimaryText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* State Picker Modal */}
      {showStatePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.stateList}>
              {US_STATES.map((state) => (
                <TouchableOpacity
                  key={state.code}
                  style={styles.stateOption}
                  onPress={() => {
                    setSelectedState(state.code);
                    setShowStatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.stateOptionText,
                      selectedState === state.code && styles.stateOptionTextSelected,
                    ]}
                  >
                    {state.name} ({state.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  signOutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
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
});
