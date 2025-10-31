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
  Alert,
} from 'react-native';
import {
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  type RecurringExpense,
} from '../hooks/useRecurringExpenses';

interface RecurringExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  editingExpense?: RecurringExpense;
}

const EXPENSE_CATEGORIES = [
  'Rent',
  'Travel',
  'Meals',
  'Lodging',
  'Supplies',
  'Marketing',
  'Education',
  'Software',
  'Fees',
  'Equipment',
  'Other',
] as const;

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function RecurringExpenseModal({ visible, onClose, editingExpense }: RecurringExpenseModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<typeof EXPENSE_CATEGORIES[number]>('Other');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfMonthText, setDayOfMonthText] = useState('1');
  const [monthOfYear, setMonthOfYear] = useState(1); // January
  const [isActive, setIsActive] = useState(true);

  const createRecurring = useCreateRecurringExpense();
  const updateRecurring = useUpdateRecurringExpense();

  useEffect(() => {
    if (editingExpense) {
      setName(editingExpense.name);
      setCategory(editingExpense.category as typeof EXPENSE_CATEGORIES[number]);
      setAmount(editingExpense.amount.toString());
      setVendor(editingExpense.vendor || '');
      setNotes(editingExpense.notes || '');
      setFrequency(editingExpense.frequency);
      setDayOfWeek(editingExpense.day_of_week || 1);
      setDayOfMonth(editingExpense.day_of_month || 1);
      setDayOfMonthText((editingExpense.day_of_month || 1).toString());
      setMonthOfYear(editingExpense.month_of_year || 1);
      setIsActive(editingExpense.is_active);
    } else {
      resetForm();
    }
  }, [editingExpense, visible]);

  const resetForm = () => {
    setName('');
    setCategory('Other');
    setAmount('');
    setVendor('');
    setNotes('');
    setFrequency('monthly');
    setDayOfWeek(1);
    setDayOfMonth(1);
    setDayOfMonthText('1');
    setMonthOfYear(1);
    setIsActive(true);
  };

  const handleSubmit = async () => {
    try {
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter a name for this recurring expense');
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const formData = {
        name: name.trim(),
        category,
        amount: parseFloat(amount),
        vendor: vendor.trim() || null,
        notes: notes.trim() || null,
        frequency,
        day_of_week: frequency === 'weekly' ? dayOfWeek : null,
        day_of_month: frequency === 'monthly' || frequency === 'yearly' ? dayOfMonth : null,
        month_of_year: frequency === 'yearly' ? monthOfYear : null,
        is_active: isActive,
      };

      if (editingExpense) {
        await updateRecurring.mutateAsync({
          id: editingExpense.id,
          ...formData,
        });
      } else {
        await createRecurring.mutateAsync(formData);
      }

      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save recurring expense');
    }
  };

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
              {editingExpense ? 'Edit Recurring Expense' : 'New Recurring Expense'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Studio Rent, Storage Unit"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryButtons}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency *</Text>
              <View style={styles.frequencyButtons}>
                {FREQUENCIES.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.frequencyButton,
                      frequency === freq.value && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setFrequency(freq.value)}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        frequency === freq.value && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {frequency === 'weekly' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Day of Week</Text>
                <View style={styles.dayButtons}>
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayButton,
                        dayOfWeek === day.value && styles.dayButtonActive,
                      ]}
                      onPress={() => setDayOfWeek(day.value)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          dayOfWeek === day.value && styles.dayButtonTextActive,
                        ]}
                      >
                        {day.label.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {(frequency === 'monthly' || frequency === 'yearly') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Day of Month</Text>
                <TextInput
                  style={styles.input}
                  value={dayOfMonthText}
                  onChangeText={(text) => {
                    setDayOfMonthText(text);
                    const num = parseInt(text);
                    if (!isNaN(num) && num >= 1 && num <= 31) {
                      setDayOfMonth(num);
                    }
                  }}
                  onBlur={() => {
                    // On blur, ensure we have a valid value
                    const num = parseInt(dayOfMonthText);
                    if (isNaN(num) || num < 1 || num > 31) {
                      setDayOfMonth(1);
                      setDayOfMonthText('1');
                    } else {
                      setDayOfMonth(num);
                      setDayOfMonthText(num.toString());
                    }
                  }}
                  placeholder="1-31"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
              </View>
            )}

            {frequency === 'yearly' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Month</Text>
                <View style={styles.monthButtons}>
                  {MONTHS.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.monthButton,
                        monthOfYear === month.value && styles.monthButtonActive,
                      ]}
                      onPress={() => setMonthOfYear(month.value)}
                    >
                      <Text
                        style={[
                          styles.monthButtonText,
                          monthOfYear === month.value && styles.monthButtonTextActive,
                        ]}
                      >
                        {month.label.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vendor (Optional)</Text>
              <TextInput
                style={styles.input}
                value={vendor}
                onChangeText={setVendor}
                placeholder="e.g., ABC Storage"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.toggleRow}>
                <Text style={styles.label}>Active</Text>
                <TouchableOpacity
                  style={[styles.toggle, isActive && styles.toggleActive]}
                  onPress={() => setIsActive(!isActive)}
                >
                  <View style={[styles.toggleThumb, isActive && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                {isActive ? 'This expense will appear in quick-add buttons' : 'This expense is paused'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={createRecurring.isPending || updateRecurring.isPending}
            >
              <Text style={styles.submitButtonText}>
                {createRecurring.isPending || updateRecurring.isPending
                  ? 'Saving...'
                  : editingExpense
                  ? 'Update Template'
                  : 'Create Template'}
              </Text>
            </TouchableOpacity>
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
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  frequencyButtonTextActive: {
    color: '#fff',
  },
  dayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  dayButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  monthButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  monthButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  monthButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  monthButtonTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#d1d5db',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
