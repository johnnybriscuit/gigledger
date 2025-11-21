import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useCreateMileage, useUpdateMileage, calculateMileageDeduction, IRS_MILEAGE_RATE } from '../hooks/useMileage';
import { mileageSchema, type MileageFormData } from '../lib/validations';
import { DatePickerModal } from './ui/DatePickerModal';
import { toUtcDateString, fromUtcDateString } from '../lib/date';
import { PlaceAutocomplete } from './PlaceAutocomplete';

interface AddMileageModalProps {
  visible: boolean;
  onClose: () => void;
  editingMileage?: any;
}

export function AddMileageModal({ visible, onClose, editingMileage }: AddMileageModalProps) {
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [miles, setMiles] = useState('');
  const [notes, setNotes] = useState('');

  const createMileage = useCreateMileage();
  const updateMileage = useUpdateMileage();

  useEffect(() => {
    if (editingMileage) {
      setDate(editingMileage.date);
      setPurpose(editingMileage.purpose);
      setStartLocation(editingMileage.start_location);
      setEndLocation(editingMileage.end_location);
      setMiles(editingMileage.miles.toString());
      setNotes(editingMileage.notes || '');
    } else {
      resetForm();
    }
  }, [editingMileage, visible]);

  const resetForm = () => {
    setDate(toUtcDateString(new Date()));
    setPurpose('');
    setStartLocation('');
    setEndLocation('');
    setMiles('');
    setNotes('');
  };

  // Date picker handler
  const handleDateChange = (selectedDate: Date) => {
    setDate(toUtcDateString(selectedDate));
  };

  const calculateDeduction = () => {
    const milesNum = parseFloat(miles) || 0;
    return calculateMileageDeduction(milesNum);
  };

  const handleSubmit = async () => {
    try {
      const formData: MileageFormData = {
        date,
        purpose,
        start_location: startLocation,
        end_location: endLocation,
        miles: parseFloat(miles) || 0,
        notes: notes || undefined,
      };

      const validated = mileageSchema.parse(formData);

      if (editingMileage) {
        await updateMileage.mutateAsync({
          id: editingMileage.id,
          ...validated,
        });
      } else {
        await createMileage.mutateAsync(validated);
      }

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Mileage submission error:', error);
      if (error.errors) {
        if (Platform.OS === 'web') {
          window.alert(`Validation Error: ${error.errors[0].message}`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${error.message || 'Failed to save mileage'}`);
        }
      }
    }
  };

  const deduction = calculateDeduction();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingMileage ? 'Edit Trip' : 'Add New Trip'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {date || 'YYYY-MM-DD'}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purpose *</Text>
              <TextInput
                style={styles.input}
                value={purpose}
                onChangeText={setPurpose}
                placeholder="e.g., Drive to gig in Columbus"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <PlaceAutocomplete
              label="Start Location *"
              placeholder="e.g., Cincinnati, OH"
              types="address"
              value={startLocation}
              onChange={setStartLocation}
              onSelect={(item) => setStartLocation(item.description)}
            />

            <PlaceAutocomplete
              label="End Location *"
              placeholder="e.g., Columbus, OH"
              types="address"
              value={endLocation}
              onChange={setEndLocation}
              onSelect={(item) => setEndLocation(item.description)}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Miles *</Text>
              <TextInput
                style={styles.input}
                value={miles}
                onChangeText={setMiles}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.deductionCard}>
              <Text style={styles.deductionLabel}>Tax Deduction</Text>
              <Text style={styles.deductionValue}>
                ${deduction.toFixed(2)}
              </Text>
              <Text style={styles.deductionFormula}>
                {miles || '0'} miles × ${IRS_MILEAGE_RATE}/mile
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this trip..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={createMileage.isPending || updateMileage.isPending}
            >
              <Text style={styles.submitButtonText}>
                {createMileage.isPending || updateMileage.isPending
                  ? 'Saving...'
                  : editingMileage
                  ? 'Update Trip'
                  : 'Add Trip'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        value={date ? fromUtcDateString(date) : null}
        onChange={handleDateChange}
        title="Select trip date"
        showTodayShortcut={true}
      />
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
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  dateButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  calendarIcon: {
    fontSize: 18,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  deductionCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  deductionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  deductionValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  deductionFormula: {
    fontSize: 12,
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
