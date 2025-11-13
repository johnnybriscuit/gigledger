import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useCreateGig } from '../hooks/useGigs';
import { supabase } from '../lib/supabase';
import { useTaxEstimate } from '../hooks/useTaxEstimate';
import { useQueryClient } from '@tanstack/react-query';

interface OnboardingAddGigProps {
  payerId: string | null;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function OnboardingAddGig({ payerId, onComplete, onSkip, onBack }: OnboardingAddGigProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [fees, setFees] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [taxesWithheld, setTaxesWithheld] = useState(false);
  const createGig = useCreateGig();
  const queryClient = useQueryClient();

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedCalendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedCalendarDate(newDate);
  };

  const selectDate = (day: number) => {
    const selected = new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), day);
    setSelectedCalendarDate(selected);
  };

  const applySelectedDate = () => {
    setDate(selectedCalendarDate.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  // Calculate live tax estimate
  const netBeforeTax = useMemo(() => {
    const gross = parseFloat(grossAmount) || 0;
    const fee = parseFloat(fees) || 0;
    const other = parseFloat(otherIncome) || 0;
    return gross + other - fee;
  }, [grossAmount, fees, otherIncome]);

  const { estimate: taxEstimate } = useTaxEstimate(netBeforeTax);
  const estimatedNet = netBeforeTax - (taxEstimate?.total || 0);

  const handleComplete = async () => {
    if (!payerId) {
      Alert.alert('Error', 'No payer selected. Please go back and add a payer first.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a gig title');
      return;
    }

    if (!grossAmount || parseFloat(grossAmount) <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid amount');
      return;
    }

    try {
      await createGig.mutateAsync({
        payer_id: payerId,
        date,
        title: title.trim(),
        gross_amount: parseFloat(grossAmount),
        tips: 0,
        fees: parseFloat(fees) || 0,
        per_diem: 0,
        other_income: parseFloat(otherIncome) || 0,
        net_amount: netBeforeTax,
        paid: false,
        taxes_withheld: taxesWithheld,
      });

      // Mark onboarding as complete
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id);
      }

      // Invalidate all queries to ensure dashboard loads with fresh data
      queryClient.invalidateQueries();

      onComplete();
    } catch (error: any) {
      console.error('[OnboardingAddGig] Error creating gig:', error);
      Alert.alert('Error', error.message || 'Failed to create gig');
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as complete even if skipped
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id);
      }
      
      // Invalidate all queries to ensure dashboard loads with fresh data
      queryClient.invalidateQueries();
      
      onSkip();
    } catch (error) {
      console.error('[OnboardingAddGig] Error marking onboarding complete:', error);
      onSkip(); // Skip anyway
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Log your first gig 💰</Text>
          <Text style={styles.subtitle}>
            Use a real or sample gig so you can see your true net after expenses & taxes.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                if (date) {
                  setSelectedCalendarDate(new Date(date));
                } else {
                  setSelectedCalendarDate(new Date());
                }
                setShowDatePicker(true);
              }}
              disabled={createGig.isPending}
            >
              <Text style={[styles.dateButtonText, !date && styles.placeholderText]}>
                {date || 'Select date'}
              </Text>
              <Text style={styles.dateButtonIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gig Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Friday Night Show"
              value={title}
              onChangeText={setTitle}
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gross Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={grossAmount}
              onChangeText={setGrossAmount}
              keyboardType="decimal-pad"
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fees (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={fees}
              onChangeText={setFees}
              keyboardType="decimal-pad"
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Other Income (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={otherIncome}
              onChangeText={setOtherIncome}
              keyboardType="decimal-pad"
              editable={!createGig.isPending}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setTaxesWithheld(!taxesWithheld)}
            disabled={createGig.isPending}
          >
            <View style={[styles.checkbox, taxesWithheld && styles.checkboxChecked]}>
              {taxesWithheld && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Taxes withheld?</Text>
          </TouchableOpacity>

          {/* Live Summary Card */}
          {netBeforeTax > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your estimated take-home for this gig</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gross:</Text>
                <Text style={styles.summaryValue}>${(parseFloat(grossAmount) || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Est. taxes to set aside:</Text>
                <Text style={styles.summaryValue}>${(taxEstimate?.total || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={styles.summaryLabelTotal}>Est. net after taxes & fees:</Text>
                <Text style={styles.summaryValueTotal}>${estimatedNet.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={createGig.isPending}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={createGig.isPending}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.completeButton, createGig.isPending && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={createGig.isPending}
        >
          {createGig.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.completeButtonText}>Save gig & go to your dashboard</Text>
          )}
        </TouchableOpacity>
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
              <Text style={styles.calendarMonthText}>{formatDateForDisplay(selectedCalendarDate)}</Text>
              <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.calendarNavButton}>
                <Text style={styles.calendarNavText}>›</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarGrid}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
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
                <Text style={[styles.calendarFooterButtonText, styles.calendarFooterButtonTextPrimary]}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 32,
  },
  step: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  summaryRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  summaryValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Date Button
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  dateButtonIcon: {
    fontSize: 18,
  },
  // Date Picker Modal
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarNavText: {
    fontSize: 24,
    color: '#3b82f6',
    fontWeight: '600',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calendarDayHeader: {
    width: '13.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarDay: {
    width: '13.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#3b82f6',
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#111827',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarDayTextToday: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  calendarFooterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  calendarFooterButtonPrimary: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  calendarFooterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarFooterButtonTextPrimary: {
    color: '#fff',
  },
});
