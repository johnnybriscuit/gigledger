import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { useTour } from '../../hooks/useTours';
import { useCreateSettlement } from '../../hooks/useSettlements';
import { H2, H3, Text, Button } from '../../ui';
import { colors, spacingNum, radiusNum } from '../../styles/theme';
import { formatCurrency, formatDate } from '../../utils/format';
import { generateAllocationPreview, validateCustomAllocations, getAllocationModeLabel } from '../../utils/tourAllocations';
import type { AllocationMode, AllocationJson } from '../../types/tours.types';

interface AddSettlementModalProps {
  visible: boolean;
  tourId: string;
  onClose: () => void;
}

export function AddSettlementModal({ visible, tourId, onClose }: AddSettlementModalProps) {
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [notes, setNotes] = useState('');
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('even');
  const [customAllocations, setCustomAllocations] = useState<AllocationJson>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { data: tour } = useTour(tourId);
  const createSettlement = useCreateSettlement();

  const gigs = useMemo(() => {
    if (!tour?.gigs) return [];
    return tour.gigs.map(g => ({
      id: g.id,
      title: g.title,
      date: g.date,
      gross_amount: g.gross_amount,
      tips: g.tips,
      per_diem: g.per_diem,
      other_income: g.other_income,
    }));
  }, [tour]);

  const allocationPreview = useMemo(() => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0 || gigs.length === 0) return [];

    return generateAllocationPreview(
      amountNum,
      gigs,
      allocationMode,
      allocationMode === 'custom' ? customAllocations : undefined
    );
  }, [amount, gigs, allocationMode, customAllocations]);

  const handleSubmit = async () => {
    const newErrors: { [key: string]: string } = {};

    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0';
    }

    if (allocationMode === 'custom') {
      const validation = validateCustomAllocations(customAllocations, amountNum);
      if (!validation.valid) {
        newErrors.custom = `Custom allocations must sum to ${formatCurrency(amountNum)}. Current difference: ${formatCurrency(validation.difference)}`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const allocationJson = allocationMode === 'custom' || allocationMode === 'weighted' || allocationMode === 'even'
        ? allocationPreview.reduce((acc, p) => {
            acc[p.gigId] = p.allocatedAmount;
            return acc;
          }, {} as AllocationJson)
        : null;

      await createSettlement.mutateAsync({
        tour_id: tourId,
        amount: amountNum,
        payer_name: payerName.trim() || null,
        paid_at: paidAt || null,
        notes: notes.trim() || null,
        allocation_mode: allocationMode,
        allocation_json: allocationJson,
      });

      handleClose();
    } catch (error) {
      console.error('Failed to create settlement:', error);
      setErrors({ submit: 'Failed to create settlement. Please try again.' });
    }
  };

  const handleClose = () => {
    setAmount('');
    setPayerName('');
    setPaidAt('');
    setNotes('');
    setAllocationMode('even');
    setCustomAllocations({});
    setErrors({});
    onClose();
  };

  const handleCustomAllocationChange = (gigId: string, value: string) => {
    const numValue = parseFloat(value);
    setCustomAllocations(prev => ({
      ...prev,
      [gigId]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContainer}
        >
          <View style={styles.modal}>
            <View style={styles.header}>
              <H2>Add Settlement</H2>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {/* Amount */}
              <View style={styles.field}>
                <Text style={styles.label}>Amount *</Text>
                <TextInput
                  style={[styles.input, errors.amount && styles.inputError]}
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
                {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
              </View>

              {/* Payer Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Payer Name</Text>
                <TextInput
                  style={styles.input}
                  value={payerName}
                  onChangeText={setPayerName}
                  placeholder="Optional"
                />
              </View>

              {/* Paid Date */}
              <View style={styles.field}>
                <Text style={styles.label}>Paid Date</Text>
                <TextInput
                  style={styles.input}
                  value={paidAt}
                  onChangeText={setPaidAt}
                  placeholder="YYYY-MM-DD (optional)"
                />
              </View>

              {/* Notes */}
              <View style={styles.field}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Allocation Mode */}
              <View style={styles.field}>
                <Text style={styles.label}>Allocation Mode *</Text>
                <View style={styles.allocationModes}>
                  {(['even', 'weighted', 'custom', 'none'] as AllocationMode[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeButton,
                        allocationMode === mode && styles.modeButtonActive,
                      ]}
                      onPress={() => setAllocationMode(mode)}
                    >
                      <Text
                        style={[
                          styles.modeButtonText,
                          allocationMode === mode && styles.modeButtonTextActive,
                        ]}
                      >
                        {getAllocationModeLabel(mode)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Allocation Preview */}
              {allocationMode !== 'none' && gigs.length > 0 && allocationPreview.length > 0 && (
                <View style={styles.previewSection}>
                  <H3 style={styles.previewTitle}>Allocation Preview</H3>
                  {allocationMode === 'custom' && errors.custom && (
                    <Text style={styles.errorText}>{errors.custom}</Text>
                  )}
                  {allocationPreview.map((preview) => (
                    <View key={preview.gigId} style={styles.previewRow}>
                      <View style={styles.previewGigInfo}>
                        <Text style={styles.previewGigTitle}>{preview.gigTitle}</Text>
                        <Text muted>{formatDate(preview.gigDate)}</Text>
                        {allocationMode === 'weighted' && preview.weight !== undefined && (
                          <Text subtle>Weight: {formatCurrency(preview.weight)}</Text>
                        )}
                      </View>
                      {allocationMode === 'custom' ? (
                        <TextInput
                          style={styles.customInput}
                          value={customAllocations[preview.gigId]?.toString() || '0'}
                          onChangeText={(value) => handleCustomAllocationChange(preview.gigId, value)}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                        />
                      ) : (
                        <Text style={styles.previewAmount}>
                          {formatCurrency(preview.allocatedAmount)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {errors.submit && (
                <Text style={styles.errorText}>{errors.submit}</Text>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Button
                variant="ghost"
                onPress={handleClose}
                disabled={createSettlement.isPending}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                disabled={createSettlement.isPending || !amount}
              >
                {createSettlement.isPending ? 'Creating...' : 'Create Settlement'}
              </Button>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 700,
    maxHeight: '90%',
  },
  modal: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusNum.lg,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacingNum[6],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  closeButton: {
    fontSize: 24,
    color: colors.text.muted,
    padding: spacingNum[2],
  },
  content: {
    padding: spacingNum[6],
    maxHeight: 500,
  },
  field: {
    marginBottom: spacingNum[5],
  },
  label: {
    marginBottom: spacingNum[2],
    fontWeight: '500',
    color: colors.text.DEFAULT,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusNum.md,
    padding: spacingNum[3],
    fontSize: 16,
    color: colors.text.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  inputError: {
    borderColor: colors.danger.DEFAULT,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger.DEFAULT,
    fontSize: 14,
    marginTop: spacingNum[1],
  },
  allocationModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNum[2],
  },
  modeButton: {
    paddingHorizontal: spacingNum[4],
    paddingVertical: spacingNum[2],
    borderRadius: radiusNum.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  modeButtonActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  modeButtonText: {
    color: colors.text.DEFAULT,
    fontSize: 14,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: colors.brand.foreground,
  },
  previewSection: {
    marginTop: spacingNum[6],
    padding: spacingNum[4],
    backgroundColor: colors.surface.muted,
    borderRadius: radiusNum.md,
  },
  previewTitle: {
    marginBottom: spacingNum[4],
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacingNum[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  previewGigInfo: {
    flex: 1,
  },
  previewGigTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.DEFAULT,
  },
  previewAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success.DEFAULT,
  },
  customInput: {
    width: 100,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusNum.sm,
    padding: spacingNum[2],
    fontSize: 14,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacingNum[3],
    padding: spacingNum[6],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
});
