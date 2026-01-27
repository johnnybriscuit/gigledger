/**
 * CSV Import Wizard for Gigs
 * Multi-step wizard with upload, mapping, payer resolution, and review
 */

import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { H1, H2, Text, Button } from '../../ui';
import { colors, spacing } from '../../styles/theme';
import { UploadStep } from './UploadStep';
import { ColumnMappingStep } from './ColumnMappingStep';
import { PayerResolutionStep } from './PayerResolutionStep';
import { ReviewStep } from './ReviewStep';
import { ParsedCSVRow, ColumnMapping, NormalizedGigRow } from '../../lib/csv/csvParser';
import { PayerMatch, CombinedGig } from '../../lib/csv/importHelpers';

export type WizardStep = 'upload' | 'mapping' | 'payers' | 'review';

interface CSVImportWizardProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete: (importedCount: number) => void;
  existingPayers: Array<{ id: string; name: string }>;
  existingGigs: Array<{
    id: string;
    date: string;
    payer_id: string;
    payer_name: string;
    gross: number;
    title?: string;
  }>;
}

export function CSVImportWizard({
  visible,
  onClose,
  onImportComplete,
  existingPayers,
  existingGigs,
}: CSVImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [csvRows, setCsvRows] = useState<ParsedCSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [normalizedRows, setNormalizedRows] = useState<NormalizedGigRow[]>([]);
  const [payerMatches, setPayerMatches] = useState<PayerMatch[]>([]);
  const [finalRows, setFinalRows] = useState<CombinedGig[]>([]);
  const [combineEnabled, setCombineEnabled] = useState(false);

  const handleReset = () => {
    setCurrentStep('upload');
    setCsvRows([]);
    setHeaders([]);
    setColumnMapping({});
    setNormalizedRows([]);
    setPayerMatches([]);
    setFinalRows([]);
    setCombineEnabled(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <UploadStep
            onNext={(rows, hdrs) => {
              setCsvRows(rows);
              setHeaders(hdrs);
              setCurrentStep('mapping');
            }}
            onCancel={handleClose}
          />
        );

      case 'mapping':
        return (
          <ColumnMappingStep
            headers={headers}
            csvRows={csvRows}
            onNext={(mapping, normalized) => {
              setColumnMapping(mapping);
              setNormalizedRows(normalized);
              setCurrentStep('payers');
            }}
            onBack={() => setCurrentStep('upload')}
            onCancel={handleClose}
          />
        );

      case 'payers':
        return (
          <PayerResolutionStep
            normalizedRows={normalizedRows}
            existingPayers={existingPayers}
            onNext={(matches) => {
              setPayerMatches(matches);
              setCurrentStep('review');
            }}
            onBack={() => setCurrentStep('mapping')}
            onCancel={handleClose}
          />
        );

      case 'review':
        return (
          <ReviewStep
            normalizedRows={normalizedRows}
            payerMatches={payerMatches}
            existingGigs={existingGigs}
            combineEnabled={combineEnabled}
            onCombineToggle={setCombineEnabled}
            onImport={async (rows) => {
              // Import logic will be handled by parent component
              setFinalRows(rows);
              onImportComplete(rows.length);
              handleClose();
            }}
            onBack={() => setCurrentStep('payers')}
            onCancel={handleClose}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <H1>Import Gigs from CSV</H1>
          <Text subtle style={styles.subtitle}>
            Bring in gigs from a spreadsheet — you'll preview everything before it's saved.
          </Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {renderStep()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
  header: {
    padding: parseInt(spacing[5]),
    paddingBottom: parseInt(spacing[4]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  subtitle: {
    marginTop: parseInt(spacing[2]),
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: parseInt(spacing[5]),
  },
});
