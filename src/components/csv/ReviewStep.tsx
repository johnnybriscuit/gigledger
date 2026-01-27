/**
 * Step 4: Review & Import with Duplicate Detection and Combine Toggle
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { H2, Text, Button } from '../../ui';
import { colors, spacing } from '../../styles/theme';
import { NormalizedGigRow } from '../../lib/csv/csvParser';
import { PayerMatch, CombinedGig, combineRows, detectDuplicates, calculateImportSummary } from '../../lib/csv/importHelpers';

interface ReviewStepProps {
  normalizedRows: NormalizedGigRow[];
  payerMatches: PayerMatch[];
  existingGigs: Array<{
    id: string;
    date: string;
    payer_id: string;
    payer_name: string;
    gross: number;
    title?: string;
  }>;
  combineEnabled: boolean;
  onCombineToggle: (enabled: boolean) => void;
  onImport: (rows: CombinedGig[]) => Promise<void>;
  onBack: () => void;
  onCancel: () => void;
}

export function ReviewStep({
  normalizedRows,
  payerMatches,
  existingGigs,
  combineEnabled,
  onCombineToggle,
  onImport,
  onBack,
  onCancel,
}: ReviewStepProps) {
  const [finalRows, setFinalRows] = useState<CombinedGig[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  useEffect(() => {
    // Combine rows if enabled
    const combined = combineRows(normalizedRows, combineEnabled);
    setFinalRows(combined);

    // Detect duplicates
    const dups = detectDuplicates(normalizedRows, existingGigs);
    setDuplicates(dups);
  }, [normalizedRows, combineEnabled, existingGigs]);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const rowsToImport = skipDuplicates
        ? finalRows.filter(row => !duplicates.some(d => d.importRows.includes(row.rowIndex)))
        : finalRows;

      await onImport(rowsToImport);
    } catch (error) {
      console.error('Import failed:', error);
      setIsImporting(false);
    }
  };

  const summary = calculateImportSummary(finalRows);
  const validRows = finalRows.filter(r => r.errors.length === 0);
  const errorRows = finalRows.filter(r => r.errors.length > 0);
  const combinedCount = finalRows.filter(r => r.isCombined).length;

  return (
    <View style={styles.container}>
      <H2>Review & Import</H2>
      <Text subtle style={styles.subtitle}>
        Preview your import before saving.
      </Text>

      {/* Summary Stats */}
      <View style={styles.summaryBox}>
        <Text semibold style={styles.summaryTitle}>Import Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Rows:</Text>
            <Text semibold style={styles.summaryValue}>{summary.totalRows}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Valid:</Text>
            <Text semibold style={[styles.summaryValue, { color: colors.success.DEFAULT }]}>
              {summary.validRows}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Errors:</Text>
            <Text semibold style={[styles.summaryValue, { color: colors.danger.DEFAULT }]}>
              {summary.errorRows}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Gross:</Text>
            <Text semibold style={styles.summaryValue}>
              ${summary.totalGross.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Tips:</Text>
            <Text semibold style={styles.summaryValue}>
              ${summary.totalTips.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Fees:</Text>
            <Text semibold style={styles.summaryValue}>
              ${summary.totalFees.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Combine Toggle */}
      <View style={styles.toggleBox}>
        <View style={styles.toggleHeader}>
          <View style={styles.toggleInfo}>
            <Text semibold style={styles.toggleLabel}>
              Combine rows that look like the same gig (advanced)
            </Text>
            <Text subtle style={styles.toggleDescription}>
              Groups rows by Date + Payer + Title and sums amounts
            </Text>
          </View>
          <Switch
            value={combineEnabled}
            onValueChange={onCombineToggle}
            trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
            thumbColor="#fff"
          />
        </View>
        {combineEnabled && combinedCount > 0 && (
          <Text style={styles.combineInfo}>
            ✓ {combinedCount} combined gig{combinedCount !== 1 ? 's' : ''} from multiple rows
          </Text>
        )}
      </View>

      {/* Duplicates Warning */}
      {duplicates.length > 0 && (
        <View style={styles.warningBox}>
          <Text semibold style={styles.warningTitle}>
            ⚠️ Possible Duplicates Detected
          </Text>
          <Text style={styles.warningText}>
            {duplicates.length} row{duplicates.length !== 1 ? 's' : ''} may already exist in your gigs.
          </Text>
          <View style={styles.duplicateToggle}>
            <Switch
              value={skipDuplicates}
              onValueChange={setSkipDuplicates}
              trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
              thumbColor="#fff"
            />
            <Text style={styles.duplicateToggleLabel}>
              Skip duplicates (recommended)
            </Text>
          </View>
        </View>
      )}

      {/* Preview Table */}
      <ScrollView style={styles.previewTable}>
        <Text semibold style={styles.previewTitle}>Preview ({validRows.length} gigs)</Text>
        {finalRows.slice(0, 10).map((row, idx) => (
          <View
            key={idx}
            style={[
              styles.previewRow,
              row.errors.length > 0 && styles.previewRowError,
              row.isCombined && styles.previewRowCombined,
            ]}
          >
            <View style={styles.previewRowHeader}>
              <Text style={styles.previewRowText}>
                {row.date} • {row.payer}
              </Text>
              <Text semibold style={styles.previewRowAmount}>
                ${(row.gross || row.netTotal || 0).toFixed(2)}
              </Text>
            </View>
            {row.title && (
              <Text subtle style={styles.previewRowSubtext}>{row.title}</Text>
            )}
            {row.isCombined && (
              <Text style={styles.combinedBadge}>
                Combined from rows: {row.combinedFromRows.join(', ')}
              </Text>
            )}
            {row.errors.length > 0 && (
              <Text style={styles.errorBadge}>
                ⚠️ {row.errors.join(', ')}
              </Text>
            )}
            {row.warnings.length > 0 && (
              <Text style={styles.warningBadge}>
                {row.warnings.join(', ')}
              </Text>
            )}
          </View>
        ))}
        {finalRows.length > 10 && (
          <Text subtle style={styles.moreRowsText}>
            ... and {finalRows.length - 10} more rows
          </Text>
        )}
      </ScrollView>

      {errorRows.length > 0 && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            ⚠️ {errorRows.length} row{errorRows.length !== 1 ? 's have' : ' has'} errors and will be skipped
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
        <Button
          variant="primary"
          onPress={handleImport}
          disabled={isImporting || validRows.length === 0}
        >
          {isImporting ? 'Importing...' : `Import ${validRows.length} Gigs`}
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
  },
  summaryTitle: {
    fontSize: 16,
    marginBottom: parseInt(spacing[3]),
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[3]),
  },
  summaryItem: {
    minWidth: '30%',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: 18,
    marginTop: parseInt(spacing[1]),
  },
  toggleBox: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[4]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: parseInt(spacing[3]),
  },
  toggleLabel: {
    fontSize: 14,
  },
  toggleDescription: {
    fontSize: 13,
    marginTop: parseInt(spacing[1]),
  },
  combineInfo: {
    fontSize: 13,
    color: colors.success.DEFAULT,
    marginTop: parseInt(spacing[2]),
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: parseInt(spacing[4]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningTitle: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: parseInt(spacing[2]),
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: parseInt(spacing[3]),
  },
  duplicateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  duplicateToggleLabel: {
    fontSize: 14,
    color: '#92400e',
  },
  previewTable: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: parseInt(spacing[3]),
    maxHeight: 400,
  },
  previewTitle: {
    fontSize: 14,
    marginBottom: parseInt(spacing[3]),
  },
  previewRow: {
    paddingVertical: parseInt(spacing[3]),
    paddingHorizontal: parseInt(spacing[2]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  previewRowError: {
    backgroundColor: '#fef2f2',
  },
  previewRowCombined: {
    backgroundColor: '#f0f9ff',
  },
  previewRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewRowText: {
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  previewRowAmount: {
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  previewRowSubtext: {
    fontSize: 13,
    marginTop: parseInt(spacing[1]),
  },
  combinedBadge: {
    fontSize: 12,
    color: colors.brand.DEFAULT,
    marginTop: parseInt(spacing[1]),
  },
  errorBadge: {
    fontSize: 12,
    color: colors.danger.DEFAULT,
    marginTop: parseInt(spacing[1]),
  },
  warningBadge: {
    fontSize: 12,
    color: '#92400e',
    marginTop: parseInt(spacing[1]),
  },
  moreRowsText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: parseInt(spacing[3]),
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: parseInt(spacing[3]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: parseInt(spacing[4]),
  },
});
