/**
 * Success Screen with Undo Functionality
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { H2, Text, Button } from '../../ui';
import { colors, spacing } from '../../styles/theme';
import { BatchImportResult, undoImport } from '../../lib/csv/batchImportService';

interface SuccessStepProps {
  result: BatchImportResult;
  onClose: () => void;
  onUndo: () => void;
}

export function SuccessStep({ result, onClose, onUndo }: SuccessStepProps) {
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    Alert.alert(
      'Undo Import',
      `This will delete ${result.summary.importedCount} imported gigs${result.newPayersCreated.length > 0 ? ` and ${result.newPayersCreated.length} newly created payers` : ''}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo Import',
          style: 'destructive',
          onPress: async () => {
            setIsUndoing(true);
            try {
              await undoImport(result.batchId, ''); // userId handled by RLS
              onUndo();
            } catch (error) {
              console.error('Undo failed:', error);
              Alert.alert('Error', `Failed to undo import: ${error instanceof Error ? error.message : 'Unknown error'}`);
              setIsUndoing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.successHeader}>
        <Text style={styles.successIcon}>✅</Text>
        <H2>Import Complete!</H2>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Successfully Imported:</Text>
          <Text semibold style={styles.summaryValueSuccess}>
            {result.summary.importedCount} gigs
          </Text>
        </View>

        {result.summary.skippedCount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Skipped Duplicates:</Text>
            <Text semibold style={styles.summaryValueWarning}>
              {result.summary.skippedCount}
            </Text>
          </View>
        )}

        {result.summary.errorCount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Errors:</Text>
            <Text semibold style={styles.summaryValueError}>
              {result.summary.errorCount}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Gross:</Text>
          <Text semibold style={styles.summaryValue}>
            ${result.summary.totalGross.toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Tips:</Text>
          <Text semibold style={styles.summaryValue}>
            ${result.summary.totalTips.toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Fees:</Text>
          <Text semibold style={styles.summaryValue}>
            ${result.summary.totalFees.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* New Payers Created */}
      {result.newPayersCreated.length > 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Created {result.newPayersCreated.length} new payer{result.newPayersCreated.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Error Details */}
      {result.errors.length > 0 && (
        <View style={styles.errorBox}>
          <Text semibold style={styles.errorTitle}>
            Errors ({result.errors.length})
          </Text>
          <ScrollView style={styles.errorList}>
            {result.errors.slice(0, 10).map((err, idx) => (
              <Text key={idx} style={styles.errorText}>
                • Row {err.rowIndex}: {err.error}
              </Text>
            ))}
            {result.errors.length > 10 && (
              <Text style={styles.errorText}>
                ... and {result.errors.length - 10} more errors
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          variant="ghost"
          onPress={handleUndo}
          disabled={isUndoing || result.summary.importedCount === 0}
          style={styles.undoButton}
        >
          {isUndoing ? 'Undoing...' : 'Undo This Import'}
        </Button>
        <Button variant="primary" onPress={onClose}>
          Done
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: parseInt(spacing[4]),
  },
  successHeader: {
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  successIcon: {
    fontSize: 48,
  },
  summaryBox: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[4]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: parseInt(spacing[3]),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: 16,
  },
  summaryValueSuccess: {
    fontSize: 16,
    color: colors.success.DEFAULT,
  },
  summaryValueWarning: {
    fontSize: 16,
    color: '#f59e0b',
  },
  summaryValueError: {
    fontSize: 16,
    color: colors.danger.DEFAULT,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
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
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: parseInt(spacing[3]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorTitle: {
    fontSize: 14,
    color: colors.danger.DEFAULT,
    marginBottom: parseInt(spacing[2]),
  },
  errorList: {
    maxHeight: 150,
  },
  errorText: {
    fontSize: 13,
    color: '#7f1d1d',
    marginBottom: parseInt(spacing[1]),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: parseInt(spacing[4]),
    gap: parseInt(spacing[3]),
  },
  undoButton: {
    flex: 1,
  },
});
