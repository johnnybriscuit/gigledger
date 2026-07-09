import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Kard } from './Kard';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';

interface HealthScoreWidgetProps {
  ytdGrossIncome: number;
}

const DOT_GREEN = '#16a34a';
const DOT_AMBER = '#d97706';
const DOT_RED = '#dc2626';

type DotColor = typeof DOT_GREEN | typeof DOT_AMBER | typeof DOT_RED;

interface IndicatorRow {
  label: string;
  color: DotColor;
  phrase: string;
}

function getCurrentMonthNumber(): number {
  return new Date().getMonth() + 1; // 1–12
}

export function HealthScoreWidget({ ytdGrossIncome }: HealthScoreWidgetProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();

  if (buckets.length === 0 || ytdGrossIncome === 0) return null;

  const rows: IndicatorRow[] = [];

  // ── Tax Coverage ──────────────────────────────────────────
  const federalBucket = buckets.find(b => b.bucket_type === 'federal_tax');
  const stateBucket = buckets.find(b => b.bucket_type === 'state_tax');

  if (federalBucket) {
    const actualTaxAllocated =
      (ytdTotals.find(t => t.bucket_id === federalBucket.id)?.total ?? 0) +
      (stateBucket ? (ytdTotals.find(t => t.bucket_id === stateBucket.id)?.total ?? 0) : 0);

    const taxPct = (federalBucket.percentage + (stateBucket?.percentage ?? 0)) / 100;
    const estimatedQuarterlyTax = (ytdGrossIncome * taxPct) / 4;

    let color: DotColor;
    let phrase: string;
    if (actualTaxAllocated >= estimatedQuarterlyTax * 0.9) {
      color = DOT_GREEN;
      phrase = 'On track for this quarter';
    } else if (actualTaxAllocated >= estimatedQuarterlyTax * 0.7) {
      color = DOT_AMBER;
      phrase = 'Slightly behind — check this';
    } else {
      color = DOT_RED;
      phrase = 'Action needed';
    }

    rows.push({ label: 'Tax coverage', color, phrase });
  }

  // ── Retirement ────────────────────────────────────────────
  const retirementBucket = buckets.find(b => b.bucket_type === 'retirement');

  if (retirementBucket) {
    const actualRetirementAllocated =
      ytdTotals.find(t => t.bucket_id === retirementBucket.id)?.total ?? 0;
    const retirementPct = (actualRetirementAllocated / ytdGrossIncome) * 100;

    let color: DotColor;
    let phrase: string;
    if (retirementPct >= 10) {
      color = DOT_GREEN;
      phrase = 'On track';
    } else if (retirementPct >= 5) {
      color = DOT_AMBER;
      phrase = 'Could improve';
    } else {
      color = DOT_RED;
      phrase = 'Not started';
    }

    rows.push({ label: 'Retirement', color, phrase });
  }

  // ── Emergency Fund ────────────────────────────────────────
  const emergencyBucket = buckets.find(b => b.bucket_type === 'emergency_fund');

  if (emergencyBucket) {
    const actualEmergencyAllocated =
      ytdTotals.find(t => t.bucket_id === emergencyBucket.id)?.total ?? 0;
    const currentMonth = getCurrentMonthNumber();
    const avgMonthlyIncome = ytdGrossIncome / currentMonth;
    const monthsCovered =
      avgMonthlyIncome > 0 ? actualEmergencyAllocated / avgMonthlyIncome : 0;

    let color: DotColor;
    let phrase: string;
    if (monthsCovered >= 3) {
      color = DOT_GREEN;
      phrase = 'Protected — 3+ months covered';
    } else if (monthsCovered >= 1) {
      color = DOT_AMBER;
      phrase = `Building — ${monthsCovered.toFixed(1)} months`;
    } else {
      color = DOT_RED;
      phrase = 'Vulnerable — less than 1 month';
    }

    rows.push({ label: 'Emergency fund', color, phrase });
  }

  if (rows.length === 0) return null;

  return (
    <Kard title="Financial health" icon="🩺" style={styles.card}>
      <View style={styles.rows}>
        {rows.map((row, i) => (
          <View key={i} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <Text style={[styles.label, { color: colors.text.DEFAULT }]}>{row.label}</Text>
            <Text style={[styles.phrase, { color: colors.text.muted }]}>{row.phrase}</Text>
          </View>
        ))}
      </View>
    </Kard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  rows: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  phrase: {
    fontSize: 12,
    textAlign: 'right',
  },
});
