import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';

/**
 * Temporary debug panel to verify allocation engine data flow
 * Shows bucket count and YTD totals
 * Remove after Sprint 2 when real UI is built
 */
export function BucketDebugPanel() {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets, isLoading: bucketsLoading } = useAllocationBuckets();
  const { ytdTotals, isLoadingYTD } = useAllocationTransactions();

  if (bucketsLoading || isLoadingYTD) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
        <Text style={[styles.title, { color: colors.text.DEFAULT }]}>🔧 Debug: Loading...</Text>
      </View>
    );
  }

  if (buckets.length === 0) {
    return null; // Don't show if no buckets configured
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
      <Text style={[styles.title, { color: colors.text.DEFAULT }]}>
        🔧 Debug Panel (Sprint 1)
      </Text>
      
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text.muted }]}>Buckets configured:</Text>
        <Text style={[styles.value, { color: colors.success.DEFAULT }]}>{buckets.length}</Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text.muted }]}>YTD allocations:</Text>
        <Text style={[styles.value, { color: colors.success.DEFAULT }]}>{ytdTotals.length}</Text>
      </View>

      {buckets.map((bucket) => {
        const ytd = ytdTotals.find(t => t.bucket_id === bucket.id);
        return (
          <View key={bucket.id} style={styles.bucketRow}>
            <Text style={[styles.bucketEmoji]}>{bucket.emoji}</Text>
            <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>
              {bucket.name}
            </Text>
            <Text style={[styles.bucketPercent, { color: colors.text.muted }]}>
              {bucket.percentage}%
            </Text>
            {ytd && (
              <Text style={[styles.bucketTotal, { color: colors.success.DEFAULT }]}>
                ${ytd.total.toFixed(2)}
              </Text>
            )}
          </View>
        );
      })}

      <Text style={[styles.note, { color: colors.text.subtle }]}>
        ✓ Data connection verified. This panel will be removed in Sprint 2.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  bucketEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  bucketName: {
    fontSize: 14,
    flex: 1,
  },
  bucketPercent: {
    fontSize: 13,
    marginRight: 12,
  },
  bucketTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
