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
import { usePayers, type Payer } from '../hooks/usePayers';
import { useProfile } from '../hooks/useProfile';
import { useSubscription } from '../hooks/useSubscription';
import { getResolvedPlan } from '../lib/businessStructure';
import { gigSchema, type GigFormData } from '../lib/validations';
import { PayerFormModal } from './PayerFormModal';
import { useWithholding } from '../hooks/useWithholding';
import { formatWithholdingBreakdown } from '../lib/tax/withholding';
import { hasCompletedTaxProfile } from '../services/taxService';
import { InlineExpensesList, type InlineExpense } from './gigs/InlineExpensesList';
import { InlineMileageRow, type InlineMileage } from './gigs/InlineMileageRow';
import { VenuePlacesInput } from './VenuePlacesInput';
import { useTaxEstimate, calculateMileageDeduction } from '../hooks/useTaxEstimate';
import { createGigWithLines, updateGigWithLines } from '../services/gigService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getSharedUserId } from '../lib/sharedAuth';
import { useTaxProfile } from '../hooks/useTaxProfile';
import { taxDeltaForGig, formatTaxAmount, formatTaxRate } from '../tax/engine';
import { TaxSummary } from './gigs/TaxSummary';
import type { TaxEstimate } from './gigs/TaxSummary';
import { UpgradeModal } from './UpgradeModal';
import { DatePickerModal } from './ui/DatePickerModal';
import { toUtcDateString, fromUtcDateString } from '../lib/date';

interface AddGigModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToSubscription?: () => void;
  editingGig?: GigWithPayer | null;
  duplicatingGig?: GigWithPayer | null;
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

export function AddGigModal({ visible, onClose, onNavigateToSubscription, editingGig, duplicatingGig }: AddGigModalProps) {
  const [payerId, setPayerId] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('US');
  const [venueDetails, setVenueDetails] = useState<any>(null);
  const [cityDetails, setCityDetails] = useState<any>(null);
  const [venueError, setVenueError] = useState('');
  const [cityError, setCityError] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
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
  const [copyExpenses, setCopyExpenses] = useState(false);
  const [showAddPayerModal, setShowAddPayerModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEditPayerModal, setShowEditPayerModal] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    payerId?: string;
    title?: string;
    date?: string;
    grossAmount?: string;
  }>({});

  const { data: payers } = usePayers();
  const createGig = useCreateGig();
  const updateGig = useUpdateGig();
  const queryClient = useQueryClient();
  
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getSharedUserId().then(setUserId);
  }, []);
  
  // Fetch user profile with home address
  const { data: profile } = useProfile(userId || undefined);
  
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

  const { data: taxProfile } = useTaxProfile();
  const { data: subscription } = useSubscription();
  
  const plan = getResolvedPlan({
    subscriptionTier: subscription?.tier,
    subscriptionStatus: subscription?.status,
  });
  
  const businessStructure = profile?.business_structure || 'individual';
  
  // Get YTD data for tax calculation
  const { data: ytdData } = useQuery<{
    ytdGross: number;
    ytdExpenses: number;
  }>({
    queryKey: ['ytd-tax-data'],
    queryFn: async () => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      
      // Get YTD gigs
      const { data: gigs, error: gigsError } = await supabase
        .from('gigs')
        .select('gross_amount, tips, per_diem, other_income, fees')
        .gte('date', yearStart);
      
      if (gigsError) throw gigsError;
      
      // Get YTD expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', yearStart);
      
      if (expensesError) throw expensesError;
      
      const ytdGross = (gigs || []).reduce((sum, gig: any) => 
        sum + (gig.gross_amount || 0) + (gig.tips || 0) + 
        (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0), 0
      );
      
      const ytdExpenses = (expenses || []).reduce((sum, exp: any) => sum + (exp.amount || 0), 0);
      
      return { ytdGross, ytdExpenses };
    },
  });
  
  // Calculate set-aside for this gig
  const gigSetAside = React.useMemo(() => {
    if (!taxProfile || !ytdData) return null;
    
    const ytdInput = {
      grossIncome: ytdData.ytdGross,
      adjustments: 0,
      netSE: ytdData.ytdGross - ytdData.ytdExpenses,
    };
    
    // Calculate total gross income for this gig (all income sources)
    const gigGrossIncome = (parseFloat(grossAmount) || 0)
      + (parseFloat(tips) || 0)
      + (parseFloat(perDiem) || 0)
      + (parseFloat(otherIncome) || 0);
    
    // Calculate total expenses for this gig (fees + inline expenses + mileage)
    const gigTotalExpenses = (parseFloat(fees) || 0)
      + totalExpenses
      + mileageDeduction;
    
    const gigData = {
      gross: gigGrossIncome,
      expenses: gigTotalExpenses,
    };
    
    // Debug logging
    console.log('Tax Calculation Debug:', {
      ytdGross: ytdData.ytdGross,
      ytdExpenses: ytdData.ytdExpenses,
      ytdNetSE: ytdInput.netSE,
      gigGross: gigData.gross,
      gigExpenses: gigData.expenses,
      gigNet: gigData.gross - gigData.expenses,
      taxProfile: {
        state: taxProfile.state,
        filingStatus: taxProfile.filingStatus,
      }
    });
    
    try {
      const result = taxDeltaForGig(ytdInput, gigData, taxProfile);
      console.log('Tax Result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating tax set-aside:', error);
      return null;
    }
  }, [taxProfile, ytdData, grossAmount, tips, perDiem, otherIncome, fees, totalExpenses, mileageDeduction]);

  // Handle duplicating gig (separate from editing)
  useEffect(() => {
    if (duplicatingGig) {
      setPayerId(duplicatingGig.payer_id);
      setDate(toUtcDateString(new Date())); // Default to today for duplicates
      setTitle(duplicatingGig.title || '');
      setLocation(duplicatingGig.location || '');
      setCity(duplicatingGig.city || '');
      const stateValue = (duplicatingGig as any).state_code || duplicatingGig.state || '';
      setState(stateValue);
      const countryValue = (duplicatingGig as any).country_code || duplicatingGig.country || 'US';
      setCountry(countryValue);
      setGrossAmount(duplicatingGig.gross_amount.toString());
      setTips(duplicatingGig.tips.toString());
      setFees(duplicatingGig.fees.toString());
      setPerDiem(duplicatingGig.per_diem?.toString() || '0');
      setOtherIncome(duplicatingGig.other_income?.toString() || '0');
      setPaymentMethod(duplicatingGig.payment_method || '');
      setInvoiceLink('');
      setPaid(false); // Reset paid status for duplicates
      setTaxesWithheld(false);
      setNotes(duplicatingGig.notes || '');
      
      // Load gig-related expenses (for preview, won't be copied unless toggle is ON)
      const loadGigExpenses = async () => {
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('gig_id', duplicatingGig.id)
          .order('created_at', { ascending: true });
        
        if (!error && expenses && expenses.length > 0) {
          // Store expenses but don't set them yet (user must toggle)
          const expensesData: InlineExpense[] = expenses.map((exp: any) => ({
            id: `temp-${Math.random()}`, // Temporary ID for new expenses
            category: exp.category,
            description: exp.description,
            amount: exp.amount.toString(),
            note: exp.notes || '',
          }));
          // Store in state for conditional copying
          if (copyExpenses) {
            setInlineExpenses(expensesData);
          }
        }
      };
      
      // Load gig-related mileage
      const loadGigMileage = async () => {
        const { data: mileage, error } = await supabase
          .from('mileage')
          .select('*')
          .eq('gig_id', duplicatingGig.id)
          .single();
        
        if (!error && mileage) {
          setInlineMileage({
            miles: mileage.miles.toString(),
            note: mileage.notes || '',
          });
        }
      };
      
      loadGigExpenses();
      loadGigMileage();
    }
  }, [duplicatingGig, visible, copyExpenses]);

  useEffect(() => {
    if (editingGig) {
      setPayerId(editingGig.payer_id);
      setDate(editingGig.date);
      setTitle(editingGig.title || '');
      setLocation(editingGig.location || '');
      setCity(editingGig.city || '');
      // Prefer state_code if available, fallback to state (for old gigs)
      const stateValue = (editingGig as any).state_code || editingGig.state || '';
      setState(stateValue);
      const countryValue = (editingGig as any).country_code || editingGig.country || 'US';
      setCountry(countryValue);
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
      
      // Load gig-related expenses
      const loadGigExpenses = async () => {
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('gig_id', editingGig.id)
          .order('created_at', { ascending: true });
        
        if (!error && expenses) {
          // Convert expenses to InlineExpense format
          const inlineExpensesData: InlineExpense[] = expenses.map((exp: any) => ({
            id: exp.id, // Use actual expense ID
            category: exp.category,
            description: exp.description,
            amount: exp.amount.toString(),
            note: exp.notes || '',
          }));
          setInlineExpenses(inlineExpensesData);
        }
      };
      
      // Load gig-related mileage
      const loadGigMileage = async () => {
        const { data: mileage, error } = await supabase
          .from('mileage')
          .select('*')
          .eq('gig_id', editingGig.id)
          .single();
        
        if (!error && mileage) {
          setInlineMileage({
            miles: mileage.miles.toString(),
            note: mileage.notes || '',
          });
        }
      };
      
      loadGigExpenses();
      loadGigMileage();
    } else if (!duplicatingGig) {
      resetForm();
    }
  }, [editingGig, visible]);

  const resetForm = () => {
    setPayerId('');
    setDate(toUtcDateString(new Date())); // Today's date in UTC format
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
    setCopyExpenses(false);
  };

  // Date picker handler
  const handleDateChange = (selectedDate: Date) => {
    setDate(toUtcDateString(selectedDate));
  };

  const filteredStates = US_STATES.filter(s => 
    s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Calculate total gig pay (gross income before expenses & taxes)
  const calculateTotalGigPay = () => {
    const gross = parseFloat(grossAmount) || 0;
    const tipAmount = parseFloat(tips) || 0;
    const feeAmount = parseFloat(fees) || 0;
    const perDiemAmount = parseFloat(perDiem) || 0;
    const otherIncomeAmount = parseFloat(otherIncome) || 0;
    return gross + tipAmount + perDiemAmount + otherIncomeAmount - feeAmount;
  };

  // Generate human-readable breakdown (omit zero values)
  const generatePayBreakdown = () => {
    const gross = parseFloat(grossAmount) || 0;
    const tipAmount = parseFloat(tips) || 0;
    const feeAmount = parseFloat(fees) || 0;
    const perDiemAmount = parseFloat(perDiem) || 0;
    const otherIncomeAmount = parseFloat(otherIncome) || 0;

    const parts: string[] = [];
    
    if (gross > 0) parts.push(`Base $${gross.toFixed(2)}`);
    if (tipAmount > 0) parts.push(`Tips $${tipAmount.toFixed(2)}`);
    if (perDiemAmount > 0) parts.push(`Per Diem $${perDiemAmount.toFixed(2)}`);
    if (otherIncomeAmount > 0) parts.push(`Other $${otherIncomeAmount.toFixed(2)}`);
    if (feeAmount > 0) parts.push(`Fees −$${feeAmount.toFixed(2)}`);

    if (parts.length === 0) return '$0.00';
    if (parts.length === 1 && feeAmount === 0) return parts[0];
    
    const total = calculateTotalGigPay();
    return `${parts.join(' + ').replace(' + Fees', ' − Fees')} = $${total.toFixed(2)}`;
  };

  const validateForm = () => {
    const errors: typeof fieldErrors = {};
    
    if (!payerId) {
      errors.payerId = 'Please select a payer';
    }
    if (!title.trim()) {
      errors.title = 'Show title is required';
    }
    if (!date) {
      errors.date = 'Date is required';
    }
    if (!grossAmount || parseFloat(grossAmount) < 0) {
      errors.grossAmount = 'Gross amount must be 0 or greater';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      Alert.alert(
        'Missing Required Fields',
        'Please fill in all required fields marked with *',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const formData: any = {
        payer_id: payerId,
        date,
        title: title || undefined,
        location: location || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        country_code: country || 'US', // Map to database column
        state_code: state && US_STATES.find(s => s.code === state || s.name === state)?.code, // Always use 2-letter code
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
      let validated;
      try {
        validated = gigSchema.parse(formData);
        console.log('Validated data:', validated);
      } catch (validationError: any) {
        console.error('Validation failed:', validationError);
        if (validationError.errors) {
          console.error('Validation errors:', validationError.errors);
          Alert.alert('Validation Error', validationError.errors[0].message);
        } else {
          Alert.alert('Validation Error', validationError.message || 'Invalid form data');
        }
        return;
      }

      // Prepare inline expenses data (used for both create and edit)
      const expensesData = inlineExpenses.map(exp => ({
        category: exp.category,
        description: exp.description,
        amount: parseFloat(exp.amount) || 0,
        note: exp.note,
      }));

      // Prepare inline mileage data (used for both create and edit)
      const mileageData = inlineMileage ? {
        miles: parseFloat(inlineMileage.miles) || 0,
        note: inlineMileage.note,
      } : undefined;

      if (editingGig) {
        // Update gig with inline items
        await updateGigWithLines({
          gigId: editingGig.id,
          gig: validated,
          expenses: expensesData,
          mileage: mileageData,
        });
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['mileage'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } else {
        // Create gig with inline items
        console.log('Creating gig with data:', {
          gig: validated,
          expenses: expensesData,
          mileage: mileageData,
        });
        
        try {
          const result = await createGigWithLines({
            gig: validated,
            expenses: expensesData,
            mileage: mileageData,
          });
          console.log('Gig created successfully:', result);
        } catch (createError: any) {
          console.error('Error creating gig:', createError);
          throw createError;
        }
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['mileage'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }

      // Show success message
      Alert.alert(
        '✓ Success',
        editingGig ? 'Gig updated successfully!' : 'Gig created successfully!',
        [{ text: 'OK' }]
      );
      
      resetForm();
      setFieldErrors({});
      onClose();
    } catch (error: any) {
      if (error.code === 'FREE_PLAN_LIMIT_REACHED') {
        setShowUpgradeModal(true);
        return;
      }
      if (error.errors) {
        // Zod validation error
        Alert.alert('Validation Error', error.errors[0].message);
      } else {
        Alert.alert('Error', error.message || 'Failed to save gig');
      }
    }
  };

  const totalGigPay = calculateTotalGigPay();

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
              {editingGig ? 'Edit Gig' : duplicatingGig ? 'Repeat Gig (Draft)' : 'Add New Gig'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payer *</Text>
              <Text style={styles.helperText}>Who is paying you for this gig?</Text>
              
              {payers && payers.length === 0 ? (
                <View style={styles.emptyPayerContainer}>
                  <Text style={styles.emptyPayerText}>No payers yet</Text>
                  <TouchableOpacity
                    style={styles.addPayerButton}
                    onPress={() => setShowAddPayerModal(true)}
                  >
                    <Text style={styles.addPayerButtonText}>+ Add New Payer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.pickerButton, fieldErrors.payerId && styles.inputError]}
                    onPress={() => setShowPayerPicker(true)}
                  >
                    <Text style={[styles.pickerButtonText, !payerId && styles.placeholderText]}>
                      {payerId 
                        ? payers?.find(p => p.id === payerId)?.name || 'Select payer'
                        : 'Select payer'}
                    </Text>
                    <Text style={styles.pickerButtonIcon}>▼</Text>
                  </TouchableOpacity>
                  {fieldErrors.payerId && (
                    <Text style={styles.errorText}>⚠️ {fieldErrors.payerId}</Text>
                  )}
                  
                  <View style={styles.payerActions}>
                    <TouchableOpacity
                      style={styles.addPayerLink}
                      onPress={() => setShowAddPayerModal(true)}
                    >
                      <Text style={styles.addPayerLinkText}>+ Add new payer</Text>
                    </TouchableOpacity>
                    
                    {payerId && (
                      <TouchableOpacity
                        style={styles.editPayerLink}
                        onPress={() => {
                          const payer = payers?.find(p => p.id === payerId);
                          if (payer) {
                            setEditingPayer(payer);
                            setShowEditPayerModal(true);
                          }
                        }}
                      >
                        <Text style={styles.editPayerLinkText}>Edit payer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {!payerId && (
                    <View style={styles.reminderBox}>
                      <Text style={styles.reminderIcon}>⚠️</Text>
                      <Text style={styles.reminderText}>
                        Please select a payer (who's paying you for this gig)
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Venue and City at top so dropdowns aren't covered by fields below */}
            <View style={styles.inputGroup}>
              <VenuePlacesInput
                label="Venue/Location (Optional)"
                placeholder="Search for a venue..."
                types="establishment"
                value={location}
                onChange={(text: string) => {
                  setLocation(text);
                  setVenueDetails(null);
                  setVenueError('');
                }}
                onSelect={async (item: { description: string; place_id: string }) => {
                  setLocation(item.description);
                  setVenueError('');
                  
                  // Fetch place details
                  try {
                    const response = await fetch(`/api/places/details?place_id=${item.place_id}`, {
                      credentials: 'include',
                    });
                    
                    if (response.ok) {
                      const details = await response.json();
                      setVenueDetails(details);
                      
                      // Auto-fill city, state, country if not already set
                      if (!city && details.parts.city) {
                        setCity(details.parts.city);
                      }
                      if (!state && details.parts.state) {
                        setState(details.parts.state);
                      }
                      if (details.parts.country) {
                        setCountry(details.parts.country);
                      }
                    }
                  } catch (error) {
                    console.error('Error fetching venue details:', error);
                  }
                }}
                error={venueError}
                locationBias={cityDetails?.location}
              />
            </View>

            <View style={styles.inputGroup}>
              <VenuePlacesInput
                label="City"
                placeholder="Search for a city..."
                types="(cities)"
                value={city}
                onChange={(text: string) => {
                  setCity(text);
                  setCityDetails(null);
                  setCityError('');
                }}
                onSelect={async (item: { description: string; place_id: string }) => {
                  setCity(item.description);
                  setCityError('');
                  
                  // Fetch place details
                  try {
                    const response = await fetch(`/api/places/details?place_id=${item.place_id}`, {
                      credentials: 'include',
                    });
                    
                    if (response.ok) {
                      const details = await response.json();
                      setCityDetails(details);
                      
                      // Auto-fill state and country
                      if (details.parts.state) {
                        setState(details.parts.state);
                      }
                      if (details.parts.country) {
                        setCountry(details.parts.country);
                      }
                    }
                  } catch (error) {
                    console.error('Error fetching city details:', error);
                  }
                }}
                error={cityError}
              />
            </View>

            <View style={[styles.inputGroup, { zIndex: 0 }]}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.pickerButtonText, !date && styles.placeholderText]}>
                  {date || 'Select date'}
                </Text>
                <Text style={styles.pickerButtonIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { zIndex: 0 }]}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={[styles.input, fieldErrors.title && styles.inputError]}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (fieldErrors.title && text.trim()) {
                    setFieldErrors({ ...fieldErrors, title: undefined });
                  }
                }}
                placeholder="e.g., Friday Night Show (optional)"
                placeholderTextColor="#9ca3af"
              />
              {fieldErrors.title && (
                <Text style={styles.errorText}>⚠️ {fieldErrors.title}</Text>
              )}
            </View>

            <View style={[styles.row, { zIndex: 0 }]}>
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

            <View style={[styles.row, { zIndex: 0 }]}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Gross Amount *</Text>
                <TextInput
                  style={[styles.input, fieldErrors.grossAmount && styles.inputError]}
                  value={grossAmount}
                  onChangeText={(text) => {
                    setGrossAmount(text);
                    if (fieldErrors.grossAmount && text && parseFloat(text) >= 0) {
                      setFieldErrors({ ...fieldErrors, grossAmount: undefined });
                    }
                  }}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
                {fieldErrors.grossAmount && (
                  <Text style={styles.errorText}>⚠️ {fieldErrors.grossAmount}</Text>
                )}
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
              <View style={styles.netAmountHeader}>
                <Text style={styles.netAmountLabel}>Total gig pay</Text>
                <Text style={styles.netAmountSubtitle}>(before expenses & taxes)</Text>
              </View>
              <Text style={styles.netAmountValue}>
                ${totalGigPay.toFixed(2)}
              </Text>
              <Text style={styles.netAmountFormula}>
                {generatePayBreakdown()}
              </Text>
            </View>

            {/* Withholding Recommendation Card - Only show if no new tax profile */}
            {withholdingAmount > 0 && withholdingBreakdown && !gigSetAside && (
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

            {/* Copy Expenses Toggle (only shown when duplicating) */}
            {duplicatingGig && (
              <View style={styles.inputGroup}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <Text style={styles.label}>Copy gig-specific expenses?</Text>
                    <Text style={styles.helperText}>Expenses from the original gig (e.g., subcontractor payouts)</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, copyExpenses && styles.toggleActive]}
                    onPress={() => setCopyExpenses(!copyExpenses)}
                  >
                    <View style={[styles.toggleThumb, copyExpenses && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Inline Expenses */}
            <InlineExpensesList 
              expenses={inlineExpenses}
              onChange={setInlineExpenses}
            />

            {/* Inline Mileage */}
            <InlineMileageRow
              mileage={inlineMileage}
              onChange={setInlineMileage}
              homeAddress={profile ? {
                full: profile.home_address_full,
                lat: profile.home_address_lat,
                lng: profile.home_address_lng,
              } : null}
              venueLocation={venueDetails?.location || cityDetails?.location || null}
            />

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Net After Tax Section */}
          {gigSetAside && taxProfile && (
            <View style={styles.netAfterTaxSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Net After Tax</Text>
              </View>
              <TaxSummary
                gross={parseFloat(grossAmount) || 0}
                tips={parseFloat(tips) || 0}
                perDiem={parseFloat(perDiem) || 0}
                fees={parseFloat(fees) || 0}
                otherIncome={parseFloat(otherIncome) || 0}
                gigExpenses={totalExpenses}
                mileageDeduction={mileageDeduction}
                filingStatus={taxProfile.filingStatus}
                state={taxProfile.state}
                taxYear={2025}
                estimate={{
                  federal: gigSetAside.breakdown.federal,
                  state: gigSetAside.breakdown.state + gigSetAside.breakdown.local,
                  se: gigSetAside.breakdown.seTax,
                  setAside: gigSetAside.amount,
                  setAsidePct: gigSetAside.rate,
                  thresholdNote: gigSetAside.breakdown.federal === 0 ? 'below $30k threshold' : undefined,
                }}
                isExpanded={showTaxBreakdown}
                onToggle={setShowTaxBreakdown}
                business_structure={businessStructure}
                plan={plan}
              />
            </View>
          )}

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

      {/* Payer Picker Modal */}
      <Modal
        visible={showPayerPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayerPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Payer</Text>
              <TouchableOpacity onPress={() => setShowPayerPicker(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalList}>
              {payers?.map((payer) => (
                <TouchableOpacity
                  key={payer.id}
                  style={[
                    styles.pickerModalItem,
                    payerId === payer.id && styles.pickerModalItemActive,
                  ]}
                  onPress={() => {
                    setPayerId(payer.id);
                    setShowPayerPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerModalItemText,
                    payerId === payer.id && styles.pickerModalItemTextActive,
                  ]}>
                    {payer.name}
                  </Text>
                  {payerId === payer.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Payer Modal */}
      <PayerFormModal
        visible={showAddPayerModal}
        onClose={() => setShowAddPayerModal(false)}
        onSuccess={(newPayerId) => {
          setPayerId(newPayerId);
          setShowAddPayerModal(false);
        }}
      />

      {/* Edit Payer Modal */}
      <PayerFormModal
        visible={showEditPayerModal}
        onClose={() => {
          setShowEditPayerModal(false);
          setEditingPayer(null);
        }}
        editingPayer={editingPayer}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          onClose();
          onNavigateToSubscription?.();
        }}
        title="You've reached the Free plan limit"
        message="Upgrade to Pro to unlock unlimited gigs, expenses, invoices, and exports. Cancel anytime. Your data stays yours."
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        value={date ? fromUtcDateString(date) : null}
        onChange={handleDateChange}
        title="Select gig date"
        showTodayShortcut={true}
      />

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
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
  reminderBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderIcon: {
    fontSize: 16,
  },
  reminderText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
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
  netAmountHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  netAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  netAmountSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
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
  taxSetAsideContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  taxSetAsideCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  taxSetAsideLeft: {
    flex: 1,
  },
  taxSetAsideLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 2,
  },
  taxSetAsideHint: {
    fontSize: 11,
    color: '#6b7280',
  },
  taxSetAsideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taxSetAsideAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e40af',
  },
  taxSetAsideRate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  taxBreakdown: {
    backgroundColor: '#fff',
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
    gap: 6,
  },
  taxBreakdownItem: {
    fontSize: 12,
    color: '#374151',
  },
  taxBreakdownNote: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  taxBreakdownSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  taxBreakdownExplainer: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  taxBreakdownDisclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
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
  // Payer dropdown styles
  emptyPayerContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyPayerText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  addPayerButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addPayerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  payerActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  addPayerLink: {
    paddingVertical: 4,
  },
  addPayerLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  editPayerLink: {
    paddingVertical: 4,
  },
  editPayerLinkText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  // Payer picker modal styles
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    width: '100%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pickerModalList: {
    maxHeight: 400,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerModalItemActive: {
    backgroundColor: '#eff6ff',
  },
  pickerModalItemText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerModalItemTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Net After Tax section styles
  netAfterTaxSection: {
    marginTop: 0,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  // Toggle styles
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flex: 1,
    marginRight: 16,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});
