import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';
import type { AllocationBucket, BucketYTDTotal } from '../../types/allocation';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

function getNextTaxDeadline(): { label: string; date: Date; quarter: string } {
  const now = new Date();
  const y = now.getFullYear();
  const deadlines = [
    { quarter: 'Q1', date: new Date(y, 3, 15), label: 'April 15' },
    { quarter: 'Q2', date: new Date(y, 5, 15), label: 'June 15' },
    { quarter: 'Q3', date: new Date(y, 8, 15), label: 'September 15' },
    { quarter: 'Q4', date: new Date(y + 1, 0, 15), label: 'January 15' },
  ];
  return deadlines.find(d => d.date > now) ?? deadlines[0];
}

function getAllocationLabel(bucket: AllocationBucket): string {
  switch (bucket.bucket_type) {
    case 'federal_tax': return 'Set aside for taxes';
    case 'state_tax': return 'Set aside for state taxes';
    case 'retirement': return 'Going to retirement';
    case 'emergency_fund': return 'Building emergency fund';
    case 'debt': return `Paying off ${bucket.goal_name || 'debt'}`;
    case 'goal': return `Saving for ${bucket.goal_name || 'goal'}`;
    case 'spendable': return 'Yours to spend';
    default: return bucket.name;
  }
}

function getBucketYTD(bucket: AllocationBucket, ytdTotals: BucketYTDTotal[]): number {
  return ytdTotals.find(t => t.bucket_id === bucket.id)?.total ?? 0;
}

interface FinancialSnapshotProps {
  ytdGrossIncome: number;
  paidGigsCount: number;
}

export function FinancialSnapshot({ ytdGrossIncome, paidGigsCount }: FinancialSnapshotProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets: rawBuckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();

  const buckets = rawBuckets as unknown as AllocationBucket[];

  if (buckets.length === 0) return null;

  const paidCount = paidGigsCount;

  const deadline = getNextTaxDeadline();
  const daysUntilQuarterly = Math.ceil(
    (deadline.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const showTaxReminder = daysUntilQuarterly <= 60;

  // Split buckets: spendable last, all others first
  const nonSpendable = buckets.filter(
    b => b.bucket_type !== 'spendable' &&
    !(b.bucket_type === 'state_tax' && b.percentage === 0)
  );
  const spendableBucket = buckets.find(b => b.bucket_type === 'spendable');

  // Tax bucket total for reminder row
  const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
  const stateTax = buckets.find(b => b.bucket_type === 'state_tax');
  const taxBucketTotal =
    getBucketYTD(federalTax!, ytdTotals) + getBucketYTD(stateTax!, ytdTotals);
  const estimatedQuarterlyOwed = ytdGrossIncome * ((federalTax?.percentage ?? 20) / 100) / 4;

  // Tax status color
  const taxRatio = estimatedQuarterlyOwed > 0 ? taxBucketTotal / estimatedQuarterlyOwed : 1;
  const taxStatusColor =
    taxRatio >= 1
      ? colors.success.DEFAULT
      : taxRatio >= 0.7
      ? colors.warning.DEFAULT
      : colors.error.DEFAULT;

  const spendableYTD = spendableBucket ? getBucketYTD(spendableBucket, ytdTotals) : 0;
  const spendablePct = spendableBucket?.percentage ?? 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface.elevated,
          borderColor: colors.border.muted,
        },
      ]}
    >
      {/* ── HEADER ── */}
      <Text style={[styles.headerLabel, { color: colors.text.muted }]}>YTD Income</Text>

      <Text style={[styles.incomeNumber, { color: colors.text.DEFAULT }]}>
        {fmt(ytdGrossIncome)}
      </Text>
      <Text style={[styles.incomeSubLabel, { color: colors.text.subtle }]}>
        across {paidCount} paid {paidCount === 1 ? 'gig' : 'gigs'} this year
      </Text>

      {/* ── DIVIDER ── */}
      <View style={[styles.divider, { backgroundColor: colors.border.muted }]} />

      {/* ── ALLOCATION ROWS ── */}
      {nonSpendable.map(bucket => {
        const ytd = getBucketYTD(bucket, ytdTotals);
        const isZero = ytd === 0;
        const bucketColor = bucket.color || colors.brand.DEFAULT;

        return (
          <View key={bucket.id} style={styles.allocationRow}>
            <Text style={styles.rowEmoji}>{bucket.emoji}</Text>
            <Text
              style={[
                styles.rowLabel,
                { color: isZero ? colors.text.subtle : colors.text.DEFAULT },
                isZero && styles.rowLabelMuted,
              ]}
              numberOfLines={1}
            >
              {getAllocationLabel(bucket)}
            </Text>
            <View style={styles.rowRight}>
              {isZero ? (
                <Text style={[styles.rowAmountZero, { color: colors.text.subtle }]}>
                  $0 (not yet funded)
                </Text>
              ) : (
                <>
                  <Text style={[styles.rowAmount, { color: bucketColor }]}>
                    {fmt(ytd)}
                  </Text>
                  <Text style={[styles.rowPct, { color: colors.text.subtle }]}>
                    {bucket.percentage.toFixed(0)}%
                  </Text>
                </>
              )}
            </View>
          </View>
        );
      })}

      {/* ── THICK DIVIDER ── */}
      <View style={[styles.dividerThick, { backgroundColor: colors.border.DEFAULT }]} />

      {/* ── SPENDABLE ROW ── */}
      {spendableBucket && (
        <View
          style={[
            styles.spendableRow,
            { backgroundColor: colors.success.muted },
          ]}
        >
          <Text style={styles.spendableEmoji}>{spendableBucket.emoji}</Text>
          <Text style={[styles.spendableLabel, { color: colors.success.DEFAULT }]}>
            Yours to spend
          </Text>
          <View style={styles.rowRight}>
            <Text style={[styles.spendableAmount, { color: colors.success.DEFAULT }]}>
              {fmt(spendableYTD)}
            </Text>
            <Text style={[styles.spendablePct, { color: colors.success.DEFAULT }]}>
              {spendablePct.toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      {/* ── QUARTERLY TAX REMINDER (only if within 60 days) ── */}
      {showTaxReminder && (
        <View style={[styles.quarterlyRow, { borderTopColor: colors.border.muted }]}>
          <Text style={styles.quarterlyIcon}>📅</Text>
          <View style={styles.quarterlyText}>
            <Text style={[styles.quarterlyLabel, { color: colors.text.DEFAULT }]}>
              {deadline.quarter} tax due {deadline.label} · {daysUntilQuarterly} days
            </Text>
            <Text style={[styles.quarterlySub, { color: taxStatusColor }]}>
              {fmt(taxBucketTotal)} set aside
              {taxRatio < 0.7 && ' — may need more'}
              {taxRatio >= 0.7 && taxRatio < 1 && ' — almost there'}
              {taxRatio >= 1 && ' — you\'re covered ✓'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  incomeNumber: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 4,
  },
  incomeSubLabel: {
    fontSize: 13,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  dividerThick: {
    height: 2,
    marginVertical: 12,
    borderRadius: 1,
  },
  allocationRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowEmoji: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  rowLabelMuted: {
    fontStyle: 'italic',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  rowAmountZero: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  rowPct: {
    fontSize: 12,
    width: 32,
    textAlign: 'right',
  },
  spendableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  spendableEmoji: {
    fontSize: 20,
    width: 26,
    textAlign: 'center',
  },
  spendableLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  spendableAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  spendablePct: {
    fontSize: 14,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  quarterlyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
  },
  quarterlyIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  quarterlyText: {
    flex: 1,
    gap: 2,
  },
  quarterlyLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  quarterlySub: {
    fontSize: 13,
    fontWeight: '600',
  },
});
