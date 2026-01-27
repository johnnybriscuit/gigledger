/**
 * Step 2: Column Mapping with Auto-Detection
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { H2, Text, Button } from '../../ui';
import { colors, spacing } from '../../styles/theme';
import { ParsedCSVRow, ColumnMapping, NormalizedGigRow, autoDetectColumns, normalizeRows } from '../../lib/csv/csvParser';

interface ColumnMappingStepProps {
  headers: string[];
  csvRows: ParsedCSVRow[];
  onNext: (mapping: ColumnMapping, normalized: NormalizedGigRow[]) => void;
  onBack: () => void;
  onCancel: () => void;
}

export function ColumnMappingStep({ headers, csvRows, onNext, onBack, onCancel }: ColumnMappingStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [previewRows, setPreviewRows] = useState<NormalizedGigRow[]>([]);

  useEffect(() => {
    // Auto-detect columns on mount
    const detected = autoDetectColumns(headers);
    setMapping(detected);
  }, [headers]);

  useEffect(() => {
    // Update preview when mapping changes
    if (Object.keys(mapping).length > 0) {
      const normalized = normalizeRows(csvRows.slice(0, 3), mapping);
      setPreviewRows(normalized);
    }
  }, [mapping, csvRows]);

  const handleNext = () => {
    const normalized = normalizeRows(csvRows, mapping);
    onNext(mapping, normalized);
  };

  const requiredFieldsMapped = mapping.date && mapping.payer && (mapping.gross || mapping.netTotal);

  return (
    <View style={styles.container}>
      <H2>Column Mapping</H2>
      <Text subtle style={styles.subtitle}>
        We auto-detected your columns. Adjust if needed.
      </Text>

      <ScrollView style={styles.mappingList}>
        <View style={styles.mappingRow}>
          <Text semibold style={styles.fieldLabel}>Date *</Text>
          <Text style={styles.mappedColumn}>{mapping.date || 'Not mapped'}</Text>
        </View>
        
        <View style={styles.mappingRow}>
          <Text semibold style={styles.fieldLabel}>Payer *</Text>
          <Text style={styles.mappedColumn}>{mapping.payer || 'Not mapped'}</Text>
        </View>
        
        <View style={styles.mappingRow}>
          <Text semibold style={styles.fieldLabel}>Gross Amount *</Text>
          <Text style={styles.mappedColumn}>{mapping.gross || mapping.netTotal || 'Not mapped'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.mappingRow}>
          <Text style={styles.fieldLabel}>Title</Text>
          <Text style={styles.mappedColumn}>{mapping.title || 'Not mapped'}</Text>
        </View>
        
        <View style={styles.mappingRow}>
          <Text style={styles.fieldLabel}>Tips</Text>
          <Text style={styles.mappedColumn}>{mapping.tips || 'Not mapped'}</Text>
        </View>
        
        <View style={styles.mappingRow}>
          <Text style={styles.fieldLabel}>Fees</Text>
          <Text style={styles.mappedColumn}>{mapping.fees || 'Not mapped'}</Text>
        </View>
        
        <View style={styles.mappingRow}>
          <Text style={styles.fieldLabel}>Payment Method</Text>
          <Text style={styles.mappedColumn}>{mapping.paymentMethod || 'Not mapped'}</Text>
        </View>
      </ScrollView>

      {previewRows.length > 0 && (
        <View style={styles.previewSection}>
          <Text semibold style={styles.previewTitle}>Preview (first 3 rows)</Text>
          {previewRows.map((row, idx) => (
            <View key={idx} style={styles.previewRow}>
              <Text style={styles.previewText}>
                {row.date} • {row.payer} • ${row.gross || row.netTotal || 0}
              </Text>
              {row.errors.length > 0 && (
                <Text style={styles.errorText}>⚠️ {row.errors.join(', ')}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {!requiredFieldsMapped && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Required fields must be mapped: Date, Payer, and Amount
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
          onPress={handleNext}
          disabled={!requiredFieldsMapped}
        >
          Next: Payer Resolution
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
  mappingList: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: parseInt(spacing[3]),
    maxHeight: 300,
  },
  mappingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: parseInt(spacing[2]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  mappedColumn: {
    fontSize: 14,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: parseInt(spacing[2]),
  },
  previewSection: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: parseInt(spacing[3]),
  },
  previewTitle: {
    fontSize: 14,
    marginBottom: parseInt(spacing[2]),
  },
  previewRow: {
    paddingVertical: parseInt(spacing[2]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  previewText: {
    fontSize: 13,
    color: colors.text.DEFAULT,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger.DEFAULT,
    marginTop: parseInt(spacing[1]),
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: parseInt(spacing[3]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: parseInt(spacing[4]),
  },
});
