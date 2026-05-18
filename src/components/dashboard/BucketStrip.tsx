import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';
import type { AllocationBucket } from '../../types/allocation';

interface BucketStripProps {
  onManageBuckets?: () => void;
}

interface BucketWithBalance extends AllocationBucket {
  ytdBalance: number;
  ytdPercentage: number;
}

export function BucketStrip({ onManageBuckets }: BucketStripProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();
  const [selectedBucket, setSelectedBucket] = useState<BucketWithBalance | null>(null);

  // Calculate YTD balances for each bucket
  const bucketsWithBalances: BucketWithBalance[] = buckets.map(bucket => {
    const ytdData = ytdTotals.find(t => t.bucket_id === bucket.id);
    const ytdBalance = ytdData?.total || 0;
    
    // Calculate percentage of total income (rough estimate)
    const totalIncome = ytdTotals.reduce((sum, t) => sum + t.total, 0);
    const ytdPercentage = totalIncome > 0 ? (ytdBalance / totalIncome) * 100 : 0;

    return {
      ...(bucket as AllocationBucket),
      ytdBalance,
      ytdPercentage,
    };
  });

  // Sort buckets by priority
  const sortedBuckets = [...bucketsWithBalances].sort((a, b) => {
    const order: Record<string, number> = {
      federal_tax: 1,
      state_tax: 2,
      retirement: 3,
      emergency_fund: 4,
      debt: 5,
      goal: 6,
      spendable: 7,
    };
    return (order[a.bucket_type] || 99) - (order[b.bucket_type] || 99);
  });

  // Filter out state tax if percentage is 0
  const visibleBuckets = sortedBuckets.filter(
    bucket => !(bucket.bucket_type === 'state_tax' && bucket.percentage === 0)
  );

  const getShortName = (bucket: AllocationBucket): string => {
    switch (bucket.bucket_type) {
      case 'federal_tax': return 'Taxes';
      case 'state_tax': return 'State Tax';
      case 'retirement': return 'Retirement';
      case 'emergency_fund': return 'Emergency';
      case 'debt': return bucket.goal_name 
        ? bucket.goal_name.slice(0, 12) : 'Debt';
      case 'goal': return bucket.goal_name 
        ? bucket.goal_name.slice(0, 12) : 'Goal';
      case 'spendable': return 'Yours';
      default: return bucket.name.slice(0, 10);
    }
  };

  const getBucketColor = (bucket: AllocationBucket): string => {
    return bucket.color || '#2E86AB';
  };

  const handleBucketPress = (bucket: BucketWithBalance) => {
    setSelectedBucket(bucket);
  };

  const closeModal = () => {
    setSelectedBucket(null);
  };

  if (buckets.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.text.DEFAULT }]}>
          Your Money Buckets  ·  YTD
        </Text>
        {onManageBuckets && (
          <TouchableOpacity onPress={onManageBuckets}>
            <Text style={[styles.manageLink, { color: colors.brand.DEFAULT }]}>
              Manage →
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable pill strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {visibleBuckets.map((bucket, index) => {
          const bucketColor = getBucketColor(bucket);
          const isLast = index === visibleBuckets.length - 1;

          return (
            <TouchableOpacity
              key={bucket.id}
              style={[
                styles.pill,
                {
                  backgroundColor: `${bucketColor}1A`, // 10% opacity
                  borderColor: `${bucketColor}4D`, // 30% opacity
                  marginRight: isLast ? 0 : 12,
                },
              ]}
              onPress={() => handleBucketPress(bucket)}
            >
              <Text style={styles.emoji}>{bucket.emoji}</Text>
              <Text style={[styles.pillName, { color: colors.text.DEFAULT }]}>
                {getShortName(bucket)}
              </Text>
              <Text style={[styles.pillBalance, { color: colors.text.DEFAULT }]}>
                ${bucket.ytdBalance.toFixed(0)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Detail Modal/Popover */}
      {selectedBucket && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.surface.elevated },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalEmoji}>{selectedBucket.emoji}</Text>
              <Text style={[styles.modalTitle, { color: colors.text.DEFAULT }]}>
                {selectedBucket.name}
              </Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStat}>
                  <Text style={[styles.modalStatLabel, { color: colors.text.muted }]}>
                    YTD Balance
                  </Text>
                  <Text style={[styles.modalStatValue, { color: colors.text.DEFAULT }]}>
                    ${selectedBucket.ytdBalance.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalStat}>
                  <Text style={[styles.modalStatLabel, { color: colors.text.muted }]}>
                    Percentage
                  </Text>
                  <Text style={[styles.modalStatValue, { color: colors.text.DEFAULT }]}>
                    {selectedBucket.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>

              {selectedBucket.goal_amount && (
                <View style={styles.progressSection}>
                  <Text style={[styles.progressLabel, { color: colors.text.muted }]}>
                    Progress toward ${selectedBucket.goal_amount.toFixed(0)} goal
                  </Text>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: colors.border.muted },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: getBucketColor(selectedBucket),
                          width: `${Math.min(
                            100,
                            (selectedBucket.ytdBalance / selectedBucket.goal_amount) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressPercent, { color: colors.text.subtle }]}>
                    {((selectedBucket.ytdBalance / selectedBucket.goal_amount) * 100).toFixed(0)}%
                    complete
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Text style={[styles.closeButtonText, { color: colors.text.muted }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  manageLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    marginHorizontal: -4,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  pill: {
    height: 64,
    minWidth: 120,
    paddingHorizontal: 16,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  pillName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  pillBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalStats: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  modalStat: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressSection: {
    width: '100%',
    marginBottom: 24,
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    textAlign: 'center',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
