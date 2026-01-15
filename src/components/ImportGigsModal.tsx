import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { usePayers } from '../hooks/usePayers';
import { useCreateGig, type GigWithPayer } from '../hooks/useGigs';
import { useSubscription } from '../hooks/useSubscription';
import { getGigDisplayName } from '../lib/gigDisplayName';
import { parseGigsCSV, generateGigsTemplate } from '../utils/csvImport';
import { supabase } from '../lib/supabase';
import { getPlanAndUsage, canCreateGigBatch } from '../lib/planLimits';

interface ImportGigsModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgradeNeeded?: () => void;
}

export function ImportGigsModal({ visible, onClose, onUpgradeNeeded }: ImportGigsModalProps) {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  
  const { data: payers } = usePayers();
  const createGig = useCreateGig();

  const handleFileSelect = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const text = await file.text();
          await processCSV(text);
        }
      };
      input.click();
    }
  };

  const processCSV = async (csvText: string) => {
    setImporting(true);
    setResults(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Create payer map
      const payerMap = new Map<string, string>();
      payers?.forEach(payer => {
        payerMap.set(payer.name.toLowerCase(), payer.id);
        payerMap.set(payer.name, payer.id); // Also exact match
      });

      // Parse CSV
      const { data, errors } = parseGigsCSV(csvText, payerMap);

      // Check plan limits BEFORE importing
      const planCheck = await getPlanAndUsage(supabase, user.id);
      const batchCheck = canCreateGigBatch(planCheck, data.length);

      if (!batchCheck.allowed && batchCheck.error) {
        // Hit plan limit - show upgrade prompt
        if (onUpgradeNeeded) {
          onUpgradeNeeded();
        }
        setResults({
          success: 0,
          errors: [batchCheck.error.message],
        });
        setImporting(false);
        return;
      }

      // Import gigs
      let successCount = 0;
      const importErrors: string[] = [...errors];

      for (const gig of data) {
        try {
          await createGig.mutateAsync(gig);
          successCount++;
        } catch (error: any) {
          // Check if it's a plan limit error
          if (error.code === 'GIG_LIMIT_REACHED') {
            importErrors.push(`Plan limit reached. Imported ${successCount} of ${data.length} gigs.`);
            if (onUpgradeNeeded) {
              onUpgradeNeeded();
            }
            break; // Stop importing
          }
          importErrors.push(`Failed to import "${getGigDisplayName(gig)}": ${error.message}`);
        }
      }

      setResults({
        success: successCount,
        errors: importErrors,
      });
    } catch (error: any) {
      setResults({
        success: 0,
        errors: [`Import failed: ${error.message}`],
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    if (Platform.OS === 'web') {
      const template = generateGigsTemplate();
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gigs_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClose = () => {
    setResults(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Gigs from CSV</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!results ? (
              <>
                <Text style={styles.instructions}>
                  Upload a CSV file to import multiple gigs at once.
                </Text>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📋 CSV Format</Text>
                  <Text style={styles.sectionText}>
                    Your CSV should have these columns (in order):
                  </Text>
                  <Text style={styles.columns}>
                    Date, Payer, Title, Location, City, State, Gross, Tips, Fees, 
                    Per Diem, Other Income, Payment Method, Paid, Taxes Withheld, Notes
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>⚠️ Important Notes</Text>
                  <Text style={styles.sectionText}>
                    • Payers must already exist in the app{'\n'}
                    • Payer names must match exactly{'\n'}
                    • Dates should be in YYYY-MM-DD format{'\n'}
                    • Amounts should be numbers (no $ symbols){'\n'}
                    • Paid/Taxes Withheld: use "Yes" or "No"
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.templateButton}
                  onPress={downloadTemplate}
                >
                  <Text style={styles.templateButtonText}>📥 Download Template CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleFileSelect}
                  disabled={importing}
                >
                  {importing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.uploadButtonText}>📤 Upload CSV File</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.results}>
                <Text style={styles.resultsTitle}>Import Complete!</Text>
                
                <View style={styles.successCard}>
                  <Text style={styles.successText}>
                    ✅ Successfully imported {results.success} gig{results.success !== 1 ? 's' : ''}
                  </Text>
                </View>

                {results.errors.length > 0 && (
                  <View style={styles.errorsCard}>
                    <Text style={styles.errorsTitle}>
                      ⚠️ {results.errors.length} Error{results.errors.length !== 1 ? 's' : ''}
                    </Text>
                    {results.errors.map((error, i) => (
                      <Text key={i} style={styles.errorText}>• {error}</Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleClose}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
  },
  content: {
    paddingHorizontal: 20,
  },
  instructions: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  columns: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  templateButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  templateButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    paddingBottom: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  successCard: {
    backgroundColor: '#d1fae5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    textAlign: 'center',
  },
  errorsCard: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#7f1d1d',
    marginBottom: 4,
    lineHeight: 18,
  },
  doneButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
