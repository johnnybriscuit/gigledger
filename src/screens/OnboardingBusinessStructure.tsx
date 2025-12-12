import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useProfile, useUpdateProfile, type BusinessStructure } from '../hooks/useProfile';
import { useSubscription } from '../hooks/useSubscription';
import { getResolvedPlan } from '../lib/businessStructure';
import { useQuery } from '@tanstack/react-query';

interface OnboardingBusinessStructureProps {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const BUSINESS_STRUCTURES = [
  {
    value: 'individual' as BusinessStructure,
    label: 'Individual / Sole Proprietor',
    badge: 'Recommended for most musicians',
    badgeColor: '#10B981',
    description: 'You get paid personally under your own name. No LLC or separate business required. Self-employment tax applies.',
  },
  {
    value: 'llc_single_member' as BusinessStructure,
    label: 'Single-Member LLC',
    badge: 'Liability protection, same taxes',
    badgeColor: '#6B7280',
    description: 'A legal LLC with one owner. Adds liability protection, but taxes work the same as Individual. SE tax still applies.',
  },
  {
    value: 'llc_scorp' as BusinessStructure,
    label: 'LLC taxed as S-Corp',
    badge: 'Pro feature',
    badgeColor: '#007AFF',
    description: 'Advanced tax strategy. Often used when profit is high and you run payroll. Requires GigLedger Pro. SE tax doesn\'t apply the same way.',
    requiresPro: true,
  },
  {
    value: 'llc_multi_member' as BusinessStructure,
    label: 'Multi-Member LLC / Partnership',
    badge: 'Best for band LLCs',
    badgeColor: '#6B7280',
    description: 'Typically used for band LLCs or shared businesses. Taxes are handled at the entity level.',
  },
];

export function OnboardingBusinessStructure({ onNext, onSkip, onBack }: OnboardingBusinessStructureProps) {
  const [selectedStructure, setSelectedStructure] = useState<BusinessStructure>('individual');
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profile } = useProfile(user?.id);
  const { data: subscription } = useSubscription();
  const updateProfile = useUpdateProfile(user?.id || '');

  const plan = getResolvedPlan({
    subscriptionTier: subscription?.tier,
    subscriptionStatus: subscription?.status,
  });

  const isProPlan = plan === 'pro';

  const handleContinue = async () => {
    // Block S-Corp for free users
    if (selectedStructure === 'llc_scorp' && !isProPlan) {
      Alert.alert(
        'Upgrade Required',
        'S-Corp mode is available on GigLedger Pro. Please choose a different structure or upgrade to Pro.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Save business structure to profile
      await updateProfile.mutateAsync({
        business_structure: selectedStructure,
      });

      console.log('[OnboardingBusinessStructure] Saved business structure:', selectedStructure);
      onNext();
    } catch (error: any) {
      console.error('[OnboardingBusinessStructure] Error saving business structure:', error);
      
      // Handle S-Corp Pro enforcement error from DB trigger
      if (error.message?.includes('SCORP_REQUIRES_PRO')) {
        Alert.alert(
          'Upgrade Required',
          'S-Corp mode requires GigLedger Pro. Please choose a different structure or upgrade to Pro.',
          [{ text: 'OK' }]
        );
      } else {
        // Fallback to individual on any error
        console.warn('[OnboardingBusinessStructure] Falling back to individual structure');
        try {
          await updateProfile.mutateAsync({
            business_structure: 'individual',
          });
          Alert.alert(
            'Notice',
            'We set your business structure to Individual / Sole Proprietor. You can change this later in Account settings.',
            [{ text: 'OK', onPress: onNext }]
          );
        } catch (fallbackError) {
          console.error('[OnboardingBusinessStructure] Fallback also failed:', fallbackError);
          Alert.alert('Error', 'Failed to save business structure. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip does NOT mark onboarding complete
    // Just advance to next step with default structure
    console.log('[OnboardingBusinessStructure] Skipped - keeping default structure');
    onSkip();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 2 of 4</Text>
          <Text style={styles.title}>Choose Your Business Structure 🏢</Text>
          <Text style={styles.subtitle}>
            This helps us calculate your taxes correctly. If you're not sure, choose Individual—you can always change it later.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Structure Options */}
          {BUSINESS_STRUCTURES.map((structure) => {
            const isSelected = selectedStructure === structure.value;
            const isDisabled = structure.requiresPro && !isProPlan;

            return (
              <TouchableOpacity
                key={structure.value}
                style={[
                  styles.structureCard,
                  isSelected && styles.structureCardSelected,
                  isDisabled && styles.structureCardDisabled,
                ]}
                onPress={() => !isDisabled && setSelectedStructure(structure.value)}
                disabled={loading}
              >
                <View style={styles.structureHeader}>
                  <View style={styles.radioContainer}>
                    <View style={[styles.radio, isSelected && styles.radioChecked]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.structureLabel, isDisabled && styles.textDisabled]}>
                      {structure.label}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: structure.badgeColor }]}>
                    <Text style={styles.badgeText}>{structure.badge}</Text>
                  </View>
                </View>
                <Text style={[styles.structureDescription, isDisabled && styles.textDisabled]}>
                  {structure.description}
                </Text>
                {isDisabled && (
                  <View style={styles.upgradeNote}>
                    <Text style={styles.upgradeNoteText}>
                      🔓 Upgrade to GigLedger Pro to use S-Corp mode
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* What's This? Accordion */}
          <TouchableOpacity
            style={styles.infoToggle}
            onPress={() => setShowInfo(!showInfo)}
          >
            <Text style={styles.infoToggleText}>
              {showInfo ? '▼' : '▶'} What's this? Learn more about business structures
            </Text>
          </TouchableOpacity>

          {showInfo && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Quick Guide:</Text>
              
              <Text style={styles.infoSection}>
                <Text style={styles.infoBold}>Individual / Sole Proprietor:</Text> Most freelance musicians start here. Simple setup, no LLC needed. Self-employment tax applies.
              </Text>

              <Text style={styles.infoSection}>
                <Text style={styles.infoBold}>Single-Member LLC:</Text> Adds legal protection but taxes work the same as Individual. Good if you want a formal business structure.
              </Text>

              <Text style={styles.infoSection}>
                <Text style={styles.infoBold}>LLC taxed as S-Corp:</Text> Advanced strategy for high earners (typically $60k+ profit). Requires payroll and professional help. Pro feature only.
              </Text>

              <Text style={styles.infoSection}>
                <Text style={styles.infoBold}>Multi-Member LLC / Partnership:</Text> For bands or co-owned businesses with multiple owners.
              </Text>

              <Text style={styles.infoDisclaimer}>
                ⚠️ This is not tax advice. If unsure, choose Individual. You can change this later in Account settings or consult a tax professional.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 32,
  },
  step: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  form: {
    gap: 16,
    paddingBottom: 24,
  },
  structureCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  structureCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  structureCardDisabled: {
    opacity: 0.6,
  },
  structureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: {
    borderColor: '#3b82f6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  structureLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  structureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 4,
  },
  textDisabled: {
    color: '#9ca3af',
  },
  upgradeNote: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  upgradeNoteText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '500',
  },
  infoToggle: {
    paddingVertical: 12,
    marginTop: 8,
  },
  infoToggleText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  infoSection: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
    color: '#111827',
  },
  infoDisclaimer: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
