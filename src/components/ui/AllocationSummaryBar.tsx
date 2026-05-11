import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';

interface BucketSummary {
  bucket_type: string;
  percentage: number;
  color: string;
}

interface AllocationSummaryBarProps {
  buckets: BucketSummary[];
}

export function AllocationSummaryBar({ buckets }: AllocationSummaryBarProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);

  const nonSpendable = buckets.filter(b => b.bucket_type !== 'spendable');
  const spendable = buckets.find(b => b.bucket_type === 'spendable');

  const totalSetAside = nonSpendable.reduce((sum, b) => sum + b.percentage, 0);
  const yoursPercent = spendable?.percentage || (100 - totalSetAside);
  const total = totalSetAside + yoursPercent;

  const isOver = total > 100;
  const isExact = Math.abs(total - 100) < 0.01;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.elevated, borderTopColor: colors.border.DEFAULT }]}>
      <View style={styles.textRow}>
        <Text style={[styles.label, { color: colors.text.muted }]}>
          Set aside: <Text style={[styles.value, { color: colors.text.DEFAULT }]}>{totalSetAside.toFixed(0)}%</Text>
        </Text>
        <View style={styles.yoursContainer}>
          {isExact && <Text style={styles.checkmark}>✓</Text>}
          <Text style={[styles.label, { color: colors.text.muted }]}>
            Yours: <Text style={[styles.yoursValue, { color: colors.success.DEFAULT }]}>{yoursPercent.toFixed(0)}%</Text>
          </Text>
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border.muted }]}>
        {nonSpendable.map((bucket, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              {
                backgroundColor: bucket.color,
                width: `${bucket.percentage}%`,
              },
            ]}
          />
        ))}
        <View
          style={[
            styles.progressSegment,
            {
              backgroundColor: isOver ? colors.danger.DEFAULT : colors.success.DEFAULT,
              width: `${yoursPercent}%`,
            },
          ]}
        />
      </View>

      {isOver && (
        <Text style={[styles.warning, { color: colors.warning.DEFAULT }]}>
          Over by {(total - 100).toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderTopWidth: 1,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontWeight: '600',
  },
  yoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkmark: {
    fontSize: 16,
    color: '#15803d',
  },
  yoursValue: {
    fontWeight: '700',
    fontSize: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  warning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
