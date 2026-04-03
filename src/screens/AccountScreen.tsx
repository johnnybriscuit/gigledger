import React, { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text as RNText,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Modal,
  Image,
  ActionSheetIOS,
} from 'react-native';
import { useTaxProfile } from '../hooks/useTaxProfile';
import { AccountSetupPrompts } from '../components/AccountSetupPrompts';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaxSettingsSection } from '../components/TaxSettingsSection';
import { AddressPlacesInput } from '../components/AddressPlacesInput';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { formatRelativeTime } from '../lib/profile';
import { colors } from '../styles/theme';
import { usePaymentMethodDetails } from '../hooks/usePaymentMethodDetails';
import { getStateName } from '../tax/engine';
import { resolvePlaceDetails } from '../lib/placeDetails';

const ALL_PAYMENT_METHODS: { key: string; label: string }[] = [
  { key: 'venmo', label: 'Venmo' },
  { key: 'zelle', label: 'Zelle' },
  { key: 'cashapp', label: 'Cash App' },
  { key: 'paypal', label: 'PayPal' },
];



interface AccountScreenProps {
  onNavigateToBusinessStructures?: () => void;
  onNavigateToInvoices?: () => void;
}

export function AccountScreen({ onNavigateToBusinessStructures, onNavigateToInvoices }: AccountScreenProps = {}) {
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingTaxSettings, setIsEditingTaxSettings] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<any>(null);

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

  useEffect(() => {
    const url = (profile as any)?.avatar_url;
    if (url) setAvatarUri(url);
  }, [profile]);

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

  // Get tax profile to check if user needs to set up state
  const { data: taxProfile } = useTaxProfile();
  const needsTaxSetup = !!(taxProfile && !taxProfile.state);
  
  // Track if setup prompts have been dismissed
  const [setupPromptsDismissed, setSetupPromptsDismissed] = useState(false);
  
  useEffect(() => {
    // Check if prompts were previously dismissed in this session
    if (Platform.OS === 'web') {
      const dismissed = sessionStorage.getItem('account_setup_prompts_dismissed');
      if (dismissed === 'true') {
        setSetupPromptsDismissed(true);
      }
    }
  }, []);

  // Clear dismissal flag when user completes the required actions
  useEffect(() => {
    if (Platform.OS === 'web' && !needsTaxSetup && profile?.home_address_full) {
      sessionStorage.removeItem('account_setup_prompts_dismissed');
    }
  }, [needsTaxSetup, profile?.home_address_full]);
  
  const handlePromptsComplete = () => {
    setSetupPromptsDismissed(true);
    if (Platform.OS === 'web') {
      sessionStorage.setItem('account_setup_prompts_dismissed', 'true');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    setAvatarUploading(true);
    const optimisticUri = URL.createObjectURL(file);
    setAvatarUri(optimisticUri);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl } as any).eq('id', user.id);
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setAvatarUri(publicUrl);
    } catch (err: any) {
      setAvatarUri((profile as any)?.avatar_url || null);
      Alert.alert('Error', err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    setAvatarUri(null);
    setPhotoSheetVisible(false);
    await supabase.from('profiles').update({ avatar_url: null } as any).eq('id', user.id);
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  };

  const handleNativeImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (!user?.id) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = asset.mimeType || `image/${ext}`;
    const path = `${user.id}/avatar.${ext}`;

    setAvatarUploading(true);
    setAvatarUri(uri); // optimistic
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: mimeType });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl } as any).eq('id', user.id);
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setAvatarUri(publicUrl);
    } catch (err: any) {
      setAvatarUri((profile as any)?.avatar_url || null);
      Alert.alert('Upload failed', err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePickFromLibrary = async () => {
    setPhotoSheetVisible(false);
    if (Platform.OS === 'web') {
      setTimeout(() => fileInputRef.current?.click(), 100);
    } else {
      await new Promise(resolve => setTimeout(resolve, 400));
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      await handleNativeImageResult(result);
    }
  };

  const handleTakePhoto = async () => {
    setPhotoSheetVisible(false);
    if (Platform.OS === 'web') {
      setTimeout(() => fileInputRef.current?.click(), 100);
    } else {
      await new Promise(resolve => setTimeout(resolve, 400));
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access in Settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      await handleNativeImageResult(result);
    }
  };


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
        const { trackLogout } = await import('../lib/analytics');
        const { track } = await import('../lib/tracking');
        trackLogout();
        track('logout');
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
              const { trackLogout } = await import('../lib/analytics');
              const { track } = await import('../lib/tracking');
              trackLogout();
              track('logout');
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


  // Derive initials
  const initials = (() => {
    const name = profile?.full_name || user?.email || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  const filingStatusLabel = (() => {
    const map: Record<string, string> = {
      single: 'Single', married_joint: 'Married Filing Jointly',
      married_separate: 'Married Filing Separately', head: 'Head of Household',
    };
    return map[taxProfile?.filingStatus || ''] || taxProfile?.filingStatus || '—';
  })();

  const businessStructureLabel = (() => {
    const map: Record<string, string> = {
      individual: 'Individual / Sole Proprietor', llc_single_member: 'LLC (Single Member)',
      llc_scorp: 'LLC (S-Corp Election)', llc_multi_member: 'LLC (Multi-Member)',
    };
    return map[profile?.business_structure || ''] || '—';
  })();

  const stateLabel = taxProfile?.state ? (getStateName(taxProfile.state as any) || taxProfile.state) : '—';
  const deductionLabel = taxProfile?.deductionMethod === 'itemized' ? 'Itemized' : 'Standard';

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  return (
    <>
      {Platform.OS === 'web' && !setupPromptsDismissed && (
        <AccountSetupPrompts needsTaxSetup={needsTaxSetup} needsHomeAddress={!profile?.home_address_full} onComplete={handlePromptsComplete} />
      )}
      {Platform.OS === 'web' && (
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' } as any}
          onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
      )}

      {/* Photo Picker Sheet — Android only Modal (iOS uses ActionSheetIOS natively) */}
      {photoSheetVisible && Platform.OS === 'android' && (
        <Modal visible={photoSheetVisible} transparent animationType="slide" onRequestClose={() => setPhotoSheetVisible(false)}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setPhotoSheetVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <RNText style={styles.sheetTitle}>Profile Photo</RNText>
              <TouchableOpacity style={styles.sheetOption} onPress={handlePickFromLibrary}>
                <View style={styles.sheetOptionIcon}><RNText style={styles.sheetOptionEmoji}>🖼️</RNText></View>
                <RNText style={styles.sheetOptionLabel}>Choose from Library</RNText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetOption} onPress={handleTakePhoto}>
                <View style={styles.sheetOptionIcon}><RNText style={styles.sheetOptionEmoji}>📷</RNText></View>
                <RNText style={styles.sheetOptionLabel}>Take Photo</RNText>
              </TouchableOpacity>
              {avatarUri ? (
                <TouchableOpacity style={[styles.sheetOption, styles.sheetOptionRemove]} onPress={handleRemoveAvatar}>
                  <View style={[styles.sheetOptionIcon, styles.sheetOptionIconRemove]}><RNText style={styles.sheetOptionEmoji}>🗑️</RNText></View>
                  <RNText style={[styles.sheetOptionLabel, styles.sheetOptionLabelRemove]}>Remove Photo</RNText>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setPhotoSheetVisible(false)}>
                <RNText style={styles.sheetCancelText}>Cancel</RNText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Tax Settings Edit Modal */}
      {isEditingTaxSettings && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIsEditingTaxSettings(false)}>
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContent}>
              <TaxSettingsSection isEditing={true} onEditChange={(v) => { if (!v) setIsEditingTaxSettings(false); }}
                hideEditButton={false} onNavigateToBusinessStructures={onNavigateToBusinessStructures} />
            </View>
          </View>
        </Modal>
      )}

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIsEditingProfile(false)}>
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContent}>
              <ScrollView>
                <RNText style={styles.editModalTitle}>Edit Profile</RNText>
                <RNText style={styles.editFieldLabel}>Full Name</RNText>
                <TextInput style={styles.editInput} value={fullName} onChangeText={setFullName} placeholder="Enter your name" />
                <RNText style={styles.editFieldLabel}>Home Address</RNText>
                <AddressPlacesInput label="" placeholder="123 Main St, City, State ZIP" value={homeAddressFull} onChange={setHomeAddressFull}
                  onSelect={async (item: { description: string; place_id: string; lat?: number; lng?: number }) => {
                    setHomeAddressFull(item.description);
                    setHomeAddressPlaceId(item.place_id);

                    if (typeof item.lat === 'number' && typeof item.lng === 'number') {
                      setHomeAddressLat(item.lat);
                      setHomeAddressLng(item.lng);
                      return;
                    }

                    try {
                      const details = await resolvePlaceDetails(item.place_id);
                      if (details?.location) {
                        setHomeAddressLat(details.location.lat);
                        setHomeAddressLng(details.location.lng);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }} />
                <View style={styles.editButtonRow}>
                  <TouchableOpacity style={styles.editCancelBtn} onPress={() => { setIsEditingProfile(false); setFullName(profile?.full_name || ''); }}>
                    <RNText style={styles.editCancelBtnText}>Cancel</RNText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <RNText style={styles.editSaveBtnText}>Save</RNText>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Change Password Modal */}
      {isChangingPassword && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIsChangingPassword(false)}>
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContent}>
              <RNText style={styles.editModalTitle}>Change Password</RNText>
              <RNText style={styles.editFieldLabel}>New Password</RNText>
              <TextInput style={styles.editInput} value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password" secureTextEntry autoCapitalize="none" />
              <RNText style={styles.editFieldLabel}>Confirm Password</RNText>
              <TextInput style={styles.editInput} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" secureTextEntry autoCapitalize="none" />
              <View style={styles.editButtonRow}>
                <TouchableOpacity style={styles.editCancelBtn} onPress={() => { setIsChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}>
                  <RNText style={styles.editCancelBtnText}>Cancel</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveBtn} onPress={handleChangePassword} disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <RNText style={styles.editSaveBtnText}>Update</RNText>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

        {/* ── User Hero Card ── */}
        <View style={styles.heroCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => {
            if (Platform.OS === 'ios') {
              const options = avatarUri
                ? ['Choose from Library', 'Take Photo', 'Remove Photo', 'Cancel']
                : ['Choose from Library', 'Take Photo', 'Cancel'];
              const destructiveIndex = avatarUri ? 2 : -1;
              const cancelIndex = avatarUri ? 3 : 2;
              ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex, title: 'Profile Photo' },
                (index) => {
                  if (index === 0) handlePickFromLibrary();
                  else if (index === 1) handleTakePhoto();
                  else if (avatarUri && index === 2) handleRemoveAvatar();
                }
              );
            } else {
              setPhotoSheetVisible(true);
            }
          }} activeOpacity={0.85}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              : <View style={styles.avatarPlaceholder}><RNText style={styles.avatarInitials}>{initials}</RNText></View>}
            {avatarUploading && <View style={styles.avatarLoadingOverlay}><ActivityIndicator color="#fff" size="small" /></View>}
            <View style={styles.avatarBadge}><RNText style={styles.avatarBadgeIcon}>✎</RNText></View>
          </TouchableOpacity>
          <View style={styles.heroInfo}>
            <RNText style={styles.heroName}>{profile?.full_name || 'Your Name'}</RNText>
            <RNText style={styles.heroEmail} numberOfLines={1}>{user?.email || ''}</RNText>
          </View>
          <TouchableOpacity style={styles.heroEditBtn} onPress={() => setIsEditingProfile(true)}>
            <RNText style={styles.heroEditBtnText}>Edit ›</RNText>
          </TouchableOpacity>
        </View>

        {/* ── Profile Section ── */}
        <RNText style={styles.sectionLabel}>Profile</RNText>
        <View style={styles.settingsCard}>
          {/* Email row */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <RNText style={styles.fieldLabel}>EMAIL</RNText>
              <RNText style={styles.fieldValue}>{user?.email || '—'}</RNText>
            </View>
            <View style={styles.lockedChip}><RNText style={styles.lockedChipText}>Locked</RNText></View>
          </View>
          {/* Home Address row */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <RNText style={styles.fieldLabel}>HOME ADDRESS</RNText>
              <RNText style={styles.fieldValue}>{profile?.home_address_full || 'Not set'}</RNText>
            </View>
            <TouchableOpacity onPress={() => setIsEditingProfile(true)}>
              <RNText style={styles.fieldAction}>Edit</RNText>
            </TouchableOpacity>
          </View>
          {/* Password row */}
          <View style={[styles.fieldRow, styles.fieldRowLast]}>
            <View style={styles.fieldLeft}>
              <RNText style={styles.fieldLabel}>PASSWORD</RNText>
              <RNText style={styles.fieldValue}>••••••••</RNText>
            </View>
            <TouchableOpacity onPress={() => setIsChangingPassword(true)}>
              <RNText style={styles.fieldAction}>Change</RNText>
            </TouchableOpacity>
          </View>
        </View>
        {profile?.updated_at && (
          <RNText style={styles.lastSaved}>Last saved {formatRelativeTime(profile.updated_at)}</RNText>
        )}

        {/* ── Tax Settings Section ── */}
        <RNText style={styles.sectionLabel}>Tax Settings</RNText>
        <View style={styles.settingsCard}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <RNText style={styles.fieldLabel}>BUSINESS STRUCTURE</RNText>
              <RNText style={styles.fieldValue}>{businessStructureLabel}</RNText>
            </View>
            <TouchableOpacity onPress={() => setIsEditingTaxSettings(true)}>
              <RNText style={styles.fieldAction}>Edit</RNText>
            </TouchableOpacity>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <RNText style={styles.fieldLabel}>FILING STATUS</RNText>
              <RNText style={styles.fieldValue}>{filingStatusLabel}</RNText>
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <RNText style={styles.fieldLabel}>STATE OF RESIDENCE</RNText>
              <RNText style={styles.fieldValue}>{stateLabel}</RNText>
            </View>
          </View>
          <View style={[styles.fieldRow, styles.fieldRowLast]}>
            <View style={styles.fieldLeft}>
              <RNText style={styles.fieldLabel}>DEDUCTION METHOD</RNText>
              <RNText style={styles.fieldValue}>{deductionLabel}</RNText>
            </View>
          </View>
        </View>

        {/* ── Invoice Payment Methods ── */}
        <RNText style={styles.sectionLabel}>Invoice Payment Methods</RNText>
        <View style={styles.settingsCard}>
          {ALL_PAYMENT_METHODS.map((method, idx) => {
            const pm = paymentMethods.find(p => p.method === method.key);
            const enabled = pm?.enabled && pm?.details;
            const isLast = idx === ALL_PAYMENT_METHODS.length - 1;
            return (
              <View key={method.key} style={[styles.paymentRow, isLast && styles.paymentRowLast]}>
                <View style={[styles.paymentStatus, enabled ? styles.paymentStatusEnabled : styles.paymentStatusDisabled]}>
                  <RNText style={[styles.paymentStatusIcon, enabled ? styles.paymentStatusIconEnabled : styles.paymentStatusIconDisabled]}>
                    {enabled ? '✓' : '—'}
                  </RNText>
                </View>
                <RNText style={[styles.paymentName, !enabled && styles.paymentNameDisabled]}>{method.label}</RNText>
                <RNText style={styles.paymentHandle}>{enabled ? pm!.details : 'Not set up'}</RNText>
              </View>
            );
          })}
          <TouchableOpacity
            style={styles.navActionRow}
            onPress={() => onNavigateToInvoices ? onNavigateToInvoices() : Alert.alert('Navigation', 'Go to Invoices → Settings.')}
          >
            <View style={styles.navActionIcon}><RNText style={{ fontSize: 18 }}>🧾</RNText></View>
            <RNText style={styles.navActionLabel}>Go to Invoice Settings</RNText>
            <RNText style={styles.navActionArrow}>›</RNText>
          </TouchableOpacity>
        </View>

        {/* ── Sign Out — Danger Zone ── */}
        <RNText style={styles.sectionLabel}>Account</RNText>
        <View style={styles.dangerCard}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleSignOut}>
            <View style={styles.dangerIcon}><RNText style={{ fontSize: 18 }}>🚪</RNText></View>
            <RNText style={styles.dangerLabel}>Sign Out</RNText>
            <RNText style={styles.dangerArrow}>›</RNText>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4F0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F4F0' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },
  heroCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3A3A3C', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  avatarLoadingOverlay: { position: 'absolute', top: 0, left: 0, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1C1C1E' },
  avatarBadgeIcon: { fontSize: 11, color: '#fff', lineHeight: 14 },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  heroEmail: { fontSize: 13, color: '#8E8E93' },
  heroEditBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  heroEditBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginTop: 4, paddingHorizontal: 4 },
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 20, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldLeft: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93', letterSpacing: 0.4, marginBottom: 3 },
  fieldValue: { fontSize: 15, color: '#1C1C1E' },
  fieldAction: { fontSize: 15, color: '#3B82F6', fontWeight: '500' },
  lockedChip: { backgroundColor: '#F2F2F7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  lockedChipText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  lastSaved: { fontSize: 12, color: '#8E8E93', fontStyle: 'italic', marginTop: -14, marginBottom: 20, paddingHorizontal: 4 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  paymentRowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  paymentStatus: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  paymentStatusEnabled: { backgroundColor: '#D1FAE5' },
  paymentStatusDisabled: { backgroundColor: '#F2F2F7' },
  paymentStatusIcon: { fontSize: 14, fontWeight: '700' },
  paymentStatusIconEnabled: { color: '#059669' },
  paymentStatusIconDisabled: { color: '#C7C7CC' },
  paymentName: { flex: 1, fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  paymentNameDisabled: { color: '#8E8E93' },
  paymentHandle: { fontSize: 13, color: '#8E8E93' },
  navActionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA' },
  navActionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  navActionLabel: { flex: 1, fontSize: 15, color: '#3B82F6', fontWeight: '500' },
  navActionArrow: { fontSize: 20, color: '#C7C7CC' },
  dangerCard: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#FEE2E2' },
  dangerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  dangerIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dangerLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#DC2626' },
  dangerArrow: { fontSize: 20, color: '#FCA5A5' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 999 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', textAlign: 'center', marginBottom: 8 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA' },
  sheetOptionRemove: {},
  sheetOptionIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  sheetOptionIconRemove: { backgroundColor: '#FEE2E2' },
  sheetOptionEmoji: { fontSize: 20 },
  sheetOptionLabel: { fontSize: 16, color: '#1C1C1E', fontWeight: '500' },
  sheetOptionLabelRemove: { color: '#DC2626' },
  sheetCancel: { marginHorizontal: 10, marginTop: 12, backgroundColor: '#F2F2F7', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sheetCancelText: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  editModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  editModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '85%' as any },
  editModalTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 20 },
  editFieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 14 },
  editInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1C1E' },
  editButtonRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  editCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F2F2F7', alignItems: 'center' },
  editCancelBtnText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  editSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center' },
  editSaveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

