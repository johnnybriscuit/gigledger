import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import type { AllocationBucket } from '../../types/allocation';

interface FinancialStatusRowProps {
  ytdGrossIncome: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

function getNextQuarterlyDueDate(): { quarter: string; label: string; date: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const deadlines = [
    { quarter: 'Q1', date: new Date(y, 3, 15), label: 'Apr 15' },
    { quarter: 'Q2', date: new Date(y, 5, 15), label: 'Jun 15' },
    { quarter: 'Q3', date: new Date(y, 8, 15), label: 'Sep 15' },
    { quarter: 'Q4', date: new Date(y + 1, 0, 15), label: 'Jan 15' },
  ];
  return deadlines.find(d => d.date > now) ?? deadlines[0];
}

// ─── Individual status cards ─────────────────────────────────

function TaxCard({
  buckets,
  ytdGrossIncome,
  colors,
}: {
  buckets: AllocationBucket[];
  ytdGrossIncome: number;
  colors: ReturnType<typeof getThemePalette>;
}) {
  const federal = buckets.find(b => b.bucket_type === 'federal_tax');
  const state = buckets.find(b => b.bucket_type === 'state_tax' && b.percentage > 0);

  if (!federal) return null;

  const taxPct = (federal.percentage + (state?.percentage ?? 0)) / 100;
  const taxYTD = ytdGrossIncome * taxPct;
  const quarterlyEst = taxYTD / 4;

  const deadline = getNextQuarterlyDueDate();
  const daysUntil = Math.ceil(
    (deadline.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Coverage: how much of this quarter's estimated tax is set aside
  // Since amounts are plan-based, coverage is always 100% if income > 0
  const covered = ytdGrossIncome > 0;

  const borderColor = covered ? '#16a34a' : '#dc2626';
  const bgColor = covered ? (colors === getThemePalette('dark') ? '#0d2318' : '#f0fdf4')
    : (colors === getThemePalette('dark') ? '#2b0b0e' : '#fef2f2');

  return (
    <View style={[styles.card, { borderLeftColor: borderColor, backgroundColor: colors.surface.elevated }]}>
      <Text style={[styles.cardIcon]}>🏛️</Text>
      <Text style={[styles.cardTitle, { color: colors.text.muted }]}>TAX COVERAGE</Text>
      <Text style={[styles.cardPrimary, { color: colors.text.DEFAULT }]}>
        {fmt(taxYTD)} set aside
      </Text>
      <Text style={[styles.cardStatus, { color: covered ? colors.success.DEFAULT : colors.error.DEFAULT }]}>
        {ytdGrossIncome === 0
          ? '— no income yet'
          : `✅ On track for ${deadline.quarter}`}
      </Text>
      {daysUntil <= 60 && ytdGrossIncome > 0 && (
        <Text style={[styles.cardMeta, { color: colors.text.subtle }]}>
          {deadline.quarter} due {deadline.label} · {daysUntil}d
        </Text>
      )}
    </View>
  );
}

function RetirementCard({
  buckets,
  ytdGrossIncome,
  colors,
}: {
  buckets: AllocationBucket[];
  ytdGrossIncome: number;
  colors: ReturnType<typeof getThemePalette>;
}) {
  const bucket = buckets.find(b => b.bucket_type === 'retirement');
  if (!bucket) return null;

  const pct = bucket.percentage;
  const ytd = ytdGrossIncome * (pct / 100);

  let status: string;
  let statusColor: string;
  if (ytdGrossIncome === 0) {
    status = '— no income yet';
    statusColor = colors.text.subtle;
  } else if (pct >= 10) {
    status = `✅ ${pct}% of income — great pace`;
    statusColor = colors.success.DEFAULT;
  } else if (pct >= 5) {
    status = `💪 ${pct}% of income — keep going`;
    statusColor = colors.warning.DEFAULT;
  } else {
    status = `💡 Try increasing to 10%`;
    statusColor = colors.text.muted;
  }

  return (
    <View style={[styles.card, { borderLeftColor: '#3b82f6', backgroundColor: colors.surface.elevated }]}>
      <Text style={styles.cardIcon}>📈</Text>
      <Text style={[styles.cardTitle, { color: colors.text.muted }]}>RETIREMENT</Text>
      <Text style={[styles.cardPrimary, { color: colors.text.DEFAULT }]}>
        {fmt(ytd)} this year
      </Text>
      <Text style={[styles.cardStatus, { color: statusColor }]}>{status}</Text>
      <Text style={[styles.cardMeta, { color: colors.text.subtle }]}>
        IRS limit: $69,000 SEP-IRA
      </Text>
    </View>
  );
}

function EmergencyCard({
  buckets,
  ytdGrossIncome,
  colors,
}: {
  buckets: AllocationBucket[];
  ytdGrossIncome: number;
  colors: ReturnType<typeof getThemePalette>;
}) {
  const bucket = buckets.find(b => b.bucket_type === 'emergency_fund');
  if (!bucket) return null;

  const ytd = ytdGrossIncome * (bucket.percentage / 100);
  const goal = bucket.goal_amount;
  const progress = goal && goal > 0 ? Math.min(ytd / goal, 1) : null;
  const progressPct = progress !== null ? Math.round(progress * 100) : null;

  let status: string;
  let statusColor: string;
  if (ytdGrossIncome === 0) {
    status = '— no income yet';
    statusColor = colors.text.subtle;
  } else if (progress === null) {
    status = 'Set a savings target →';
    statusColor = colors.brand.DEFAULT;
  } else if (progress >= 1) {
    status = '✅ Goal reached!';
    statusColor = colors.success.DEFAULT;
  } else if (progress >= 0.5) {
    status = `💪 ${progressPct}% of goal`;
    statusColor = colors.warning.DEFAULT;
  } else {
    status = `${progressPct}% of goal — keep building`;
    statusColor = colors.text.muted;
  }

  const barWidth = progressPct ?? 0;

  return (
    <View style={[styles.card, { borderLeftColor: '#0d9488', backgroundColor: colors.surface.elevated }]}>
      <Text style={styles.cardIcon}>🛟</Text>
      <Text style={[styles.cardTitle, { color: colors.text.muted }]}>EMERGENCY FUND</Text>
      <Text style={[styles.cardPrimary, { color: colors.text.DEFAULT }]}>
        {fmt(ytd)} saved
      </Text>
      {progress !== null && ytdGrossIncome > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.border.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${barWidth}%` as any,
                backgroundColor: progress >= 1 ? colors.success.DEFAULT : '#0d9488',
              },
            ]}
          />
        </View>
      )}
      <Text style={[styles.cardStatus, { color: statusColor }]}>{status}</Text>
      {goal && goal > 0 && (
        <Text style={[styles.cardMeta, { color: colors.text.subtle }]}>
          Goal: {fmt(goal)}
        </Text>
      )}
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────

export function FinancialStatusRow({ ytdGrossIncome }: FinancialStatusRowProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets: rawBuckets } = useAllocationBuckets();
  const buckets = rawBuckets as unknown as AllocationBucket[];

  const hasRetirement = buckets.some(b => b.bucket_type === 'retirement');
  const hasEmergency = buckets.some(b => b.bucket_type === 'emergency_fund');
  const hasTax = buckets.some(b => b.bucket_type === 'federal_tax');

  // Don't render if no relevant buckets
  if (!hasTax && !hasRetirement && !hasEmergency) return null;

  return (
    <View style={styles.row}>
      {hasTax && (
        <TaxCard buckets={buckets} ytdGrossIncome={ytdGrossIncome} colors={colors} />
      )}
      {hasRetirement && (
        <RetirementCard buckets={buckets} ytdGrossIncome={ytdGrossIncome} colors={colors} />
      )}
      {hasEmergency && (
        <EmergencyCard buckets={buckets} ytdGrossIncome={ytdGrossIncome} colors={colors} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    gap: 4,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: {},
    }),
  },
  cardIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardPrimary: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  cardMeta: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
});
