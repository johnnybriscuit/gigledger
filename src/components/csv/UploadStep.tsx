/**
 * Step 1: Upload CSV File
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { H2, Text, Button } from '../../ui';
import { colors, spacing } from '../../styles/theme';
import { parseCSV, ParsedCSVRow } from '../../lib/csv/csvParser';

interface UploadStepProps {
  onNext: (rows: ParsedCSVRow[], headers: string[]) => void;
  onCancel: () => void;
}

export function UploadStep({ onNext, onCancel }: UploadStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; rowCount: number } | null>(null);
  const [isFormatsExpanded, setIsFormatsExpanded] = useState(false);

  const handleFileSelect = async (event: any) => {
    setError(null);
    setIsProcessing(true);

    try {
      const file = event.target.files[0];
      if (!file) {
        setIsProcessing(false);
        return;
      }

      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        setIsProcessing(false);
        return;
      }

      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setError('No valid rows found. Please check your CSV format or download the template.');
        setIsProcessing(false);
        setSelectedFile(null);
        return;
      }

      setSelectedFile({ name: file.name, rowCount: rows.length });
      const headers = Object.keys(rows[0]);
      onNext(rows, headers);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Download template CSV
    const link = document.createElement('a');
    link.href = '/templates/gig-import-template.csv';
    link.download = 'gig-import-template.csv';
    link.click();
  };

  return (
    <View style={styles.container}>
      <View style={styles.minimumBox}>
        <Text style={styles.minimumText}>Minimum required columns: Date, Payer, Gross/Amount. Any column order is fine.</Text>
      </View>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>✓ We'll match your columns automatically (you can adjust).</Text>
        <Text style={styles.infoText}>✓ Any column order is fine — extra columns are OK.</Text>
        <Text style={styles.infoText}>✓ We can create missing payers for you.</Text>
        <Text style={styles.infoText}>✓ We accept common date and $ formats.</Text>
        <Text style={styles.infoText}>✓ You'll review totals, duplicates, and errors before importing.</Text>
        <Text style={styles.infoText}>✓ You can undo the import after.</Text>
      </View>

      {Platform.OS === 'web' && (
        <View style={styles.uploadSection}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => document.getElementById('csv-upload')?.click()}
              disabled={isProcessing}
            >
              <Text style={styles.uploadButtonText}>
                {isProcessing ? 'Processing...' : '📤 Upload CSV'}
              </Text>
            </TouchableOpacity>
          </label>

          <Button
            variant="ghost"
            onPress={handleDownloadTemplate}
            style={styles.templateButton}
          >
            📥 Download Template CSV
          </Button>
        </View>
      )}

      {selectedFile && !error && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✓ {selectedFile.name} ({selectedFile.rowCount} rows detected)</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          {error.includes('No valid rows') && (
            <TouchableOpacity onPress={handleDownloadTemplate} style={styles.errorLink}>
              <Text style={styles.errorLinkText}>Download template CSV →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Supported Formats Accordion */}
      <View style={styles.accordionContainer}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setIsFormatsExpanded(!isFormatsExpanded)}
        >
          <Text style={styles.accordionTitle}>Supported formats</Text>
          <Text style={styles.accordionIcon}>{isFormatsExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        
        {isFormatsExpanded && (
          <View style={styles.accordionContent}>
            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>✅ Dates:</Text>
              <Text style={styles.formatExample}>• 2026-01-27</Text>
              <Text style={styles.formatExample}>• 01/27/2026</Text>
              <Text style={styles.formatExample}>• 1/27/26</Text>
            </View>

            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>✅ Money:</Text>
              <Text style={styles.formatExample}>• 1200</Text>
              <Text style={styles.formatExample}>• 1,200</Text>
              <Text style={styles.formatExample}>• $1,200.50</Text>
              <Text style={styles.formatNote}>(We'll clean $ signs and commas automatically.)</Text>
            </View>

            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>✅ Yes/No fields:</Text>
              <Text style={styles.formatExample}>• Yes / No</Text>
              <Text style={styles.formatExample}>• Y / N</Text>
              <Text style={styles.formatExample}>• true / false</Text>
              <Text style={styles.formatExample}>• 1 / 0</Text>
            </View>

            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>✅ Payment method values (examples):</Text>
              <Text style={styles.formatExample}>• Direct Deposit, Venmo, Cash App, Cash, Check, Other</Text>
            </View>

            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>✅ Payers:</Text>
              <Text style={styles.formatNote}>If a payer name doesn't exist, we'll help you match it or create it.</Text>
            </View>

            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>⚠️ Taxes withheld:</Text>
              <Text style={styles.formatNote}>Currently stored as Yes/No only.</Text>
              <Text style={styles.formatNote}>If you have a withheld amount, put it in Notes.</Text>
            </View>

            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>✅ Extras:</Text>
              <Text style={styles.formatNote}>Extra columns are fine — we'll ignore what we don't recognize.</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button variant="ghost" onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: parseInt(spacing[4]),
  },
  minimumBox: {
    backgroundColor: '#f0f9ff',
    padding: parseInt(spacing[3]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  minimumText: {
    fontSize: 13,
    color: '#0c4a6e',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[4]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: parseInt(spacing[2]),
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.DEFAULT,
  },
  uploadSection: {
    gap: parseInt(spacing[3]),
  },
  uploadButton: {
    backgroundColor: colors.brand.DEFAULT,
    padding: parseInt(spacing[4]),
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateButton: {
    marginTop: parseInt(spacing[2]),
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    padding: parseInt(spacing[3]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  successText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: parseInt(spacing[3]),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    gap: parseInt(spacing[2]),
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  errorLink: {
    marginTop: parseInt(spacing[1]),
  },
  errorLinkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  accordionContainer: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: parseInt(spacing[3]),
    backgroundColor: colors.surface.DEFAULT,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.DEFAULT,
  },
  accordionIcon: {
    fontSize: 12,
    color: colors.text.muted,
  },
  accordionContent: {
    padding: parseInt(spacing[4]),
    backgroundColor: colors.surface.muted,
    gap: parseInt(spacing[3]),
  },
  formatSection: {
    gap: parseInt(spacing[1]),
  },
  formatTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[1]),
  },
  formatExample: {
    fontSize: 13,
    color: colors.text.DEFAULT,
    paddingLeft: parseInt(spacing[2]),
  },
  formatNote: {
    fontSize: 13,
    color: colors.text.muted,
    fontStyle: 'italic',
    paddingLeft: parseInt(spacing[2]),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: parseInt(spacing[4]),
  },
});
