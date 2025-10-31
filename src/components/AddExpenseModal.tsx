import React, { useState, useEffect, useRef } from 'react';
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
  Image,
} from 'react-native';
import { useCreateExpense, useUpdateExpense, uploadReceipt } from '../hooks/useExpenses';
import { expenseSchema, type ExpenseFormData } from '../lib/validations';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  editingExpense?: any;
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

export function AddExpenseModal({ visible, onClose, editingExpense }: AddExpenseModalProps) {
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const monthYearScrollRef = useRef<ScrollView>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [category, setCategory] = useState<typeof EXPENSE_CATEGORIES[number]>('Other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedCalendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedCalendarDate(newDate);
  };

  const setMonthYear = (month: number, year: number) => {
    const newDate = new Date(year, month, selectedCalendarDate.getDate());
    setSelectedCalendarDate(newDate);
    setShowMonthYearPicker(false);
  };

  const selectDate = (day: number) => {
    const selected = new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), day);
    setSelectedCalendarDate(selected);
  };

  const applySelectedDate = () => {
    // Format date as YYYY-MM-DD in local timezone to avoid timezone shifts
    const year = selectedCalendarDate.getFullYear();
    const month = String(selectedCalendarDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedCalendarDate.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
    setShowDatePicker(false);
  };

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date);
      setCategory(editingExpense.category);
      setDescription(editingExpense.description);
      setAmount(editingExpense.amount.toString());
      setVendor(editingExpense.vendor || '');
      setNotes(editingExpense.notes || '');
    } else {
      resetForm();
    }
  }, [editingExpense, visible]);

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Other');
    setDescription('');
    setAmount('');
    setVendor('');
    setNotes('');
    setReceiptFile(null);
  };

  const handleFileSelect = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          // Check file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            window.alert('File size must be less than 5MB');
            return;
          }
          setReceiptFile(file);
        }
      };
      input.click();
    }
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);

      const formData: ExpenseFormData = {
        date,
        category,
        description,
        amount: parseFloat(amount) || 0,
        vendor: vendor || undefined,
        notes: notes || undefined,
      };

      const validated = expenseSchema.parse(formData);

      let expenseId: string;
      let receiptPath: string | undefined;

      if (editingExpense) {
        const result = await updateExpense.mutateAsync({
          id: editingExpense.id,
          ...validated,
        });
        expenseId = result.id;
      } else {
        const result = await createExpense.mutateAsync(validated);
        expenseId = result.id;
      }

      // Upload receipt if provided
      if (receiptFile && expenseId) {
        receiptPath = await uploadReceipt(expenseId, receiptFile);
        
        // Update expense with receipt path
        await updateExpense.mutateAsync({
          id: expenseId,
          receipt_url: receiptPath,
        });
      }

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Expense submission error:', error);
      if (error.errors) {
        // Zod validation error
        if (Platform.OS === 'web') {
          window.alert(`Validation Error: ${error.errors[0].message}`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${error.message || 'Failed to save expense'}`);
        }
      }
    } finally {
      setUploading(false);
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
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
                onPress={() => {
                  // Initialize calendar to current date or today
                  if (date) {
                    setSelectedCalendarDate(new Date(date));
                  } else {
                    setSelectedCalendarDate(new Date());
                  }
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {date || 'YYYY-MM-DD'}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
              </TouchableOpacity>
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
                    <Text style={[
                      styles.categoryButtonText,
                      category === cat && styles.categoryButtonTextActive,
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., Gas for tour"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
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

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Vendor (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={vendor}
                  onChangeText={setVendor}
                  placeholder="e.g., Shell"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Receipt (Optional)</Text>
              <TouchableOpacity
                style={styles.fileButton}
                onPress={handleFileSelect}
              >
                <Text style={styles.fileButtonText}>
                  {receiptFile ? `📎 ${receiptFile.name}` : '📷 Upload Receipt'}
                </Text>
              </TouchableOpacity>
              {receiptFile && (
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => setReceiptFile(null)}
                >
                  <Text style={styles.removeFileText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this expense..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={uploading || createExpense.isPending || updateExpense.isPending}
            >
              <Text style={styles.submitButtonText}>
                {uploading
                  ? 'Uploading...'
                  : createExpense.isPending || updateExpense.isPending
                  ? 'Saving...'
                  : editingExpense
                  ? 'Update Expense'
                  : 'Add Expense'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.calendarNavButton}>
                <Text style={styles.calendarNavText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMonthYearPicker(true)}>
                <Text style={styles.calendarMonthText}>{formatDateForDisplay(selectedCalendarDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.calendarNavButton}>
                <Text style={styles.calendarNavText}>›</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarGrid}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <View key={day} style={styles.calendarDayHeader}>
                  <Text style={styles.calendarDayHeaderText}>{day}</Text>
                </View>
              ))}
              
              {Array.from({ length: getFirstDayOfMonth(selectedCalendarDate) }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calendarDay} />
              ))}
              
              {Array.from({ length: getDaysInMonth(selectedCalendarDate) }).map((_, i) => {
                const day = i + 1;
                const dateStr = new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), day).toISOString().split('T')[0];
                const selectedDateStr = selectedCalendarDate.toISOString().split('T')[0];
                const isSelected = dateStr === selectedDateStr;
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      isToday && !isSelected && styles.calendarDayToday,
                    ]}
                    onPress={() => selectDate(day)}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      isSelected && styles.calendarDayTextSelected,
                      isToday && !isSelected && styles.calendarDayTextToday,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.calendarFooterButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.calendarFooterButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarFooterButton, styles.calendarFooterButtonPrimary]}
                onPress={applySelectedDate}
              >
                <Text style={[styles.calendarFooterButtonText, styles.calendarFooterButtonTextPrimary]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Month/Year Picker Modal */}
      <Modal
        visible={showMonthYearPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMonthYearPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.monthYearPickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Month & Year</Text>
              <TouchableOpacity onPress={() => setShowMonthYearPicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              ref={monthYearScrollRef}
              style={styles.monthYearScroll}
              onLayout={() => {
                // Auto-scroll to current year when picker opens
                const currentYear = selectedCalendarDate.getFullYear();
                const yearsSinceStart = new Date().getFullYear() + 2 - currentYear;
                const scrollPosition = yearsSinceStart * 280; // Approximate height per year section
                setTimeout(() => {
                  monthYearScrollRef.current?.scrollTo({ y: scrollPosition, animated: false });
                }, 100);
              }}>
              {Array.from({ length: new Date().getFullYear() - 2018 }, (_, i) => new Date().getFullYear() + 2 - i).map((year) => (
                <View key={year} style={styles.yearSection}>
                  <Text style={styles.yearLabel}>{year}</Text>
                  <View style={styles.monthGrid}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, monthIndex) => {
                      const isSelected = 
                        selectedCalendarDate.getFullYear() === year && 
                        selectedCalendarDate.getMonth() === monthIndex;
                      
                      return (
                        <TouchableOpacity
                          key={monthName}
                          style={[
                            styles.monthButton,
                            isSelected && styles.monthButtonSelected,
                          ]}
                          onPress={() => setMonthYear(monthIndex, year)}
                        >
                          <Text style={[
                            styles.monthButtonText,
                            isSelected && styles.monthButtonTextSelected,
                          ]}>
                            {monthName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    fontWeight: '500',
  },
  calendarIcon: {
    fontSize: 20,
  },
  datePickerContainer: {
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
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
  fileButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  removeFileButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removeFileText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
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
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  calendarModalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  calendarDayHeader: {
    width: '14.28%',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  calendarDay: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDaySelected: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#6b7280',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#e5e7eb',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  calendarFooterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  calendarFooterButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  calendarFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  calendarFooterButtonTextPrimary: {
    color: '#fff',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  monthYearPickerContent: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  monthYearScroll: {
    maxHeight: 500,
  },
  yearSection: {
    marginBottom: 24,
  },
  yearLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 12,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  monthButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  monthButtonTextSelected: {
    color: '#fff',
  },
});
