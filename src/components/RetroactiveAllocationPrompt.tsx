import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemePalette } from '../styles/theme';
import { useGigs } from '../hooks/useGigs';
import { useAllocationTransactions } from '../hooks/useAllocationTransactions';

interface RetroactiveAllocationPromptProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function RetroactiveAllocationPrompt({
  onComplete,
  onSkip,
}: RetroactiveAllocationPromptProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { data: gigs } = useGigs();
  const { transactions, createAllocationForGig } = useAllocationTransactions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const paidGigsWithoutAllocations = (gigs || []).filter(gig => {
    if (!gig.paid || gig.net_amount <= 0) return false;
    const hasAllocation = transactions.some(t => t.gig_id === gig.id);
    return !hasAllocation;
  });

  const totalAmount = paidGigsWithoutAllocations.reduce(
    (sum, gig) => sum + gig.net_amount,
    0
  );

  const handleCalculateHistory = async () => {
    setIsProcessing(true);
    setTotal(paidGigsWithoutAllocations.length);
    setProgress(0);

    try {
      for (let i = 0; i < paidGigsWithoutAllocations.length; i++) {
        const gig = paidGigsWithoutAllocations[i];
        await createAllocationForGig({
          gigId: gig.id,
          grossAmount: gig.net_amount,
        });
        setProgress(i + 1);
      }

      if (Platform.OS === 'web') {
        localStorage.setItem('bozzy_retroactive_allocation_completed', 'true');
      }

      onComplete();
    } catch (error) {
      console.error('Failed to create retroactive allocations:', error);
      alert('Something went wrong. Please try again or skip this step.');
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('bozzy_retroactive_allocation_completed', 'true');
    }
    onSkip();
  };

  if (paidGigsWithoutAllocations.length === 0) {
    handleSkip();
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.canvas }]}>
      <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
        <Text style={styles.emoji}>📊</Text>
        
        <Text style={[styles.headline, { color: colors.text.DEFAULT }]}>
          You have {paidGigsWithoutAllocations.length} paid gig
          {paidGigsWithoutAllocations.length === 1 ? '' : 's'} totaling $
          {totalAmount.toFixed(2)} that {paidGigsWithoutAllocations.length === 1 ? 'was' : 'were'} logged
          before your money plan was set up.
        </Text>

        <Text style={[styles.body, { color: colors.text.muted }]}>
          Want Bozzy to calculate what your allocations would have been?
        </Text>

        <Text style={[styles.disclaimer, { color: colors.text.subtle }]}>
          This won't move any money — it just shows you what your buckets would look like if
          the plan had been in place all along.
        </Text>

        {isProcessing ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
            <Text style={[styles.progressText, { color: colors.text.muted }]}>
              Processing {progress} of {total} gigs...
            </Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.brand.DEFAULT }]}
              onPress={handleCalculateHistory}
            >
              <Text style={styles.primaryButtonText}>Yes, calculate my history</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border.DEFAULT }]}
              onPress={handleSkip}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text.muted }]}>
                Start fresh from today
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    maxWidth: 500,
    width: '100%',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  disclaimer: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 16,
  },
  progressText: {
    fontSize: 16,
  },
});
