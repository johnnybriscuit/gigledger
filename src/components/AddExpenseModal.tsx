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
  useWindowDimensions,
} from 'react-native';
import { useCreateExpense, useUpdateExpense, uploadReceipt } from '../hooks/useExpenses';
import { expenseSchema, type ExpenseFormData } from '../lib/validations';
import { DatePickerModal } from './ui/DatePickerModal';
import { toUtcDateString, fromUtcDateString } from '../lib/date';
import { DeductibilityHint } from './DeductibilityHint';
import { BusinessUseSlider } from './BusinessUseSlider';
import { checkAndIncrementLimit } from '../utils/limitChecks';
import { getSharedUserId } from '../lib/sharedAuth';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  editingExpense?: any;
  duplicatingExpense?: any;
}

const EXPENSE_CATEGORIES = [
  'Meals & Entertainment',
  'Travel',
  'Lodging',
  'Equipment/Gear',
  'Supplies',
  'Software/Subscriptions',
  'Marketing/Promotion',
  'Professional Fees',
  'Education/Training',
  'Rent/Studio',
  'Other',
] as const;

const CATEGORIES_WITH_BUSINESS_USE = [
  'Software/Subscriptions',
  'Equipment/Gear',
  'Rent/Studio',
];

export function AddExpenseModal({ visible, onClose, editingExpense, duplicatingExpense }: AddExpenseModalProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState<typeof EXPENSE_CATEGORIES[number]>('Other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [businessUsePercent, setBusinessUsePercent] = useState(100);
  const [mealsDeductiblePercent, setMealsDeductiblePercent] = useState<50 | 100>(50);
  const [gigId, setGigId] = useState<string | null>(null);
  const [attachToSameGig, setAttachToSameGig] = useState(false);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  // Date picker handler
  const handleDateChange = (selectedDate: Date) => {
    setDate(toUtcDateString(selectedDate));
  };

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date);
      setCategory(editingExpense.category);
      setDescription(editingExpense.description);
      setAmount(editingExpense.amount.toString());
      setVendor(editingExpense.vendor || '');
      setNotes(editingExpense.notes || '');
      setBusinessUsePercent(editingExpense.business_use_percent || 100);
      // Convert DB value (0-1) to UI value (50 or 100)
      if (editingExpense.meals_percent_allowed !== null && editingExpense.meals_percent_allowed !== undefined) {
        setMealsDeductiblePercent(editingExpense.meals_percent_allowed >= 1 ? 100 : 50);
      } else {
        setMealsDeductiblePercent(50);
      }
    } else if (duplicatingExpense) {
      // Prefill from duplicating expense but set date to today and clear receipt
      setDate(toUtcDateString(new Date()));
      setCategory(duplicatingExpense.category);
      setDescription(duplicatingExpense.description);
      setAmount(duplicatingExpense.amount.toString());
      setVendor(duplicatingExpense.vendor || '');
      setNotes(duplicatingExpense.notes || '');
      setBusinessUsePercent(duplicatingExpense.business_use_percent || 100);
      // Convert DB value (0-1) to UI value (50 or 100)
      if (duplicatingExpense.meals_percent_allowed !== null && duplicatingExpense.meals_percent_allowed !== undefined) {
        setMealsDeductiblePercent(duplicatingExpense.meals_percent_allowed >= 1 ? 100 : 50);
      } else {
        setMealsDeductiblePercent(50);
      }
      // SAFETY: Do NOT copy receipt
      setReceiptFile(null);
      // SAFETY: Do NOT auto-link to gig (default to null, user can toggle on if desired)
      setGigId(null);
      setAttachToSameGig(false);
    } else {
      resetForm();
    }
  }, [editingExpense, duplicatingExpense, visible]);

  const resetForm = () => {
    setDate(toUtcDateString(new Date()));
    setCategory('Other');
    setDescription('');
    setAmount('');
    setVendor('');
    setNotes('');
    setReceiptFile(null);
    setBusinessUsePercent(100);
    setMealsDeductiblePercent(50);
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
        business_use_percent: CATEGORIES_WITH_BUSINESS_USE.includes(category) 
          ? businessUsePercent 
          : undefined,
        // Normalize to 0-1 range for DB (0.5 = 50%, 1.0 = 100%)
        meals_percent_allowed: category === 'Meals & Entertainment' 
          ? mealsDeductiblePercent / 100 
          : undefined,
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
        // Check limit before creating new expense
        const userId = await getSharedUserId();
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const limitCheck = await checkAndIncrementLimit(userId, 'expenses');
        
        if (!limitCheck.allowed) {
          Alert.alert(
            '⚠️ Monthly Limit Reached',
            limitCheck.message + '\n\nUpgrade to Pro for unlimited expenses!',
            [
              { text: 'OK', style: 'cancel' },
            ]
          );
          return;
        }
        
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
        // User-friendly error for constraint violations
        const errorMessage = error.message || '';
        if (errorMessage.includes('meals_percent') || errorMessage.includes('constraint')) {
          if (Platform.OS === 'web') {
            window.alert('Meals expenses must be marked 50% or 100% deductible.');
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert(`Error: ${error.message || 'Failed to save expense'}`);
          }
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
              {editingExpense ? 'Edit Expense' : duplicatingExpense ? 'Repeat Expense (Draft)' : 'Add New Expense'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Section 1: Date + Category */}
            <View style={styles.section}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
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
                <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
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

            </View>

            {/* Section 2: Deductibility Hint + Business Use + Meals Deductible */}
            <View style={styles.hintSection}>
              <DeductibilityHint category={category} />
              
              {CATEGORIES_WITH_BUSINESS_USE.includes(category) && (
                <View style={styles.businessUseContainer}>
                  <Text style={styles.label}>Business Use %</Text>
                  <BusinessUseSlider
                    value={businessUsePercent}
                    onChange={setBusinessUsePercent}
                    amount={parseFloat(amount) || 0}
                  />
                </View>
              )}

              {category === 'Meals & Entertainment' && (
                <View style={styles.mealsDeductibleContainer}>
                  <Text style={styles.label}>Meals Deductible %</Text>
                  <Text style={styles.helperText}>Most meals are 50% deductible. Select 100% only for specific exceptions (e.g., office snacks, team meals).</Text>
                  <View style={styles.mealsToggleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.mealsToggleButton,
                        mealsDeductiblePercent === 50 && styles.mealsToggleButtonActive,
                      ]}
                      onPress={() => setMealsDeductiblePercent(50)}
                    >
                      <Text style={[
                        styles.mealsToggleText,
                        mealsDeductiblePercent === 50 && styles.mealsToggleTextActive,
                      ]}>50%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.mealsToggleButton,
                        mealsDeductiblePercent === 100 && styles.mealsToggleButtonActive,
                      ]}
                      onPress={() => setMealsDeductiblePercent(100)}
                    >
                      <Text style={[
                        styles.mealsToggleText,
                        mealsDeductiblePercent === 100 && styles.mealsToggleTextActive,
                      ]}>100%</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Section 3: Transaction Details */}
            <View style={styles.section}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g., Gas for tour to Chicago - Jan 5-7 weekend run"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={isMobile ? styles.column : styles.row}>
                <View style={[styles.inputGroup, isMobile ? {} : { flex: 0.6 }]}>
                  <Text style={styles.label}>Amount <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, isMobile ? {} : { flex: 0.4 }]}>
                  <Text style={styles.label}>Vendor (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={vendor}
                    onChangeText={setVendor}
                    placeholder="e.g., Shell"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.helperText}>Who did you pay?</Text>
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
            </View>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={uploading || createExpense.isPending || updateExpense.isPending}
            >
              <Text style={styles.submitButtonText} numberOfLines={1} ellipsizeMode="tail">
                {uploading
                  ? 'Uploading...'
                  : createExpense.isPending || updateExpense.isPending
                  ? 'Saving...'
                  : editingExpense
                  ? 'Update'
                  : 'Add'}
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
        title="Select expense date"
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
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
    minHeight: 80,
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
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  hintSection: {
    marginBottom: 20,
  },
  businessUseContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  required: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  column: {
    flexDirection: 'column',
  },
  mealsDeductibleContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mealsToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  mealsToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  mealsToggleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  mealsToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  mealsToggleTextActive: {
    color: '#fff',
  },
});
