import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useProfile, useUpdateProfile, type BusinessStructure } from '../hooks/useProfile';
import { useSubscription } from '../hooks/useSubscription';
import { getResolvedPlan } from '../lib/businessStructure';
import { useUser } from '../contexts/UserContext';

type ProfitRange = 'low' | 'medium' | 'high';
type LiabilityPreference = 'yes' | 'no';
type SharedOwnership = 'yes' | 'no';
type RunsPayroll = 'yes' | 'no';

interface WizardState {
  step: number;
  profit?: ProfitRange;
  liability?: LiabilityPreference;
  shared?: SharedOwnership;
  payroll?: RunsPayroll;
}

interface Recommendation {
  structure: BusinessStructure;
  title: string;
  reasons: string[];
  note?: string;
}

export function BusinessStructureWizard() {
  const [state, setState] = useState<WizardState>({ step: 1 });
  const [showResult, setShowResult] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { userId, profile: userProfile } = useUser();
  const { data: profile } = useProfile(userId || undefined);
  const { data: subscription } = useSubscription();
  const updateProfile = useUpdateProfile(userId || '');

  const plan = getResolvedPlan({
    subscriptionTier: subscription?.tier,
    subscriptionStatus: subscription?.status,
  });

  const isProPlan = plan === 'pro';

  const getRecommendation = (): Recommendation => {
    // Q3: Shared ownership → Multi-Member LLC
    if (state.shared === 'yes') {
      return {
        structure: 'llc_multi_member',
        title: 'Multi-Member LLC / Partnership',
        reasons: [
          'You indicated this is a shared business with other owners',
          'Partnership structure allows you to formally split income and expenses',
          'Bozzy tracks total income and expenses; you and your accountant handle partner allocations',
        ],
      };
    }

    // Q4: Already runs payroll → S-Corp
    if (state.payroll === 'yes') {
      return {
        structure: 'llc_scorp',
        title: 'LLC taxed as S-Corp',
        reasons: [
          'You\'re already running payroll, which is required for S-Corp taxation',
          'S-Corp can reduce self-employment taxes on distributions beyond salary',
          'In Bozzy Pro, we track income and expenses but do not calculate self-employment tax',
        ],
        note: isProPlan ? undefined : '🔓 S-Corp mode requires Bozzy Pro. Upgrade to unlock this feature.',
      };
    }

    // Q1 > $60k AND Q2 Yes → Single-Member LLC with S-Corp note
    if (state.profit === 'high' && state.liability === 'yes') {
      return {
        structure: 'llc_single_member',
        title: 'Single-Member LLC',
        reasons: [
          'You want liability protection for your music business',
          'Your profit level suggests you may benefit from S-Corp taxation',
          'Start with Single-Member LLC and talk to a CPA about S-Corp election when your profit is consistently this high',
        ],
        note: 'Consider discussing S-Corp election with your tax professional given your profit level.',
      };
    }

    // Q2 Yes → Single-Member LLC
    if (state.liability === 'yes') {
      return {
        structure: 'llc_single_member',
        title: 'Single-Member LLC',
        reasons: [
          'Provides liability protection beyond your personal name',
          'Taxed the same as Individual/Sole Proprietor by default',
          'Bozzy calculates both income tax and self-employment tax estimates',
        ],
      };
    }

    // Default → Individual
    return {
      structure: 'individual',
      title: 'Individual / Sole Proprietor',
      reasons: [
        'Simplest setup for most freelance musicians',
        'No LLC or separate business required',
        'Bozzy calculates both income tax and self-employment tax estimates for you',
      ],
    };
  };

  const handleApplyStructure = async () => {
    if (!userId || !profile) {
      Alert.alert('Sign In Required', 'Please sign in to apply this business structure.');
      return;
    }

    const recommendation = getRecommendation();

    // Block S-Corp for free users
    if (recommendation.structure === 'llc_scorp' && !isProPlan) {
      Alert.alert(
        'Upgrade Required',
        'S-Corp mode is available on Bozzy Pro. You can still track your income as an Individual or Single-Member LLC. To turn off self-employment estimates, upgrade to Pro.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsApplying(true);
    try {
      await updateProfile.mutateAsync({
        business_structure: recommendation.structure,
      });
      Alert.alert(
        'Success',
        `Your business structure has been set to ${recommendation.title}.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error updating business structure:', error);
      if (error.message?.includes('SCORP_REQUIRES_PRO')) {
        Alert.alert(
          'Upgrade Required',
          'S-Corp mode requires Bozzy Pro. Please upgrade to use this feature.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to update business structure');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const resetWizard = () => {
    setState({ step: 1 });
    setShowResult(false);
  };

  const renderStep = () => {
    if (showResult) {
      const recommendation = getRecommendation();
      return (
        <View>
          <Text style={styles.resultTitle}>Most likely fit: {recommendation.title}</Text>
          <View style={styles.reasonsContainer}>
            {recommendation.reasons.map((reason, index) => (
              <Text key={index} style={styles.reasonText}>• {reason}</Text>
            ))}
          </View>
          {recommendation.note && (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{recommendation.note}</Text>
            </View>
          )}
          <Text style={styles.disclaimer}>
            This is a general suggestion only. Please confirm with a tax professional.
          </Text>
          
          {userId && profile && (
            <TouchableOpacity
              style={[styles.applyButton, isApplying && styles.applyButtonDisabled]}
              onPress={handleApplyStructure}
              disabled={isApplying}
            >
              {isApplying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.applyButtonText}>Apply This Structure</Text>
              )}
            </TouchableOpacity>
          )}
          
          {(!userId || !profile) && (
            <Text style={styles.signInPrompt}>Sign in to apply this structure to your profile</Text>
          )}

          <TouchableOpacity style={styles.restartButton} onPress={resetWizard}>
            <Text style={styles.restartButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (state.step) {
      case 1:
        return (
          <View>
            <View style={styles.progressBar}>
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={styles.progressSegment} />
              <View style={styles.progressSegment} />
              <View style={styles.progressSegment} />
            </View>
            <Text style={styles.questionTitle}>Step 1 of 4</Text>
            <Text style={styles.questionText}>
              Estimated annual music profit (net) for this year?
            </Text>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setState({ ...state, step: 2, profit: 'low' })}
            >
              <Text style={styles.optionText}>Less than $30,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setState({ ...state, step: 2, profit: 'medium' })}
            >
              <Text style={styles.optionText}>$30,000 – $60,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setState({ ...state, step: 2, profit: 'high' })}
            >
              <Text style={styles.optionText}>More than $60,000</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View>
            <View style={styles.progressBar}>
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={styles.progressSegment} />
              <View style={styles.progressSegment} />
            </View>
            <Text style={styles.questionTitle}>Step 2 of 4</Text>
            <Text style={styles.questionText}>
              Do you want legal/liability protection beyond your personal name?
            </Text>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setState({ ...state, step: 3, liability: 'yes' })}
            >
              <Text style={styles.optionText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setState({ ...state, step: 3, liability: 'no' })}
            >
              <Text style={styles.optionText}>No / Not sure</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => setState({ ...state, step: 1 })}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View>
            <View style={styles.progressBar}>
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={styles.progressSegment} />
            </View>
            <Text style={styles.questionTitle}>Step 3 of 4</Text>
            <Text style={styles.questionText}>
              Is your band or project run as a shared business with other owners (e.g., band LLC or partnership)?
            </Text>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setState({ ...state, step: 4, shared: 'yes' })}
            >
              <Text style={styles.optionText}>Yes, we share ownership</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setState({ ...state, step: 4, shared: 'no' })}
            >
              <Text style={styles.optionText}>No, it's just me</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => setState({ ...state, step: 2 })}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 4:
        return (
          <View>
            <View style={styles.progressBar}>
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={[styles.progressSegment, styles.progressActive]} />
              <View style={[styles.progressSegment, styles.progressActive]} />
            </View>
            <Text style={styles.questionTitle}>Step 4 of 4</Text>
            <Text style={styles.questionText}>
              Are you already running payroll (W-2 salary) for yourself through an accountant or payroll service?
            </Text>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setState({ ...state, payroll: 'yes' });
                setShowResult(true);
              }}
            >
              <Text style={styles.optionText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setState({ ...state, payroll: 'no' });
                setShowResult(true);
              }}
            >
              <Text style={styles.optionText}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => setState({ ...state, step: 3 })}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#007AFF',
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24,
    lineHeight: 28,
  },
  optionButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  reasonsContainer: {
    marginBottom: 16,
  },
  reasonText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  noteBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E65100',
  },
  disclaimer: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 24,
  },
  applyButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  signInPrompt: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  restartButton: {
    padding: 12,
    alignItems: 'center',
  },
  restartButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
