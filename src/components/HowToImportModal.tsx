import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

export type TaxSoftware = 'turbotax-online' | 'turbotax-desktop' | 'hrblock-desktop' | 'taxact';

interface HowToImportModalProps {
  visible: boolean;
  software: TaxSoftware | null;
  onClose: () => void;
}

const IMPORT_INSTRUCTIONS: Record<TaxSoftware, { title: string; steps: string[]; warning?: string }> = {
  'turbotax-online': {
    title: 'TurboTax Online Manual Entry',
    steps: [
      'TurboTax Online does NOT support TXF file import.',
      'Open the ScheduleC_Summary CSV from your downloaded ZIP file.',
      'Log into TurboTax Online and navigate to Business Income (Schedule C).',
      'Manually enter each line item from the summary CSV into TurboTax.',
      'Use the detail CSVs (Income, Expense, Mileage) as supporting documentation.',
      'Compare your final Schedule C in TurboTax with the included PDF summary to verify totals match.',
    ],
    warning: 'IMPORTANT: This is a manual entry process. TurboTax Online does not import files.',
  },
  'turbotax-desktop': {
    title: 'TurboTax Desktop TXF Import',
    steps: [
      'Open TurboTax Desktop (Windows or Mac application).',
      'Navigate to File > Import > From TXF Files (menu location may vary by version).',
      'Select the TXF file you downloaded from GigLedger.',
      'Review the imported Schedule C line items carefully.',
      'Verify all amounts match your expectations.',
      'Complete any additional forms or schedules as needed.',
    ],
    warning: 'This file is for TurboTax Desktop ONLY. It will not work with TurboTax Online.',
  },
  'hrblock-desktop': {
    title: 'H&R Block Desktop TXF Import',
    steps: [
      'Open H&R Block Desktop software.',
      'Navigate to File > Import or the import menu (location may vary by version).',
      'Select "TXF File" as the import type.',
      'Choose the TXF file you downloaded from GigLedger.',
      'Review all imported Schedule C entries.',
      'Verify totals and complete your return.',
    ],
    warning: 'This file is for H&R Block Desktop software only.',
  },
  'taxact': {
    title: 'TaxAct Manual Entry',
    steps: [
      'Extract the ZIP file you downloaded.',
      'Open the ScheduleC_Summary CSV to see your Schedule C line totals.',
      'Log into TaxAct and navigate to Business Income (Schedule C).',
      'Manually enter each line item from the summary CSV.',
      'Use the detail CSVs (Income, Expense, Mileage) for reference and CPA sharing.',
      'Compare your final Schedule C with the included PDF summary.',
    ],
    warning: 'TaxAct requires manual entry. Use the summary CSV as your guide.',
  },
};

export function HowToImportModal({ visible, software, onClose }: HowToImportModalProps) {
  if (!software) return null;

  const instructions = IMPORT_INSTRUCTIONS[software];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{instructions.title}</Text>
          
          {instructions.warning && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{instructions.warning}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
            <View style={styles.stepsContainer}>
              {instructions.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                Organized for tax prep. Not tax advice. Verify totals and consult a tax professional if needed.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 600,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 20,
  },
  scrollView: {
    maxHeight: 400,
    marginBottom: 20,
  },
  stepsContainer: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  disclaimer: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#1e40af',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
