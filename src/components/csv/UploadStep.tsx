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
        setError('CSV file is empty');
        setIsProcessing(false);
        return;
      }

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
      <H2>Upload Your CSV</H2>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>✓ We'll match your columns automatically (you can adjust).</Text>
        <Text style={styles.infoText}>✓ We can create missing payers for you.</Text>
        <Text style={styles.infoText}>✓ We accept common date and $ formats.</Text>
        <Text style={styles.infoText}>✓ You'll review totals and duplicates before importing.</Text>
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

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

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
    justifyContent: 'flex-end',
    marginTop: parseInt(spacing[4]),
  },
});
