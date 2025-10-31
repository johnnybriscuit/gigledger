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
} from 'react-native';
import { useCreateGig, useUpdateGig, type GigWithPayer } from '../hooks/useGigs';
import { usePayers } from '../hooks/usePayers';
import { gigSchema, type GigFormData } from '../lib/validations';
import { useWithholding } from '../hooks/useWithholding';
import { formatWithholdingBreakdown } from '../lib/tax/withholding';
import { hasCompletedTaxProfile } from '../services/taxService';
import { InlineExpensesList, type InlineExpense } from './gigs/InlineExpensesList';
import { InlineMileageRow, type InlineMileage } from './gigs/InlineMileageRow';
import { NetBar } from './gigs/NetBar';
import { useTaxEstimate, calculateMileageDeduction } from '../hooks/useTaxEstimate';
import { createGigWithLines } from '../services/gigService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface AddGigModalProps {
  visible: boolean;
  onClose: () => void;
  editingGig?: GigWithPayer | null;
}

const PAYMENT_METHODS = ['Direct Deposit', 'Cash', 'Venmo', 'CashApp', 'Check', 'Other'] as const;
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
];

export function AddGigModal({ visible, onClose, editingGig }: AddGigModalProps) {
  const [payerId, setPayerId] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('US');
  const [grossAmount, setGrossAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const monthYearScrollRef = useRef<ScrollView>(null);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [stateSearch, setStateSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [tips, setTips] = useState('');
  const [fees, setFees] = useState('');
  const [perDiem, setPerDiem] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [invoiceLink, setInvoiceLink] = useState('');
  const [paid, setPaid] = useState(false);
  const [taxesWithheld, setTaxesWithheld] = useState(false);
  const [notes, setNotes] = useState('');
  const [inlineExpenses, setInlineExpenses] = useState<InlineExpense[]>([]);
  const [inlineMileage, setInlineMileage] = useState<InlineMileage | null>(null);

  const { data: payers } = usePayers();
  const createGig = useCreateGig();
  const updateGig = useUpdateGig();
  const queryClient = useQueryClient();
  
  // Fetch user profile for home address
  const { data: profile } = useQuery<{ home_address: string | null }>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('home_address')
        .eq('id', user.id)
        .single();
      
      return data as any;
    },
  });
  
  // Calculate totals for inline items
  const totalExpenses = inlineExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const mileageDeduction = inlineMileage ? calculateMileageDeduction(parseFloat(inlineMileage.miles) || 0) : 0;
  
  // Construct venue address from form fields
  const venueAddress = [location, city, state].filter(Boolean).join(', ');
  
  // Calculate net amount before tax
  const netBeforeTax = (parseFloat(grossAmount) || 0) 
    + (parseFloat(tips) || 0) 
    + (parseFloat(perDiem) || 0) 
    + (parseFloat(otherIncome) || 0) 
    - (parseFloat(fees) || 0)
    - totalExpenses
    - mileageDeduction;
  
  // Get tax estimate
  const { estimate: taxEstimate } = useTaxEstimate(netBeforeTax);
  
  // Legacy withholding for backward compatibility
  const withholdingAmount = netBeforeTax;
  const { breakdown: withholdingBreakdown, loading: withholdingLoading, hasProfile } = useWithholding(withholdingAmount);

  useEffect(() => {
    if (editingGig) {
      setPayerId(editingGig.payer_id);
      setDate(editingGig.date);
      setTitle(editingGig.title);
      setLocation(editingGig.location || '');
      setCity(editingGig.city || '');
      setState(editingGig.state || '');
      setCountry(editingGig.country || 'US');
      setGrossAmount(editingGig.gross_amount.toString());
      setTips(editingGig.tips.toString());
      setFees(editingGig.fees.toString());
      setPerDiem(editingGig.per_diem?.toString() || '0');
      setOtherIncome(editingGig.other_income?.toString() || '0');
      setPaymentMethod(editingGig.payment_method || '');
      setInvoiceLink(editingGig.invoice_link || '');
      setPaid(editingGig.paid || false);
      setTaxesWithheld(editingGig.taxes_withheld || false);
      setNotes(editingGig.notes || '');
    } else {
      resetForm();
    }
  }, [editingGig, visible]);

  const resetForm = () => {
    setPayerId('');
    setDate(new Date().toISOString().split('T')[0]); // Today's date
    setTitle('');
    setLocation('');
    setCity('');
    setState('');
    setCountry('US');
    setGrossAmount('');
    setTips('0');
    setFees('0');
    setPerDiem('0');
    setOtherIncome('0');
    setPaymentMethod('');
    setInvoiceLink('');
    setPaid(false);
    setTaxesWithheld(false);
    setNotes('');
    setInlineExpenses([]);
    setInlineMileage(null);
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateForDisplay = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
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
    setDate(selectedCalendarDate.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  const filteredStates = US_STATES.filter(s => 
    s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const calculateNet = () => {
    const gross = parseFloat(grossAmount) || 0;
    const tipAmount = parseFloat(tips) || 0;
    const feeAmount = parseFloat(fees) || 0;
    const perDiemAmount = parseFloat(perDiem) || 0;
    const otherIncomeAmount = parseFloat(otherIncome) || 0;
    return gross + tipAmount + perDiemAmount + otherIncomeAmount - feeAmount;
  };

  const handleSubmit = async () => {
    try {
      const formData: GigFormData = {
        payer_id: payerId,
        date,
        title,
        location: location || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        gross_amount: parseFloat(grossAmount) || 0,
        tips: parseFloat(tips) || 0,
        fees: parseFloat(fees) || 0,
        per_diem: parseFloat(perDiem) || 0,
        other_income: parseFloat(otherIncome) || 0,
        net_amount: netBeforeTax, // Use calculated net before tax
        payment_method: paymentMethod || undefined,
        invoice_link: invoiceLink || undefined,
        paid,
        taxes_withheld: taxesWithheld,
        notes: notes || undefined,
      };

      console.log('Form data before validation:', formData);
      const validated = gigSchema.parse(formData);
      console.log('Validated data:', validated);

      if (editingGig) {
        await updateGig.mutateAsync({
          id: editingGig.id,
          ...validated,
        });
      } else {
        // Prepare inline expenses data
        const expensesData = inlineExpenses.map(exp => ({
          category: exp.category,
          amount: parseFloat(exp.amount) || 0,
          note: exp.note,
        }));

        // Prepare inline mileage data
        const mileageData = inlineMileage ? {
          miles: parseFloat(inlineMileage.miles) || 0,
          note: inlineMileage.note,
        } : undefined;

        // Create gig with inline items
        await createGigWithLines({
          gig: validated,
          expenses: expensesData,
          mileage: mileageData,
        });
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['mileage'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }

      resetForm();
      onClose();
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        Alert.alert('Validation Error', error.errors[0].message);
      } else {
        Alert.alert('Error', error.message || 'Failed to save gig');
      }
    }
  };

  const netAmount = calculateNet();

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
              {editingGig ? 'Edit Gig' : 'Add New Gig'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payer *</Text>
              <View style={styles.pickerContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.payerScroll}
                >
                  {payers?.map((payer) => (
                    <TouchableOpacity
                      key={payer.id}
                      style={[
                        styles.payerChip,
                        payerId === payer.id && styles.payerChipActive,
                      ]}
                      onPress={() => setPayerId(payer.id)}
                    >
                      <Text style={[
                        styles.payerChipText,
                        payerId === payer.id && styles.payerChipTextActive,
                      ]}>
                        {payer.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {payers && payers.length === 0 && (
                <Text style={styles.helperText}>
                  No payers yet. Add one from the Payers tab first.
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
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
                <Text style={[styles.pickerButtonText, !date && styles.placeholderText]}>
                  {date || 'Select date'}
                </Text>
                <Text style={styles.pickerButtonIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Friday Night Show"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Venue/Location (Optional)</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Blue Note Jazz Club"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g., Cincinnati"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>State</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowStatePicker(true)}
                >
                  <Text style={[styles.pickerButtonText, !state && styles.placeholderText]}>
                    {state ? US_STATES.find(s => s.code === state)?.name || state : 'Select state'}
                  </Text>
                  <Text style={styles.pickerButtonIcon}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Country</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    {COUNTRIES.find(c => c.code === country)?.name || 'United States'}
                  </Text>
                  <Text style={styles.pickerButtonIcon}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Gross Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={grossAmount}
                  onChangeText={setGrossAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Tips</Text>
                <TextInput
                  style={styles.input}
                  value={tips}
                  onChangeText={setTips}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Fees</Text>
                <TextInput
                  style={styles.input}
                  value={fees}
                  onChangeText={setFees}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Per Diem</Text>
                <TextInput
                  style={styles.input}
                  value={perDiem}
                  onChangeText={setPerDiem}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Other Income</Text>
              <TextInput
                style={styles.input}
                value={otherIncome}
                onChangeText={setOtherIncome}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.netAmountCard}>
              <Text style={styles.netAmountLabel}>Net Amount</Text>
              <Text style={styles.netAmountValue}>
                ${netAmount.toFixed(2)}
              </Text>
              <Text style={styles.netAmountFormula}>
                ${grossAmount || '0'} + ${tips || '0'} + ${perDiem || '0'} + ${otherIncome || '0'} - ${fees || '0'}
              </Text>
            </View>

            {/* Withholding Recommendation Card */}
            {withholdingAmount > 0 && withholdingBreakdown && (
              <View style={styles.withholdingCard}>
                <View style={styles.withholdingHeader}>
                  <Text style={styles.withholdingTitle}>💰 Recommended Set-Aside</Text>
                  {!hasProfile && (
                    <TouchableOpacity style={styles.setupTaxButton}>
                      <Text style={styles.setupTaxButtonText}>Setup Tax Info</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.withholdingTotal}>
                  ${withholdingBreakdown.total.toFixed(2)}
                </Text>
                <View style={styles.withholdingBreakdown}>
                  <View style={styles.withholdingRow}>
                    <Text style={styles.withholdingLabel}>Federal (est.):</Text>
                    <Text style={styles.withholdingValue}>
                      ${withholdingBreakdown.federalIncome.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.withholdingRow}>
                    <Text style={styles.withholdingLabel}>SE Tax (est.):</Text>
                    <Text style={styles.withholdingValue}>
                      ${withholdingBreakdown.selfEmployment.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.withholdingRow}>
                    <Text style={styles.withholdingLabel}>State (est.):</Text>
                    <Text style={styles.withholdingValue}>
                      ${withholdingBreakdown.stateIncome.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.withholdingDisclaimer}>
                  Estimates only. Not tax advice.
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.typeButtons}>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.typeButton,
                      paymentMethod === method && styles.typeButtonActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      paymentMethod === method && styles.typeButtonTextActive,
                    ]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Invoice Link (Optional)</Text>
              <TextInput
                style={styles.input}
                value={invoiceLink}
                onChangeText={setInvoiceLink}
                placeholder="https://..."
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setPaid(!paid)}
                >
                  <View style={[styles.checkbox, paid && styles.checkboxChecked]}>
                    {paid && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Paid?</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setTaxesWithheld(!taxesWithheld)}
                >
                  <View style={[styles.checkbox, taxesWithheld && styles.checkboxChecked]}>
                    {taxesWithheld && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Taxes Withheld?</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this gig..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Inline Expenses */}
            <InlineExpensesList 
              expenses={inlineExpenses}
              onChange={setInlineExpenses}
            />

            {/* Inline Mileage */}
            <InlineMileageRow
              mileage={inlineMileage}
              onChange={setInlineMileage}
              homeAddress={profile?.home_address}
              venueAddress={venueAddress || undefined}
            />

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Sticky Net Bar */}
          <NetBar
            grossAmount={parseFloat(grossAmount) || 0}
            tips={parseFloat(tips) || 0}
            perDiem={parseFloat(perDiem) || 0}
            otherIncome={parseFloat(otherIncome) || 0}
            fees={parseFloat(fees) || 0}
            expenses={totalExpenses}
            mileageDeduction={mileageDeduction}
            taxEstimate={taxEstimate}
          />

          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={createGig.isPending || updateGig.isPending}
            >
              <Text style={styles.submitButtonText}>
                {createGig.isPending || updateGig.isPending
                  ? 'Saving...'
                  : editingGig
                  ? 'Update Gig'
                  : 'Add Gig'}
              </Text>
            </TouchableOpacity>
          </View>
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
              {/* Generate years from 2020 to current year + 2 */}
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

      {/* State Picker Modal */}
      <Modal
        visible={showStatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowStatePicker(false);
          setStateSearch('');
        }}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select State</Text>
              <TouchableOpacity onPress={() => {
                setShowStatePicker(false);
                setStateSearch('');
              }}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={stateSearch}
                onChangeText={setStateSearch}
                placeholder="Search states..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            <ScrollView style={styles.pickerScroll}>
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => {
                  setState('');
                  setShowStatePicker(false);
                  setStateSearch('');
                }}
              >
                <Text style={[styles.pickerOptionText, !state && styles.pickerOptionTextActive]}>
                  N/A
                </Text>
              </TouchableOpacity>
              {filteredStates.map((s) => (
                <TouchableOpacity
                  key={s.code}
                  style={styles.pickerOption}
                  onPress={() => {
                    setState(s.code);
                    setShowStatePicker(false);
                    setStateSearch('');
                  }}
                >
                  <Text style={[styles.pickerOptionText, state === s.code && styles.pickerOptionTextActive]}>
                    {s.name} ({s.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCountryPicker(false);
          setCountrySearch('');
        }}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => {
                setShowCountryPicker(false);
                setCountrySearch('');
              }}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search countries..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            <ScrollView style={styles.pickerScroll}>
              {filteredCountries.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={styles.pickerOption}
                  onPress={() => {
                    setCountry(c.code);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                >
                  <Text style={[styles.pickerOptionText, country === c.code && styles.pickerOptionTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
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
    maxHeight: '95%',
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
    minHeight: 100,
    paddingTop: 12,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  payerScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  payerChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  payerChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  payerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  payerChipTextActive: {
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  netAmountCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  netAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  netAmountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  netAmountFormula: {
    fontSize: 12,
    color: '#6b7280',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    fontWeight: '500',
  },
  submitButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  pickerButtonIcon: {
    fontSize: 16,
    color: '#6b7280',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    margin: 20,
    marginBottom: 10,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickDateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
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
  withholdingCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  withholdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  withholdingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
  },
  setupTaxButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setupTaxButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  withholdingTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
  },
  withholdingBreakdown: {
    marginBottom: 12,
  },
  withholdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  withholdingLabel: {
    fontSize: 14,
    color: '#78350f',
  },
  withholdingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350f',
  },
  withholdingDisclaimer: {
    fontSize: 11,
    color: '#92400e',
    fontStyle: 'italic',
    textAlign: 'center',
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
