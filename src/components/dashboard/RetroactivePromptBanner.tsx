import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';
import { useGigs } from '../../hooks/useGigs';

export function RetroactivePromptBanner() {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();
  const { transactions, createAllocationForGig } = useAllocationTransactions();
  const { data: gigs } = useGigs();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Check if banner should be shown
  const isDismissed = Platform.OS === 'web' 
    ? localStorage.getItem('bozzy_retroactive_prompt_dismissed') === 'true'
    : false;

  const paidGigs = (gigs || []).filter(g => g.paid && g.net_amount > 0);
  const gigsWithoutAllocations = paidGigs.filter(gig => {
    return !transactions.some(t => t.gig_id === gig.id);
  });

  const shouldShow = 
    buckets.length > 0 &&
    transactions.length === 0 &&
    gigsWithoutAllocations.length > 0 &&
    !isDismissed;

  if (!shouldShow) {
    return null;
  }

  const totalAmount = gigsWithoutAllocations.reduce((sum, g) => sum + g.net_amount, 0);

  const handleCalculateHistory = async () => {
    setIsProcessing(true);
    setTotalCount(gigsWithoutAllocations.length);
    setProcessedCount(0);

    try {
      // Process in batches of 5
      const batchSize = 5;
      for (let i = 0; i < gigsWithoutAllocations.length; i += batchSize) {
        const batch = gigsWithoutAllocations.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(gig =>
            createAllocationForGig({
              gigId: gig.id,
              grossAmount: gig.net_amount,
            })
          )
        );

        setProcessedCount(Math.min(i + batchSize, gigsWithoutAllocations.length));
      }

      // Mark as complete
      if (Platform.OS === 'web') {
        localStorage.setItem('bozzy_retroactive_prompt_dismissed', 'true');
      }

      Alert.alert('Success', '✅ Calculated allocations for all your past gigs!');
    } catch (error) {
      console.error('[RetroactivePromptBanner] Error:', error);
      Alert.alert('Error', 'Failed to calculate allocations. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartFresh = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('bozzy_retroactive_prompt_dismissed', 'true');
    }
    Alert.alert('Got it', 'Your buckets will fill up as you log new paid gigs');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface.elevated,
          borderColor: colors.brand.DEFAULT + '40',
        },
      ]}
    >
      <Text style={styles.emoji}>💡</Text>
      <Text style={[styles.title, { color: colors.text.DEFAULT }]}>
        Your buckets are set up but empty
      </Text>

      <Text style={[styles.description, { color: colors.text.DEFAULT }]}>
        You have {gigsWithoutAllocations.length} paid gigs totaling ${totalAmount.toFixed(0)} that
        were logged before your money plan existed.
      </Text>

      <Text style={[styles.description, { color: colors.text.DEFAULT }]}>
        Want Bozzy to calculate what your allocations would have been?
      </Text>

      <Text style={[styles.note, { color: colors.text.muted }]}>
        This won't move any money — it just fills in your bucket history so the numbers
        reflect your real year so far.
      </Text>

      {isProcessing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
          <Text style={[styles.loadingText, { color: colors.text.DEFAULT }]}>
            {processedCount === totalCount
              ? 'Finishing up...'
              : `Processing ${processedCount} of ${totalCount} gigs...`}
          </Text>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.brand.DEFAULT },
            ]}
            onPress={handleCalculateHistory}
          >
            <Text style={styles.primaryButtonText}>
              Yes, calculate my history
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border.DEFAULT },
            ]}
            onPress={handleStartFresh}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text.DEFAULT }]}>
              Start fresh from today →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  note: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
