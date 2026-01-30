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
import { useCreateExpense, useUpdateExpense, uploadReceipt, createDraftExpense, deleteDraftExpense } from '../hooks/useExpenses';
import { expenseSchema, type ExpenseFormData } from '../lib/validations';
import { DatePickerModal } from './ui/DatePickerModal';
import { toUtcDateString, fromUtcDateString } from '../lib/date';
import { DeductibilityHint } from './DeductibilityHint';
import { BusinessUseSlider } from './BusinessUseSlider';
import { checkAndIncrementLimit } from '../utils/limitChecks';
import { getSharedUserId } from '../lib/sharedAuth';
import { processReceipt, processReceiptBeforeCreation, getConfidenceLabel, getConfidenceColor, type ProcessReceiptResponse } from '../lib/receipts/processReceipt';

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
  
  // Receipt Assist state
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [scanResult, setScanResult] = useState<ProcessReceiptResponse | null>(null);
  const [enableReceiptScan, setEnableReceiptScan] = useState(true);
  const scanAttemptedRef = useRef(false);
  const [dateTouched, setDateTouched] = useState(false);
  const [currentExpenseId, setCurrentExpenseId] = useState<string | null>(null);
  
  // Draft expense state (for receipt-first flow)
  const [draftExpenseId, setDraftExpenseId] = useState<string | null>(null);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  // Date picker handler
  const handleDateChange = (selectedDate: Date) => {
    setDate(toUtcDateString(selectedDate));
    setDateTouched(true);
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

  const resetForm = async () => {
    // Clean up draft expense if exists
    if (draftExpenseId) {
      await deleteDraftExpense(draftExpenseId);
    }
    
    setDate('');
    setCategory('Other');
    setDescription('');
    setAmount('');
    setVendor('');
    setNotes('');
    setReceiptFile(null);
    setBusinessUsePercent(100);
    setMealsDeductiblePercent(50);
    setGigId(null);
    setAttachToSameGig(false);
    setScanResult(null);
    setScanningReceipt(false);
    scanAttemptedRef.current = false;
    setDateTouched(false);
    setCurrentExpenseId(null);
    setDraftExpenseId(null);
  };

  const handleFileSelect = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          // Check file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            window.alert('File size must be less than 5MB');
            return;
          }
          setReceiptFile(file);
          setScanResult(null);
          scanAttemptedRef.current = false;
          
          if (editingExpense) {
            // Edit mode: upload directly to expense
            try {
              setUploading(true);
              const receiptPath = await uploadReceipt(editingExpense.id, file);
              await updateExpense.mutateAsync({
                id: editingExpense.id,
                receipt_url: receiptPath,
                receipt_storage_path: receiptPath,
              });
              scanAttemptedRef.current = true;
              await handleReceiptScan(editingExpense.id);
            } catch (error: any) {
              console.error('Receipt upload error:', error);
              window.alert('Failed to upload receipt: ' + error.message);
            } finally {
              setUploading(false);
            }
          } else {
            // New expense mode: create draft expense, upload receipt, then scan
            if (enableReceiptScan) {
              try {
                setUploading(true);
                setScanningReceipt(true);
                
                console.log('[Receipt] Creating draft expense...');
                // 1. Create draft expense
                const expenseId = await createDraftExpense();
                setDraftExpenseId(expenseId);
                setCurrentExpenseId(expenseId);
                console.log('[Receipt] Draft expense created:', expenseId);
                
                // 2. Upload receipt to user-scoped path
                console.log('[Receipt] Uploading receipt...');
                const receiptPath = await uploadReceipt(expenseId, file);
                console.log('[Receipt] Receipt uploaded to:', receiptPath);
                
                // 3. Update draft with receipt path
                await updateExpense.mutateAsync({
                  id: expenseId,
                  receipt_url: receiptPath,
                  receipt_storage_path: receiptPath,
                  receipt_mime: file.type,
                });
                
                // 4. Scan receipt
                console.log('[Receipt] Scanning receipt...');
                const result = await processReceipt(expenseId);
                setScanResult(result);
                console.log('[Receipt] Scan result:', result);
                
                // 5. Auto-populate fields from scan results
                if (result.success && result.extracted) {
                  if (!vendor && result.extracted.vendor) {
                    setVendor(result.extracted.vendor);
                  }
                  if (!date && result.extracted.date) {
                    setDate(result.extracted.date);
                  }
                  if (!amount && result.extracted.total) {
                    setAmount(result.extracted.total.toString());
                  }
                  if (category === 'Other' && result.suggestion?.category) {
                    const suggestedCategory = result.suggestion.category as typeof EXPENSE_CATEGORIES[number];
                    if (EXPENSE_CATEGORIES.includes(suggestedCategory)) {
                      setCategory(suggestedCategory);
                    }
                  }
                  // Generate default description if empty
                  if (!description && result.extracted.vendor) {
                    const desc = `Receipt: ${result.extracted.vendor}${result.extracted.date ? ' - ' + result.extracted.date : ''}`;
                    setDescription(desc);
                  }
                }
                
                scanAttemptedRef.current = true;
              } catch (error: any) {
                console.error('[Receipt] Upload/scan error:', error);
                setScanResult({
                  success: false,
                  error: error.message,
                  message: 'Failed to scan receipt. You can continue entering details manually.'
                });
                // Clean up draft expense on error
                if (draftExpenseId) {
                  await deleteDraftExpense(draftExpenseId);
                  setDraftExpenseId(null);
                }
              } finally {
                setUploading(false);
                setScanningReceipt(false);
              }
            }
          }
        }
      };
      input.click();
    }
  };

  const handleReceiptScan = async (expenseId: string) => {
    try {
      setScanningReceipt(true);
      setScanResult(null);
      
      const result = await processReceipt(expenseId);
      setScanResult(result);
      
      if (result.success && result.duplicate_suspected) {
        if (Platform.OS === 'web') {
          window.alert('⚠️ This receipt may be a duplicate. Please verify before saving.');
        }
      }
    } catch (error: any) {
      console.error('Receipt scan error:', error);
      setScanResult({
        success: false,
        error: error.message,
        message: 'Unable to scan receipt. You can continue entering expense details manually.'
      });
    } finally {
      setScanningReceipt(false);
    }
  };

  const handleApplySuggestions = async () => {
    if (!scanResult?.success || !scanResult.extracted) return;

    const expenseId = editingExpense?.id || currentExpenseId;
    if (!expenseId) return;

    const { extracted, suggestion } = scanResult;
    const updates: any = {};

    // Apply vendor if empty
    if (!vendor && extracted.vendor) {
      setVendor(extracted.vendor);
      updates.vendor = extracted.vendor;
    }

    // Apply date if not touched by user
    if (!dateTouched && extracted.date) {
      setDate(extracted.date);
      updates.date = extracted.date;
    }

    // Apply amount if empty
    if (!amount && extracted.total) {
      setAmount(extracted.total.toString());
      updates.amount = extracted.total;
    }

    // Apply category suggestion if still on default 'Other'
    if (category === 'Other' && suggestion?.category) {
      const suggestedCategory = suggestion.category as typeof EXPENSE_CATEGORIES[number];
      if (EXPENSE_CATEGORIES.includes(suggestedCategory)) {
        setCategory(suggestedCategory);
        updates.category = suggestedCategory;
      }
    }

    // Persist updates to database
    if (Object.keys(updates).length > 0) {
      try {
        await updateExpense.mutateAsync({
          id: expenseId,
          ...updates,
        });
      } catch (error) {
        console.error('Failed to apply suggestions:', error);
        if (Platform.OS === 'web') {
          window.alert('Failed to apply suggestions. Please try again.');
        }
      }
    }
  };

  const handleRescan = async () => {
    if (!editingExpense?.id) return;
    scanAttemptedRef.current = false;
    await handleReceiptScan(editingExpense.id);
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
        gig_id: gigId || undefined,
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
        setCurrentExpenseId(expenseId);
      } else if (draftExpenseId) {
        // Update draft expense with final values
        const result = await updateExpense.mutateAsync({
          id: draftExpenseId,
          ...validated,
          is_draft: false, // Mark as no longer draft
        });
        expenseId = result.id;
        setCurrentExpenseId(expenseId);
        setDraftExpenseId(null); // Clear draft state
      } else {
        // No draft - create new expense (fallback for non-receipt flow)
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
        setCurrentExpenseId(expenseId);
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
            {/* Section 0: Receipt Upload (Receipt-First UX) */}
            {!editingExpense && (
              <View style={styles.receiptFirstSection}>
                <Text style={styles.receiptFirstTitle}>Upload receipt to auto-fill (optional)</Text>
                <Text style={styles.receiptFirstSubtext}>
                  We'll extract vendor/date/total and suggest a category. You can edit anything before saving.
                </Text>
                <TouchableOpacity
                  style={styles.receiptUploadButton}
                  onPress={handleFileSelect}
                  disabled={uploading}
                >
                  <Text style={styles.receiptUploadButtonText}>
                    {receiptFile ? `📎 ${receiptFile.name}` : '📷 Upload Receipt'}
                  </Text>
                </TouchableOpacity>
                {receiptFile && (
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={async () => {
                      setReceiptFile(null);
                      setScanResult(null);
                      // Clean up draft expense if exists
                      if (draftExpenseId) {
                        await deleteDraftExpense(draftExpenseId);
                        setDraftExpenseId(null);
                      }
                    }}
                  >
                    <Text style={styles.removeFileText}>Remove</Text>
                  </TouchableOpacity>
                )}

                {/* Scanning Panel */}
                {scanningReceipt && (
                  <View style={styles.scanningPanel}>
                    <Text style={styles.scanningText}>🔍 Scanning receipt...</Text>
                  </View>
                )}

                {/* Scan Results */}
                {scanResult && !scanningReceipt && (
                  <View style={[styles.scanResultPanel, scanResult.success ? styles.scanSuccess : styles.scanError]}>
                    {scanResult.success ? (
                      <>
                        <Text style={styles.scanResultTitle}>✅ Receipt Scanned</Text>
                        {scanResult.extracted && (
                          <View style={styles.extractedData}>
                            {scanResult.extracted.vendor && (
                              <Text style={styles.extractedItem}>📍 Vendor: {scanResult.extracted.vendor}</Text>
                            )}
                            {scanResult.extracted.date && (
                              <Text style={styles.extractedItem}>📅 Date: {scanResult.extracted.date}</Text>
                            )}
                            {scanResult.extracted.total && (
                              <Text style={styles.extractedItem}>💰 Total: ${scanResult.extracted.total.toFixed(2)}</Text>
                            )}
                          </View>
                        )}
                        {scanResult.suggestion && (
                          <View style={styles.suggestionBox}>
                            <Text style={styles.suggestionLabel}>Suggested Category:</Text>
                            <Text style={styles.suggestionCategory}>{scanResult.suggestion.category}</Text>
                          </View>
                        )}
                        {scanResult.duplicate_suspected && (
                          <View style={styles.warningBox}>
                            <Text style={styles.warningText}>⚠️ This receipt may be a duplicate</Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.scanErrorTitle}>❌ Scan Failed</Text>
                        <Text style={styles.scanErrorMessage}>{scanResult.message || 'Unable to scan receipt'}</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

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

            {/* Receipt Assist Panel */}
            {scanningReceipt && (
              <View style={styles.scanningPanel}>
                <Text style={styles.scanningText}>🔍 Scanning receipt...</Text>
              </View>
            )}

            {scanResult && !scanningReceipt && (
              <View style={[styles.scanResultPanel, scanResult.success ? styles.scanSuccess : styles.scanError]}>
                {scanResult.success ? (
                  <>
                    <View style={styles.scanResultHeader}>
                      <Text style={styles.scanResultTitle}>✅ Receipt Scanned</Text>
                      {editingExpense && (
                        <TouchableOpacity onPress={handleRescan}>
                          <Text style={styles.rescanButton}>Rescan</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {scanResult.extracted && (
                      <View style={styles.extractedData}>
                        {scanResult.extracted.vendor && (
                          <Text style={styles.extractedItem}>📍 Vendor: {scanResult.extracted.vendor}</Text>
                        )}
                        {scanResult.extracted.date && (
                          <Text style={styles.extractedItem}>📅 Date: {scanResult.extracted.date}</Text>
                        )}
                        {scanResult.extracted.total && (
                          <Text style={styles.extractedItem}>💰 Total: ${scanResult.extracted.total.toFixed(2)}</Text>
                        )}
                      </View>
                    )}

                    {scanResult.suggestion && (
                      <View style={styles.suggestionBox}>
                        <Text style={styles.suggestionLabel}>Suggested Category:</Text>
                        <View style={styles.suggestionRow}>
                          <Text style={styles.suggestionCategory}>{scanResult.suggestion.category}</Text>
                          <Text style={[styles.confidenceBadge, { color: getConfidenceColor(scanResult.suggestion.confidence) }]}>
                            {getConfidenceLabel(scanResult.suggestion.confidence)} confidence
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity style={styles.applySuggestionsButton} onPress={handleApplySuggestions}>
                      <Text style={styles.applySuggestionsText}>Apply Suggestions</Text>
                    </TouchableOpacity>

                    {scanResult.duplicate_suspected && (
                      <Text style={styles.duplicateWarning}>⚠️ This receipt may be a duplicate</Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.scanErrorTitle}>❌ {scanResult.error || 'Scan Failed'}</Text>
                    <Text style={styles.scanErrorMessage}>{scanResult.message}</Text>
                    {editingExpense && (
                      <TouchableOpacity style={styles.retryButton} onPress={handleRescan}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}

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

            {/* Show Done button if scan results are present, otherwise show Save button */}
            {scanResult ? (
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={() => {
                  resetForm();
                  onClose();
                }}
              >
                <Text style={styles.submitButtonText}>Done</Text>
              </TouchableOpacity>
            ) : (
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
            )}
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
  // Receipt Assist styles
  scanningPanel: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  scanResultPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  scanSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  scanError: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  scanResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
  },
  rescanButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  extractedData: {
    marginBottom: 12,
  },
  extractedItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  suggestionBox: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350f',
  },
  confidenceBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  applySuggestionsButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  applySuggestionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  duplicateWarning: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  scanErrorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8,
  },
  scanErrorMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Receipt-First UX styles
  receiptFirstSection: {
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  receiptFirstTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  receiptFirstSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  receiptUploadButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptUploadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
  },
});
