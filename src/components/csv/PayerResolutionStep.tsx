/**
 * Step 3: Payer Resolution with Fuzzy Matching
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { H2, Text, Button } from '../../ui';
import { colors, spacing } from '../../styles/theme';
import { NormalizedGigRow } from '../../lib/csv/csvParser';
import { PayerMatch, matchPayers, getUniquePayers } from '../../lib/csv/importHelpers';

interface PayerResolutionStepProps {
  normalizedRows: NormalizedGigRow[];
  existingPayers: Array<{ id: string; name: string }>;
  onNext: (matches: PayerMatch[]) => void;
  onBack: () => void;
  onCancel: () => void;
}

export function PayerResolutionStep({
  normalizedRows,
  existingPayers,
  onNext,
  onBack,
  onCancel,
}: PayerResolutionStepProps) {
  const [payerMatches, setPayerMatches] = useState<PayerMatch[]>([]);

  useEffect(() => {
    const uniquePayers = getUniquePayers(normalizedRows);
    const matches = matchPayers(uniquePayers, existingPayers);
    setPayerMatches(matches);
  }, [normalizedRows, existingPayers]);

  const handleNext = () => {
    onNext(payerMatches);
  };

  const newPayersCount = payerMatches.filter(m => m.action === 'create_new').length;
  const matchedPayersCount = payerMatches.filter(m => m.action === 'use_existing').length;

  return (
    <View style={styles.container}>
      <H2>Payer Resolution</H2>
      <Text subtle style={styles.subtitle}>
        We'll match or create payers for you.
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          ✓ {matchedPayersCount} payer{matchedPayersCount !== 1 ? 's' : ''} matched to existing
        </Text>
        <Text style={styles.summaryText}>
          + {newPayersCount} new payer{newPayersCount !== 1 ? 's' : ''} will be created
        </Text>
      </View>

      <ScrollView style={styles.payerList}>
        {payerMatches.map((match, idx) => (
          <View key={idx} style={styles.payerRow}>
            <View style={styles.payerInfo}>
              <Text semibold style={styles.csvPayerName}>{match.csvName}</Text>
              {match.action === 'use_existing' && match.existingPayerName && (
                <Text style={styles.matchInfo}>
                  {match.confidence === 'exact' ? '✓ Exact match' : '≈ Fuzzy match'}: {match.existingPayerName}
                </Text>
              )}
              {match.action === 'create_new' && (
                <Text style={styles.createInfo}>Will create new payer</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {newPayersCount > 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ New payers will be created automatically. You can edit them later in the Payers section.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button variant="ghost" onPress={onBack}>
          Back
        </Button>
        <Button variant="ghost" onPress={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onPress={handleNext}>
          Next: Review & Import
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: parseInt(spacing[4]),
  },
  subtitle: {
    fontSize: 14,
    marginTop: -parseInt(spacing[2]),
  },
  summaryBox: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[4]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: parseInt(spacing[2]),
  },
  summaryText: {
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  payerList: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: parseInt(spacing[3]),
    maxHeight: 400,
  },
  payerRow: {
    paddingVertical: parseInt(spacing[3]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  payerInfo: {
    gap: parseInt(spacing[1]),
  },
  csvPayerName: {
    fontSize: 15,
    color: colors.text.DEFAULT,
  },
  matchInfo: {
    fontSize: 13,
    color: colors.success.DEFAULT,
  },
  createInfo: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    padding: parseInt(spacing[3]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  infoText: {
    color: '#1e40af',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: parseInt(spacing[4]),
  },
});
