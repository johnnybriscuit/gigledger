import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { RateBenchmark } from '../types/allocation';

interface RateComparisonTipProps {
  grossAmount: number;
  rateUnit: RateBenchmark['rate_unit'];
  benchmark: RateBenchmark;
  onDismiss: () => void;
  onSeeRateGuide?: () => void;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function RateComparisonTip({
  grossAmount,
  rateUnit,
  benchmark,
  onDismiss,
  onSeeRateGuide,
}: RateComparisonTipProps) {
  if (grossAmount >= benchmark.rate_low) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.message}>
          {`${benchmark.gig_type} in your area typically earns ${fmt(benchmark.rate_low)}–${fmt(benchmark.rate_high)} per ${benchmark.rate_unit}. Your rate of ${fmt(grossAmount)} is below the market floor.`}
        </Text>
      </View>
      <View style={styles.actions}>
        {onSeeRateGuide && (
          <TouchableOpacity style={styles.primaryButton} onPress={onSeeRateGuide}>
            <Text style={styles.primaryButtonText}>See rate guide</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 16,
    lineHeight: 20,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#d97706',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  dismissButtonText: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: '500',
  },
});
