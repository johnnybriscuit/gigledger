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
import { useResponsiveButtonText, BUTTON_TEXT } from '../hooks/useResponsiveButtonText';
import { getResolvedPlan } from '../lib/businessStructure';
import { gigSchema, type GigFormData } from '../lib/validations';
import { PayerFormModal } from './PayerFormModal';
import { useWithholding } from '../hooks/useWithholding';
import { formatWithholdingBreakdown } from '../lib/tax/withholding';
import { hasCompletedTaxProfile } from '../services/taxService';
import { InlineExpensesList, type InlineExpense } from './gigs/InlineExpensesList';
import { InlineMileageRow } from './gigs/InlineMileageRow';
import { InlineSubcontractorPayments, type InlineSubcontractorPayment } from './gigs/InlineSubcontractorPayments';
import { SubcontractorFormModal } from './SubcontractorFormModal';
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
import { StickySummary } from './gigs/StickySummary';
import { Accordion } from './ui/Accordion';
import { UpgradeModal } from './UpgradeModal';
import { DatePickerModal } from './ui/DatePickerModal';
import { toUtcDateString, fromUtcDateString } from '../lib/date';
import { checkAndIncrementLimit } from '../utils/limitChecks';
import { getEffectiveTaxTreatment, getTaxTreatmentLabel, getTaxTreatmentShortLabel, getDefaultAmountType } from '../lib/taxTreatment';
import { resolveAddressDetails, resolvePlaceDetails } from '../lib/placeDetails';
import { colors } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import {
  calculateInlineMileage,
  inferStoredMileageAutoCalculated,
  inferStoredMileageRoundTrip,
  syncAutoCalculatedInlineMileageRoundTrip,
  type InlineMileage,
} from './gigs/inlineMileage';
import {
  trackGigModalOpened,
  trackGigValidationFailed,
} from '../lib/analytics';

interface AddGigModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToExpenses?: () => void;
  onNavigateToMileage?: () => void;
  editingGig?: GigWithPayer | null;
  duplicatingGig?: GigWithPayer | null;
  source?: 'dashboard' | 'gigs';
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

type MileageCalculationStatus =
  | 'idle'
  | 'missing-home'
  | 'missing-venue'
  | 'calculating'
  | 'ready'
  | 'error';

function hasCoordinates(location: { lat?: number | null; lng?: number | null } | null | undefined): location is { lat: number; lng: number } {
  return typeof location?.lat === 'number' && typeof location?.lng === 'number';
}

export function AddGigModal({
  visible,
  onClose,
  onNavigateToSubscription,
  onNavigateToExpenses,
  onNavigateToMileage,
  editingGig,
  duplicatingGig,
  source = 'dashboard',
}: AddGigModalProps) {
  const { theme } = useTheme();
  const grossAmountInputRef = useRef<TextInput>(null);
  const hasTrackedOpenRef = useRef(false);
  const lastAutoMileageRouteKeyRef = useRef<string | null>(null);
  const lastHydratedVenueAddressRef = useRef<string | null>(null);
  const failedHydratedVenueAddressRef = useRef<string | null>(null);
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
  const [didDriveToGig, setDidDriveToGig] = useState(false);
  const [driveRoundTrip, setDriveRoundTrip] = useState(true);
  const [mileageCalculationStatus, setMileageCalculationStatus] = useState<MileageCalculationStatus>('idle');
  const [inlineSubcontractorPayments, setInlineSubcontractorPayments] = useState<InlineSubcontractorPayment[]>([]);
  const [copyExpenses, setCopyExpenses] = useState(false);
  const [copySubcontractorPayments, setCopySubcontractorPayments] = useState(false);
  const [showAddPayerModal, setShowAddPayerModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEditPayerModal, setShowEditPayerModal] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [showAddSubcontractorModal, setShowAddSubcontractorModal] = useState(false);
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    payerId?: string;
    title?: string;
    date?: string;
    grossAmount?: string;
  }>({});
  const [taxTreatmentOverride, setTaxTreatmentOverride] = useState<'w2' | 'contractor_1099' | 'other' | null>(null);
  const [showTaxTreatmentOverride, setShowTaxTreatmentOverride] = useState(false);
  const [netAmountW2, setNetAmountW2] = useState('');
  const [withholdingAmountW2, setWithholdingAmountW2] = useState('');
  const [showW2Details, setShowW2Details] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const { data: payers } = usePayers();
  const createGig = useCreateGig();
  const updateGig = useUpdateGig();
  const queryClient = useQueryClient();
  
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getSharedUserId().then(setUserId);
  }, []);

  useEffect(() => {
    if (!visible) {
      hasTrackedOpenRef.current = false;
      return;
    }

    if (editingGig || duplicatingGig || !payers || hasTrackedOpenRef.current) {
      return;
    }

    trackGigModalOpened({
      source,
      has_payers: (payers?.length || 0) > 0,
    });
    hasTrackedOpenRef.current = true;
  }, [visible, editingGig, duplicatingGig, payers, source]);

  useEffect(() => {
    if (!visible || editingGig || duplicatingGig) {
      return;
    }

    if (payers && payers.length === 0) {
      setShowAddPayerModal(true);
    }
  }, [visible, editingGig, duplicatingGig, payers]);
  
  // Fetch user profile with home address
  const { data: profile } = useProfile(userId || undefined);
  
  // Calculate totals for inline items
  const totalExpenses = inlineExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const mileageDeduction = didDriveToGig && inlineMileage
    ? calculateMileageDeduction(parseFloat(inlineMileage.miles) || 0, date)
    : 0;
  const totalSubcontractorPayments = inlineSubcontractorPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  
  // Construct venue address from form fields
  const venueAddress = [location, city, state].filter(Boolean).join(', ');
  const venueLookupAddress = [location, city, state, country].filter(Boolean).join(', ');
  const resolvedVenueAddress = venueDetails?.formatted_address || venueAddress || location || null;
  const resolvedHomeAddress = profile?.home_address_full || profile?.home_address || null;
  const rawHomeCoordinates = {
    lat: profile?.home_address_lat,
    lng: profile?.home_address_lng,
  };
  const homeCoordinates = hasCoordinates(rawHomeCoordinates)
    ? rawHomeCoordinates
    : null;
  const venueCoordinates = hasCoordinates(venueDetails?.location)
    ? venueDetails.location
    : null;
  const canHydrateVenueCoordinatesFromStoredAddress = Boolean(
    (editingGig || duplicatingGig) &&
    location.trim() &&
    venueLookupAddress.trim() &&
    !venueCoordinates
  );
  const hasFailedStoredVenueHydration = failedHydratedVenueAddressRef.current === venueLookupAddress;
  const mileageMiles = parseFloat(inlineMileage?.miles || '0');
  const hasMileageReady = Number.isFinite(mileageMiles) && mileageMiles > 0;
  
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
      
      // Get YTD gigs with payer info to determine tax treatment
      const { data: gigs, error: gigsError } = await supabase
        .from('gigs')
        .select('gross_amount, tips, per_diem, other_income, fees, tax_treatment, payer_id, payers!inner(tax_treatment)')
        .gte('date', yearStart);
      
      if (gigsError) throw gigsError;
      
      // Get YTD expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', yearStart);
      
      if (expensesError) throw expensesError;
      
      // Calculate YTD gross, excluding W-2 gigs from tax basis
      const ytdGross = (gigs || []).reduce((sum, gig: any) => {
        // Get effective tax treatment (gig override or payer default)
        const effectiveTreatment = gig.tax_treatment || gig.payers?.tax_treatment || 'contractor_1099';
        
        // Exclude W-2 gigs from tax set-aside calculation
        if (effectiveTreatment === 'w2') {
          return sum;
        }
        
        return sum + (gig.gross_amount || 0) + (gig.tips || 0) + 
          (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0);
      }, 0);
      
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
    
    // Calculate total expenses for this gig (fees + inline expenses + mileage + subcontractor payments)
    const gigTotalExpenses = (parseFloat(fees) || 0)
      + totalExpenses
      + mileageDeduction
      + totalSubcontractorPayments;
    
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

  const applyLoadedMileage = (tripMileage: any) => {
    lastAutoMileageRouteKeyRef.current = null;

    if (!tripMileage) {
      setDidDriveToGig(false);
      setDriveRoundTrip(true);
      setMileageCalculationStatus('idle');
      setInlineMileage(null);
      return;
    }

    const roundTrip = inferStoredMileageRoundTrip(tripMileage);
    const autoCalculated = inferStoredMileageAutoCalculated(tripMileage);

    setDidDriveToGig(true);
    setDriveRoundTrip(roundTrip);
    setMileageCalculationStatus('ready');
    setInlineMileage({
      miles: tripMileage.miles.toString(),
      note: tripMileage.notes || '',
      startLocation: tripMileage.start_location || undefined,
      endLocation: tripMileage.end_location || undefined,
      venueAddress: tripMileage.end_location || undefined,
      roundTrip,
      isAutoCalculated: autoCalculated,
      oneWayMiles: autoCalculated
        ? (roundTrip ? Number(tripMileage.miles) / 2 : Number(tripMileage.miles)).toFixed(3)
        : undefined,
    });
  };

  const loadLatestGigMileage = async (gigId: string) => {
    const { data: mileage, error } = await supabase
      .from('mileage')
      .select('*')
      .or(`gig_id.eq.${gigId},linked_gig_id.eq.${gigId}`)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    const tripMileage = mileage?.[0];
    if (!error && tripMileage) {
      applyLoadedMileage(tripMileage);
      return;
    }

    applyLoadedMileage(null);
  };

  // Handle duplicating gig (separate from editing)
  useEffect(() => {
    if (duplicatingGig) {
      lastHydratedVenueAddressRef.current = null;
      failedHydratedVenueAddressRef.current = null;
      setVenueDetails(null);
      setCityDetails(null);
      setVenueError('');
      setCityError('');
      applyLoadedMileage(null);
      setPayerId(duplicatingGig.payer_id);
      setDate(toUtcDateString(new Date())); // Default to today for duplicates
      setTitle(duplicatingGig.title || '');
      setLocation(duplicatingGig.location || '');
      setCity(duplicatingGig.city || '');
      setState(duplicatingGig.state || '');
      setCountry(duplicatingGig.country || 'US');
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
      
      loadGigExpenses();
      void loadLatestGigMileage(duplicatingGig.id);
      
      // Note: Subcontractor payments are NOT automatically loaded when duplicating
      // They must be explicitly copied via the copySubcontractorPayments toggle
      // This prevents accidental duplication of payouts to bandmates/crew
    }
  }, [duplicatingGig, visible, copyExpenses]);

  useEffect(() => {
    if (editingGig) {
      lastHydratedVenueAddressRef.current = null;
      failedHydratedVenueAddressRef.current = null;
      setVenueDetails(null);
      setCityDetails(null);
      setVenueError('');
      setCityError('');
      applyLoadedMileage(null);
      setPayerId(editingGig.payer_id);
      setDate(editingGig.date);
      setTitle(editingGig.title || '');
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
      setStartTime((editingGig as any).start_time || '');
      setEndTime((editingGig as any).end_time || '');
      
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
      
      // Load gig-related subcontractor payments
      const loadGigSubcontractorPayments = async () => {
        const { data: payments, error } = await supabase
          .from('gig_subcontractor_payments')
          .select('*')
          .eq('gig_id', editingGig.id)
          .order('created_at', { ascending: true });
        
        if (!error && payments) {
          // Convert payments to InlineSubcontractorPayment format
          const inlinePaymentsData = payments.map((payment: any) => ({
            id: payment.id,
            subcontractor_id: payment.subcontractor_id,
            amount: payment.amount.toString(),
            note: payment.note || '',
          }));
          setInlineSubcontractorPayments(inlinePaymentsData);
        }
      };
      
      loadGigExpenses();
      void loadLatestGigMileage(editingGig.id);
      loadGigSubcontractorPayments();
    } else if (!duplicatingGig) {
      resetForm();
    }
  }, [editingGig, visible]);

  const resetForm = () => {
    lastHydratedVenueAddressRef.current = null;
    failedHydratedVenueAddressRef.current = null;
    setPayerId('');
    setDate(toUtcDateString(new Date())); // Today's date in UTC format
    setTitle('');
    setLocation('');
    setCity('');
    setState('');
    setCountry('US');
    setVenueDetails(null);
    setCityDetails(null);
    setVenueError('');
    setCityError('');
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
    setStartTime('');
    setEndTime('');
    setInlineExpenses([]);
    setInlineMileage(null);
    setDidDriveToGig(false);
    setDriveRoundTrip(true);
    setMileageCalculationStatus('idle');
    lastAutoMileageRouteKeyRef.current = null;
    setInlineSubcontractorPayments([]);
    setCopyExpenses(false);
    setCopySubcontractorPayments(false);
    setFieldErrors({});
    setTaxTreatmentOverride(null);
    setShowTaxTreatmentOverride(false);
    setNetAmountW2('');
    setWithholdingAmountW2('');
    setShowW2Details(false);
    setStateSearch('');
    setCountrySearch('');
  };

  // Date picker handler
  const handleDateChange = (selectedDate: Date) => {
    setDate(toUtcDateString(selectedDate));
  };

  const handleDriveToggle = () => {
    const nextDidDrive = !didDriveToGig;

    setDidDriveToGig(nextDidDrive);

    if (!nextDidDrive) {
      lastHydratedVenueAddressRef.current = null;
      failedHydratedVenueAddressRef.current = null;
      setMileageCalculationStatus('idle');
      return;
    }

    if (hasMileageReady) {
      setMileageCalculationStatus('ready');
      return;
    }

    if (!resolvedHomeAddress || !homeCoordinates) {
      setMileageCalculationStatus('missing-home');
      return;
    }

    if (!resolvedVenueAddress || !venueCoordinates) {
      if (canHydrateVenueCoordinatesFromStoredAddress && !hasFailedStoredVenueHydration) {
        setMileageCalculationStatus('calculating');
        return;
      }
      setMileageCalculationStatus('missing-venue');
      return;
    }

    setMileageCalculationStatus('calculating');
  };

  const handleDriveRoundTripToggle = () => {
    const nextRoundTrip = !driveRoundTrip;
    setDriveRoundTrip(nextRoundTrip);
    setInlineMileage((currentMileage) =>
      currentMileage ? syncAutoCalculatedInlineMileageRoundTrip(currentMileage, nextRoundTrip) : currentMileage
    );
  };

  const handleInlineMileageChange = (mileage: InlineMileage | null) => {
    if (!mileage) {
      setInlineMileage(null);
      if (!didDriveToGig) {
        setMileageCalculationStatus('idle');
      } else if (!resolvedHomeAddress || !homeCoordinates) {
        setMileageCalculationStatus('missing-home');
      } else if (canHydrateVenueCoordinatesFromStoredAddress && !hasFailedStoredVenueHydration) {
        setMileageCalculationStatus('calculating');
      } else if (!resolvedVenueAddress || !venueCoordinates) {
        setMileageCalculationStatus('missing-venue');
      } else {
        setMileageCalculationStatus('idle');
      }
      return;
    }

    setInlineMileage({
      ...mileage,
      roundTrip: driveRoundTrip,
      startLocation: mileage.startLocation || resolvedHomeAddress || undefined,
      endLocation: mileage.endLocation || resolvedVenueAddress || undefined,
      venueAddress: mileage.venueAddress || resolvedVenueAddress || undefined,
    });
    setMileageCalculationStatus('ready');
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!didDriveToGig) {
      setMileageCalculationStatus('idle');
      return;
    }

    if (!resolvedHomeAddress || !homeCoordinates) {
      setMileageCalculationStatus('missing-home');
      return;
    }

    if (!resolvedVenueAddress) {
      setMileageCalculationStatus('missing-venue');
      return;
    }

    if (!venueCoordinates) {
      if (canHydrateVenueCoordinatesFromStoredAddress && !hasFailedStoredVenueHydration) {
        setMileageCalculationStatus('calculating');
        return;
      }

      setMileageCalculationStatus('missing-venue');
      return;
    }

    const routeKey = [
      resolvedHomeAddress,
      homeCoordinates.lat,
      homeCoordinates.lng,
      resolvedVenueAddress,
      venueCoordinates.lat,
      venueCoordinates.lng,
    ].join('|');

    if (
      routeKey === lastAutoMileageRouteKeyRef.current &&
      inlineMileage?.isAutoCalculated &&
      inlineMileage.oneWayMiles
    ) {
      const syncedMileage = syncAutoCalculatedInlineMileageRoundTrip(inlineMileage, driveRoundTrip);

      if (
        syncedMileage.miles !== inlineMileage.miles ||
        syncedMileage.roundTrip !== inlineMileage.roundTrip ||
        syncedMileage.note !== inlineMileage.note
      ) {
        setInlineMileage(syncedMileage);
      }

      setMileageCalculationStatus('ready');
      return;
    }

    let cancelled = false;
    setMileageCalculationStatus('calculating');

    void calculateInlineMileage({
      homeCoordinates: homeCoordinates!,
      venueCoordinates: venueCoordinates!,
      homeAddress: resolvedHomeAddress!,
      venueAddress: resolvedVenueAddress!,
      roundTrip: driveRoundTrip,
    })
      .then((autoMileage) => {
        if (cancelled) {
          return;
        }

        lastAutoMileageRouteKeyRef.current = routeKey;
        setInlineMileage(autoMileage);
        setMileageCalculationStatus('ready');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error('Failed to auto-calculate gig mileage:', error);
        setMileageCalculationStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    didDriveToGig,
    driveRoundTrip,
    resolvedHomeAddress,
    homeCoordinates?.lat,
    homeCoordinates?.lng,
    resolvedVenueAddress,
    venueCoordinates?.lat,
    venueCoordinates?.lng,
    canHydrateVenueCoordinatesFromStoredAddress,
    hasFailedStoredVenueHydration,
  ]);

  useEffect(() => {
    if (!visible || !didDriveToGig || venueCoordinates) {
      return;
    }

    if (!canHydrateVenueCoordinatesFromStoredAddress) {
      return;
    }

    if (lastHydratedVenueAddressRef.current === venueLookupAddress) {
      return;
    }

    let cancelled = false;
    lastHydratedVenueAddressRef.current = venueLookupAddress;
    failedHydratedVenueAddressRef.current = null;

    void resolveAddressDetails(venueLookupAddress)
      .then((details) => {
        if (cancelled) {
          return;
        }

        if (!details?.location) {
          failedHydratedVenueAddressRef.current = venueLookupAddress;
          setMileageCalculationStatus('missing-venue');
          return;
        }

        failedHydratedVenueAddressRef.current = null;
        setVenueDetails((current: any) => ({
          ...(current || {}),
          ...details,
          formatted_address: details.formatted_address || current?.formatted_address || venueLookupAddress,
          location: details.location,
          parts: {
            ...(current?.parts || {}),
            ...(details.parts || {}),
          },
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        failedHydratedVenueAddressRef.current = venueLookupAddress;
        console.error('Failed to resolve saved gig venue details:', error);
        setMileageCalculationStatus('missing-venue');
      });

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    didDriveToGig,
    venueCoordinates?.lat,
    venueCoordinates?.lng,
    canHydrateVenueCoordinatesFromStoredAddress,
    venueLookupAddress,
  ]);

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

  const generateDefaultTitle = () => {
    const payer = payers?.find(p => p.id === payerId);
    const payerName = payer?.name || 'Gig';
    const gigDate = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return gigDate ? `${payerName} - ${gigDate}` : payerName;
  };

  const validateForm = () => {
    const errors: typeof fieldErrors = {};
    
    if (!payerId) {
      errors.payerId = 'Please select a payer';
    }
    if (!date) {
      errors.date = 'Date is required';
    }
    if (!grossAmount || parseFloat(grossAmount) < 0) {
      errors.grossAmount = 'Gross amount must be 0 or greater';
    }
    
    setFieldErrors(errors);

    Object.keys(errors).forEach((field) => {
      trackGigValidationFailed({ field, source: `${source}_gig_modal` });
    });

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      if (!payerId) {
        if (payers && payers.length === 0) {
          setShowAddPayerModal(true);
        } else {
          setShowPayerPicker(true);
        }
      } else if (!date) {
        setShowDatePicker(true);
      } else if (!grossAmount || parseFloat(grossAmount) < 0) {
        setTimeout(() => grossAmountInputRef.current?.focus(), 100);
      }

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
        title: title.trim() || generateDefaultTitle(),
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
        tax_treatment: taxTreatmentOverride || undefined,
        net_amount_w2: netAmountW2 ? parseFloat(netAmountW2) : undefined,
        withholding_amount: withholdingAmountW2 ? parseFloat(withholdingAmountW2) : undefined,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
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
      const expensesData = inlineExpenses
        .filter(exp => exp.description && exp.amount && parseFloat(exp.amount) > 0)
        .map(exp => ({
          category: exp.category,
          description: exp.description,
          amount: parseFloat(exp.amount) || 0,
          note: exp.note,
        }));

      // Prepare inline mileage data (used for both create and edit)
      const mileageData = didDriveToGig && inlineMileage ? {
        miles: parseFloat(inlineMileage.miles) || 0,
        note: inlineMileage.note,
        startLocation: inlineMileage.startLocation || resolvedHomeAddress || undefined,
        endLocation: inlineMileage.endLocation || resolvedVenueAddress || undefined,
        purpose: validated.title || generateDefaultTitle(),
        isAutoCalculated: inlineMileage.isAutoCalculated ?? false,
        roundTrip: driveRoundTrip,
      } : undefined;

      // Prepare subcontractor payments data (used for both create and edit)
      console.log('inlineSubcontractorPayments state:', inlineSubcontractorPayments);
      const subcontractorPaymentsData = inlineSubcontractorPayments
        .filter(payment => payment.subcontractor_id && payment.amount)
        .map(payment => ({
          subcontractor_id: payment.subcontractor_id,
          amount: parseFloat(payment.amount) || 0,
          note: payment.note,
        }));
      console.log('Prepared subcontractorPaymentsData:', subcontractorPaymentsData);

      if (editingGig) {
        // Update gig with inline items
        console.log('Calling updateGigWithLines with:', {
          gigId: editingGig.id,
          subcontractorPayments: subcontractorPaymentsData,
        });
        await updateGigWithLines({
          gigId: editingGig.id,
          gig: validated,
          expenses: expensesData,
          mileage: mileageData,
          subcontractorPayments: subcontractorPaymentsData,
        });
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['mileage'] });
        queryClient.invalidateQueries({ queryKey: ['gig-subcontractor-payments'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } else {
        // Check limit before creating new gig
        const userId = await getSharedUserId();
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const limitCheck = await checkAndIncrementLimit(userId, 'gigs');
        
        if (!limitCheck.allowed) {
          Alert.alert(
            '⚠️ Monthly Limit Reached',
            limitCheck.message + '\n\nUpgrade to Pro for unlimited gigs!',
            [
              { text: 'Maybe Later', style: 'cancel' },
              { 
                text: 'Upgrade to Pro', 
                onPress: () => {
                  onClose();
                  if (onNavigateToSubscription) {
                    onNavigateToSubscription();
                  }
                }
              },
            ]
          );
          return;
        }
        
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
            subcontractorPayments: subcontractorPaymentsData,
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
        queryClient.invalidateQueries({ queryKey: ['gig-subcontractor-payments'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }

      resetForm();
      setFieldErrors({});
      onClose();

      const hasSavedMileage = Boolean(mileageData && mileageData.miles > 0);

      if (editingGig) {
        Alert.alert('✓ Success', 'Gig updated successfully!', [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'Gig recorded',
          'Your income is on the books. What would you like to do next?',
          [
            { text: 'Done', style: 'cancel' },
            ...(onNavigateToExpenses
              ? [{
                  text: 'Add Expense',
                  onPress: () => onNavigateToExpenses(),
                } as const]
              : []),
            ...(onNavigateToMileage
              ? [{
                  text: hasSavedMileage ? 'View Mileage' : 'Add Mileage',
                  onPress: () => onNavigateToMileage(),
                } as const]
              : []),
          ]
        );
      }
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
  const mileageStatusText = (() => {
    if (!didDriveToGig) {
      return '';
    }

    if (mileageCalculationStatus === 'calculating') {
      return 'Calculating mileage...';
    }

    if (hasMileageReady) {
      return inlineMileage?.isAutoCalculated ? 'Miles ready' : 'Manual miles ready';
    }

    switch (mileageCalculationStatus) {
      case 'missing-home':
        return 'Add your home address in Settings to auto-calculate.';
      case 'missing-venue':
        return 'Select a venue from suggestions to auto-calculate mileage.';
      case 'error':
        return 'Could not calculate. Enter miles manually below.';
      default:
        return 'Mileage will appear on the Mileage page after you save this gig.';
    }
  })();
  const mileageStatusStyle = hasMileageReady
    ? styles.driveStatusReady
    : mileageCalculationStatus === 'error'
      ? styles.driveStatusError
      : mileageCalculationStatus === 'calculating'
        ? styles.driveStatusCalculating
        : styles.driveStatusMuted;

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
            {/* QUICK ADD SECTION - Always Visible */}
            <View style={styles.quickAddSection}>
              <Text style={styles.sectionTitle}>Quick Add</Text>
              <Text style={styles.sectionDescription}>Required fields to get started</Text>
              <Text style={styles.scrollHint}>↓ Scroll down for optional details (venue, tips/fees, subs, mileage)</Text>

              <View style={styles.driveCard}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <Text style={styles.driveCardTitle}>Did you drive to this gig?</Text>
                    <Text style={styles.driveCardSubtitle}>
                      We&apos;ll save this trip to Mileage when you save the gig.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, didDriveToGig && styles.toggleActive]}
                    onPress={handleDriveToggle}
                  >
                    <View style={[styles.toggleThumb, didDriveToGig && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>

                {didDriveToGig && (
                  <View style={styles.driveCardBody}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={handleDriveRoundTripToggle}
                    >
                      <View style={[styles.checkbox, driveRoundTrip && styles.checkboxChecked]}>
                        {driveRoundTrip && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Round trip</Text>
                    </TouchableOpacity>

                    <Text style={[styles.driveStatusText, mileageStatusStyle]}>
                      {mileageStatusText}
                    </Text>

                    {hasMileageReady && (
                      <View style={styles.driveSummaryRow}>
                        <Text style={styles.driveSummaryMetric}>
                          {mileageMiles.toFixed(1)} miles
                        </Text>
                        <Text style={styles.driveSummaryDivider}>•</Text>
                        <Text style={styles.driveSummaryMetric}>
                          -${mileageDeduction.toFixed(2)} deduction
                        </Text>
                      </View>
                    )}

                    <Text style={styles.driveCardHint}>
                      Use the Mileage section in Deductions below to edit miles or notes manually.
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payer *</Text>
              
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
                  
                  {payerId && (() => {
                    const selectedPayer = payers?.find(p => p.id === payerId);
                    if (!selectedPayer) return null;
                    
                    const effectiveTreatment = getEffectiveTaxTreatment(
                      { tax_treatment: taxTreatmentOverride },
                      { tax_treatment: selectedPayer.tax_treatment }
                    );
                    
                    return (
                      <View style={styles.taxTreatmentSection}>
                        <View style={styles.taxTreatmentBadgeRow}>
                          <Text style={styles.taxTreatmentLabel}>Tax Treatment:</Text>
                          <View style={[
                            styles.taxTreatmentBadge,
                            effectiveTreatment === 'w2' && styles.taxTreatmentBadgeW2,
                            effectiveTreatment === 'contractor_1099' && styles.taxTreatmentBadge1099,
                          ]}>
                            <Text style={styles.taxTreatmentBadgeText}>
                              {getTaxTreatmentShortLabel(effectiveTreatment)}
                            </Text>
                          </View>
                          {taxTreatmentOverride && (
                            <Text style={styles.taxTreatmentOverrideNote}>(Override)</Text>
                          )}
                        </View>
                        
                        <TouchableOpacity
                          style={styles.taxTreatmentOverrideToggle}
                          onPress={() => setShowTaxTreatmentOverride(!showTaxTreatmentOverride)}
                        >
                          <Text style={styles.taxTreatmentOverrideToggleText}>
                            {showTaxTreatmentOverride ? '− Hide override' : '+ Override tax treatment'}
                          </Text>
                        </TouchableOpacity>
                        
                        {showTaxTreatmentOverride && (
                          <View style={styles.taxTreatmentOverrideSection}>
                            <Text style={styles.taxTreatmentOverrideHelp}>
                              Override the default tax treatment for this gig only
                            </Text>
                            <View style={styles.taxTreatmentButtons}>
                              <TouchableOpacity
                                style={[
                                  styles.taxTreatmentButton,
                                  taxTreatmentOverride === 'w2' && styles.taxTreatmentButtonActive,
                                ]}
                                onPress={() => setTaxTreatmentOverride('w2')}
                              >
                                <Text style={[
                                  styles.taxTreatmentButtonText,
                                  taxTreatmentOverride === 'w2' && styles.taxTreatmentButtonTextActive,
                                ]}>W-2</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.taxTreatmentButton,
                                  taxTreatmentOverride === 'contractor_1099' && styles.taxTreatmentButtonActive,
                                ]}
                                onPress={() => setTaxTreatmentOverride('contractor_1099')}
                              >
                                <Text style={[
                                  styles.taxTreatmentButtonText,
                                  taxTreatmentOverride === 'contractor_1099' && styles.taxTreatmentButtonTextActive,
                                ]}>1099</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.taxTreatmentButton,
                                  taxTreatmentOverride === 'other' && styles.taxTreatmentButtonActive,
                                ]}
                                onPress={() => setTaxTreatmentOverride('other')}
                              >
                                <Text style={[
                                  styles.taxTreatmentButtonText,
                                  taxTreatmentOverride === 'other' && styles.taxTreatmentButtonTextActive,
                                ]}>Other</Text>
                              </TouchableOpacity>
                              {taxTreatmentOverride && (
                                <TouchableOpacity
                                  style={styles.taxTreatmentClearButton}
                                  onPress={() => setTaxTreatmentOverride(null)}
                                >
                                  <Text style={styles.taxTreatmentClearButtonText}>Clear</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                        
                        {effectiveTreatment === 'w2' && (
                          <View style={styles.w2InfoBox}>
                            <Text style={styles.w2InfoIcon}>ℹ️</Text>
                            <Text style={styles.w2InfoText}>
                              W-2 income is excluded from estimated tax calculations (taxes withheld by employer)
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Gross Amount *</Text>
                <TextInput
                  ref={grossAmountInputRef}
                  style={[styles.input, fieldErrors.grossAmount && styles.inputError]}
                  value={grossAmount}
                  onChangeText={(text) => {
                    setGrossAmount(text);
                    if (fieldErrors.grossAmount && text && parseFloat(text) >= 0) {
                      setFieldErrors({ ...fieldErrors, grossAmount: undefined });
                    }
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.subtle}
                  keyboardType="decimal-pad"
                />
                {fieldErrors.grossAmount && (
                  <Text style={styles.errorText}>⚠️ {fieldErrors.grossAmount}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, fieldErrors.date && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.pickerButtonText, !date && styles.placeholderText]}>
                    {date || 'Select date'}
                  </Text>
                  <Text style={styles.pickerButtonIcon}>📅</Text>
                </TouchableOpacity>
                {fieldErrors.date && (
                  <Text style={styles.errorText}>⚠️ {fieldErrors.date}</Text>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="19:00"
                  placeholderTextColor={colors.text.subtle}
                />
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="21:00"
                  placeholderTextColor={colors.text.subtle}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Optional. We can generate one from payer + date."
                placeholderTextColor={colors.text.subtle}
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
            </View>

            {/* ACCORDION: DETAILS */}
            <Accordion title="Details" description="Venue, location, and other details">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Venue</Text>
                <VenuePlacesInput
                  label=""
                  placeholder="Search for a venue..."
                  types="establishment"
                  value={location}
                  onChange={(text: string) => {
                    setLocation(text);
                    setVenueDetails(null);
                    setVenueError('');
                  }}
                  onSelect={async (item: { description: string; place_id: string; lat?: number; lng?: number }) => {
                    setLocation(item.description);
                    setVenueError('');

                    if (typeof item.lat === 'number' && typeof item.lng === 'number') {
                      setVenueDetails((prev: any) => ({
                        ...(prev || {}),
                        formatted_address: prev?.formatted_address || item.description,
                        location: { lat: item.lat, lng: item.lng },
                        parts: prev?.parts || {},
                      }));
                    }
                    
                    try {
                      const details = await resolvePlaceDetails(item.place_id);

                      if (details) {
                        setVenueDetails(details);
                        
                        if (details.parts?.city) {
                          setCity(details.parts.city);
                        }
                        if (details.parts?.state) {
                          setState(details.parts.state);
                        }
                        if (details.parts?.country) {
                          setCountry(details.parts.country);
                        }
                      } else {
                        setVenueError('Could not load venue details. Select a venue from suggestions or enter miles manually.');
                      }
                    } catch (error) {
                      console.error('Error fetching venue details:', error);
                      setVenueError('Could not load venue details. Select a venue from suggestions or enter miles manually.');
                    }
                  }}
                  error={venueError}
                  locationBias={cityDetails?.location}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <VenuePlacesInput
                  label=""
                  placeholder="Search for a city..."
                  types="(cities)"
                  value={city}
                  onChange={(text: string) => {
                    setCity(text);
                    setCityDetails(null);
                    setCityError('');
                  }}
                  onSelect={async (item: { description: string; place_id: string; lat?: number; lng?: number }) => {
                    setCity(item.description);
                    setCityError('');

                    if (typeof item.lat === 'number' && typeof item.lng === 'number') {
                      setCityDetails((prev: any) => ({
                        ...(prev || {}),
                        formatted_address: prev?.formatted_address || item.description,
                        location: { lat: item.lat, lng: item.lng },
                        parts: prev?.parts || {},
                      }));
                    }
                    
                    try {
                      const details = await resolvePlaceDetails(item.place_id);

                      if (details) {
                        setCityDetails(details);
                        
                        if (details.parts?.state) {
                          setState(details.parts.state);
                        }
                        if (details.parts?.country) {
                          setCountry(details.parts.country);
                        }
                      } else {
                        setCityError('Could not load city details. Select a city from suggestions or fill fields manually.');
                      }
                    } catch (error) {
                      console.error('Error fetching city details:', error);
                      setCityError('Could not load city details. Select a city from suggestions or fill fields manually.');
                    }
                  }}
                  error={cityError}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Invoice Link (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceLink}
                  onChangeText={setInvoiceLink}
                  placeholder="https://..."
                  placeholderTextColor={colors.text.subtle}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </Accordion>

            {/* ACCORDION: MONEY BREAKDOWN */}
            <Accordion title="Money Breakdown" description="Tips, fees, per diem, and payment method">
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Tips</Text>
                  <TextInput
                    style={styles.input}
                    value={tips}
                    onChangeText={setTips}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.subtle}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Fees</Text>
                  <TextInput
                    style={styles.input}
                    value={fees}
                    onChangeText={setFees}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.subtle}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Per Diem</Text>
                  <TextInput
                    style={styles.input}
                    value={perDiem}
                    onChangeText={setPerDiem}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.subtle}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Other Income</Text>
                  <TextInput
                    style={styles.input}
                    value={otherIncome}
                    onChangeText={setOtherIncome}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.subtle}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

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
            </Accordion>

            {/* ACCORDION: DEDUCTIONS */}
            <Accordion title="Deductions" description="Expenses, subcontractors, and mileage">
              {/* Copy Expenses Toggle (only shown when duplicating) */}
              {duplicatingGig && (
                <View style={styles.inputGroup}>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleLabel}>
                      <Text style={styles.label}>Copy gig-specific expenses?</Text>
                      <Text style={styles.helperText}>Expenses from the original gig</Text>
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

              {/* Subcontractor Payments */}
              <InlineSubcontractorPayments
                payments={inlineSubcontractorPayments}
                onChange={setInlineSubcontractorPayments}
                onAddSubcontractor={() => setShowAddSubcontractorModal(true)}
              />

              {/* Inline Mileage */}
              {didDriveToGig ? (
                <InlineMileageRow
                  mileage={inlineMileage}
                  onChange={handleInlineMileageChange}
                  date={date}
                />
              ) : (
                <Text style={styles.helperText}>
                  Turn on &quot;Did you drive to this gig?&quot; above if you want to track gig mileage.
                </Text>
              )}
            </Accordion>

            {/* ACCORDION: NOTES */}
            <Accordion title="Notes" description="Additional notes about this gig">
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this gig..."
                  placeholderTextColor={colors.text.subtle}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </Accordion>

            {/* Bottom padding to prevent sticky footer overlap - compact summary ~140px + button 80px */}
            <View style={{ height: 220 }} />
          </ScrollView>

          {/* Sticky Summary Footer */}
          {gigSetAside && taxProfile && (
            <View style={styles.stickyFooter}>
              <StickySummary
                variant="compact"
                grossIncome={(parseFloat(grossAmount) || 0) + (parseFloat(tips) || 0) + (parseFloat(perDiem) || 0) + (parseFloat(otherIncome) || 0)}
                fees={parseFloat(fees) || 0}
                expenses={totalExpenses}
                subcontractorPayments={totalSubcontractorPayments}
                mileageDeduction={mileageDeduction}
                taxSetAside={gigSetAside.amount}
                taxRate={gigSetAside.rate * 100}
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
              <Text style={styles.submitButtonText} numberOfLines={1} ellipsizeMode="tail">
                {createGig.isPending || updateGig.isPending
                  ? 'Saving...'
                  : editingGig
                  ? 'Update'
                  : 'Save'}
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

      {/* Add Subcontractor Modal */}
      <SubcontractorFormModal
        visible={showAddSubcontractorModal}
        onClose={() => setShowAddSubcontractorModal(false)}
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
        isDark={theme === 'dark'}
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
                placeholderTextColor={colors.text.subtle}
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
                placeholderTextColor={colors.text.subtle}
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
    backgroundColor: colors.overlay.DEFAULT,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface.elevated,
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
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.DEFAULT,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.text.muted,
  },
  form: {
    paddingHorizontal: 10,
  },
  quickAddSection: {
    marginBottom: 24,
    paddingBottom: 36,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 16,
  },
  scrollHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 16,
  },
  driveCard: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  driveCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    marginBottom: 4,
  },
  driveCardSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 18,
  },
  driveCardBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  driveStatusText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  driveStatusReady: {
    color: colors.success.DEFAULT,
  },
  driveStatusCalculating: {
    color: colors.brand.DEFAULT,
  },
  driveStatusError: {
    color: colors.danger.DEFAULT,
  },
  driveStatusMuted: {
    color: colors.text.muted,
  },
  driveSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  driveSummaryMetric: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  driveSummaryDivider: {
    fontSize: 13,
    color: colors.text.subtle,
  },
  driveCardHint: {
    fontSize: 12,
    color: colors.text.subtle,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.DEFAULT,
  },
  inputError: {
    borderColor: colors.danger.DEFAULT,
    borderWidth: 2,
  },
  errorText: {
    color: colors.danger.DEFAULT,
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
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  payerChipActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  payerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
  payerChipTextActive: {
    color: colors.brand.foreground,
  },
  helperText: {
    fontSize: 12,
    color: colors.text.subtle,
    fontStyle: 'italic',
  },
  reminderBox: {
    backgroundColor: colors.warning.muted,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
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
    color: colors.warning.DEFAULT,
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
    backgroundColor: colors.success.muted,
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
    color: colors.success.DEFAULT,
    marginBottom: 2,
  },
  netAmountSubtitle: {
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  netAmountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.success.DEFAULT,
    marginBottom: 4,
  },
  netAmountFormula: {
    fontSize: 12,
    color: colors.text.muted,
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
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  typeButtonActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  typeButtonTextActive: {
    color: colors.brand.foreground,
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
    borderColor: colors.border.strong,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.DEFAULT,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  checkmark: {
    color: colors.brand.foreground,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500',
  },
  taxSetAsideContainer: {
    backgroundColor: colors.brand.muted,
    borderWidth: 1,
    borderColor: colors.border.focus,
    borderRadius: 8,
    marginHorizontal: 10,
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
    color: colors.brand.DEFAULT,
    marginBottom: 2,
  },
  taxSetAsideHint: {
    fontSize: 11,
    color: colors.text.muted,
  },
  taxSetAsideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taxSetAsideAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  taxSetAsideRate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
  },
  taxBreakdown: {
    backgroundColor: colors.surface.DEFAULT,
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.focus,
    gap: 6,
  },
  taxBreakdownItem: {
    fontSize: 12,
    color: colors.text.muted,
  },
  taxBreakdownNote: {
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  taxBreakdownSeparator: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: 8,
  },
  taxBreakdownExplainer: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  taxBreakdownDisclaimer: {
    fontSize: 11,
    color: colors.text.subtle,
    marginTop: 4,
    fontStyle: 'italic',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    shadowColor: colors.overlay.DEFAULT,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.surface.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  submitButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.brand.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButton: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.text.DEFAULT,
  },
  placeholderText: {
    color: colors.text.subtle,
  },
  pickerButtonIcon: {
    fontSize: 16,
    color: colors.text.muted,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.DEFAULT,
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: colors.surface.elevated,
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
    borderBottomColor: colors.border.DEFAULT,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.text.muted,
  },
  pickerOptionTextActive: {
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.DEFAULT,
    margin: 20,
    marginBottom: 10,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickDateButtonText: {
    color: colors.brand.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 10,
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
    color: colors.text.DEFAULT,
  },
  calendarModalContent: {
    backgroundColor: colors.surface.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 12,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: 20,
    color: colors.text.DEFAULT,
    fontWeight: '600',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
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
    color: colors.text.subtle,
  },
  calendarDay: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDaySelected: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: 8,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: colors.border.focus,
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 16,
    color: colors.text.DEFAULT,
  },
  calendarDayTextSelected: {
    color: colors.brand.foreground,
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: colors.text.DEFAULT,
    fontWeight: '600',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 16,
    gap: 12,
  },
  calendarFooterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
  },
  calendarFooterButtonPrimary: {
    backgroundColor: colors.brand.DEFAULT,
  },
  calendarFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.subtle,
  },
  calendarFooterButtonTextPrimary: {
    color: colors.brand.foreground,
  },
  withholdingCard: {
    backgroundColor: colors.warning.muted,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
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
    color: colors.warning.DEFAULT,
  },
  setupTaxButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setupTaxButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.foreground,
  },
  withholdingTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.warning.DEFAULT,
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
    color: colors.warning.DEFAULT,
  },
  withholdingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning.DEFAULT,
  },
  withholdingDisclaimer: {
    fontSize: 11,
    color: colors.warning.DEFAULT,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  monthYearPickerContent: {
    backgroundColor: colors.surface.elevated,
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
    color: colors.text.DEFAULT,
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
    backgroundColor: colors.surface.muted,
  },
  monthButtonSelected: {
    backgroundColor: colors.brand.DEFAULT,
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.subtle,
  },
  monthButtonTextSelected: {
    color: colors.brand.foreground,
  },
  // Payer dropdown styles
  emptyPayerContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface.muted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  emptyPayerText: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 12,
  },
  addPayerButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addPayerButtonText: {
    color: colors.brand.foreground,
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
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  editPayerLink: {
    paddingVertical: 4,
  },
  editPayerLinkText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '600',
  },
  // Payer picker modal styles
  pickerModal: {
    backgroundColor: colors.surface.elevated,
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
    borderBottomColor: colors.border.DEFAULT,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.DEFAULT,
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
    borderBottomColor: colors.border.muted,
  },
  pickerModalItemActive: {
    backgroundColor: colors.brand.muted,
  },
  pickerModalItemText: {
    fontSize: 16,
    color: colors.text.DEFAULT,
  },
  pickerModalItemTextActive: {
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  // Net After Tax section styles
  netAfterTaxSection: {
    marginTop: 0,
  },
  sectionHeaderRow: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: colors.surface.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
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
    backgroundColor: colors.border.strong,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.brand.DEFAULT,
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.surface.DEFAULT,
    shadowColor: colors.overlay.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  // Tax treatment styles
  taxTreatmentSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surface.muted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  taxTreatmentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxTreatmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
    marginRight: 8,
  },
  taxTreatmentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.border.DEFAULT,
  },
  taxTreatmentBadgeW2: {
    backgroundColor: colors.brand.muted,
  },
  taxTreatmentBadge1099: {
    backgroundColor: colors.warning.muted,
  },
  taxTreatmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
  },
  taxTreatmentOverrideNote: {
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginLeft: 6,
  },
  taxTreatmentOverrideToggle: {
    marginTop: 4,
  },
  taxTreatmentOverrideToggleText: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
    fontWeight: '500',
  },
  taxTreatmentOverrideSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  taxTreatmentOverrideHelp: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 8,
  },
  taxTreatmentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taxTreatmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.DEFAULT,
  },
  taxTreatmentButtonActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  taxTreatmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  taxTreatmentButtonTextActive: {
    color: colors.brand.foreground,
  },
  taxTreatmentClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.danger.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  taxTreatmentClearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger.DEFAULT,
  },
  w2InfoBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.brand.muted,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.focus,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  w2InfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  w2InfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.brand.DEFAULT,
    lineHeight: 16,
  },
});
