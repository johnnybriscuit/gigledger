import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Text } from '../ui';
import { colors } from '../styles/theme';
import { HowToImportModal, type TaxSoftware } from '../components/HowToImportModal';
import { useAllExportData, type ExportFilters } from '../hooks/useExports';
import { generateCSVBundle } from '../lib/exports/csv-bundle-generator';
import { downloadExcelFromPackage } from '../lib/exports/excel-generator-canonical';
import { downloadJSONBackup as downloadJSONBackupCanonical } from '../lib/exports/json-backup-generator';
import { generateScheduleCSummaryPdf } from '../lib/exports/taxpdf';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { canExport } from '../config/plans';
import { checkAndIncrementLimit } from '../utils/limitChecks';
import { getSharedUserId } from '../lib/sharedAuth';
import { UpgradeModal } from '../components/UpgradeModal';
import {
  validateExportData,
  getValidationSummary,
  type ValidationResult,
} from '../lib/exports/validator';
import {
  generateTXF,
  downloadTXF,
  getTXFImportInstructions,
} from '../lib/exports/txf-generator';
import type { GigExportRow, ExpenseExportRow, MileageExportRow } from '../lib/exports/schemas';
import { useWithholding } from '../hooks/useWithholding';
import { useTaxExportPackage } from '../hooks/useTaxExportPackage';
import { generateTXFv042 } from '../lib/exports/txf-v042-generator';
import { generateTaxActPackZip } from '../lib/exports/taxact-pack';
import { generateTurboTaxOnlinePack } from '../lib/exports/turbotax-online-pack';
import { downloadTXF as downloadTXFWeb, downloadZip } from '../lib/exports/webDownloadHelpers';
import { TaxExportError } from '../lib/exports/buildTaxExportPackage';
import { type DateRange, dateRangeToStrings } from '../lib/dateRangeUtils';
import { StatsSummaryBar } from '../components/ui/StatsSummaryBar';
import { getMileageRateForDate, sumMileageDeduction } from '../lib/mileage';

interface ExportsScreenProps {
  dateRange?: DateRange;
  customStart?: Date;
  customEnd?: Date;
}

export function ExportsScreen({ dateRange, customStart, customEnd }: ExportsScreenProps = {}) {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [customDateRange, setCustomDateRange] = useState(false);

  // Derive startDate/endDate from shared dateRange prop when provided,
  // otherwise fall back to the taxYear-based defaults.
  const derivedDates = dateRange
    ? dateRangeToStrings(dateRange, customStart, customEnd)
    : null;
  const [startDate, setStartDate] = useState(
    derivedDates?.startDate ?? `${currentYear}-01-01`
  );
  const [endDate, setEndDate] = useState(
    derivedDates?.endDate ?? `${currentYear}-12-31`
  );

  // Sync startDate/endDate when the shared dateRange prop changes
  useEffect(() => {
    if (dateRange) {
      const { startDate: s, endDate: e } = dateRangeToStrings(dateRange, customStart, customEnd);
      setStartDate(s);
      setEndDate(e);
    }
  }, [dateRange, customStart, customEnd]);
  const [includeTips, setIncludeTips] = useState(true);
  const [includeFees, setIncludeFees] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [showTXFInfo, setShowTXFInfo] = useState(false);
  const [showTaxActInfo, setShowTaxActInfo] = useState(false);
  const [showHowToImport, setShowHowToImport] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<TaxSoftware | null>(null);
  const [showLegacySection, setShowLegacySection] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showTaxPrepChecklist, setShowTaxPrepChecklist] = useState(false);
  const [expandedGuidance, setExpandedGuidance] = useState<string | null>(null);
  const [taxExportError, setTaxExportError] = useState<string | null>(null);

  // Fetch user's plan
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const userPlan = profile?.plan || 'free';

  // Get current user ID for tax export package
  const { data: currentUserData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => await supabase.auth.getUser(),
  });

  const currentUserId = currentUserData?.data?.user?.id || '';

  // Build filters
  const filters: ExportFilters = {
    startDate: customDateRange ? startDate : `${taxYear}-01-01`,
    endDate: customDateRange ? endDate : `${taxYear}-12-31`,
    includeTips,
    includeFees,
  };

  // Fetch all export data (legacy)
  const { gigs, expenses, mileage, payers, scheduleC, isLoading, isError } = useAllExportData(filters);

  // Fetch canonical tax export package (new) — respects all filter state
  const taxPackage = useTaxExportPackage({
    userId: currentUserId,
    taxYear,
    timezone: 'America/New_York',
    includeTips,
    includeFees,
    dateStart: customDateRange ? startDate : undefined,
    dateEnd: customDateRange ? endDate : undefined,
    enabled: !!currentUserId,
  });
  
  // Calculate net profit for tax estimation (same as dashboard)
  const netProfit = useMemo(() => {
    if (!gigs.data || !expenses.data || !mileage.data) return 0;
    
    const totalGross = gigs.data.reduce((sum, g) => sum + (g.gross_amount || 0), 0);
    const totalTips = gigs.data.reduce((sum, g) => sum + (g.tips || 0), 0);
    const totalPerDiem = gigs.data.reduce((sum, g) => sum + (g.per_diem || 0), 0);
    const totalOtherIncome = gigs.data.reduce((sum, g) => sum + (g.other_income || 0), 0);
    const totalFees = gigs.data.reduce((sum, g) => sum + (g.fees || 0), 0);
    const totalIncome = totalGross + totalTips + totalPerDiem + totalOtherIncome - totalFees;
    
    const totalExpenses = expenses.data.reduce((sum, e) => sum + e.amount, 0);
    const totalMileageDeduction = sumMileageDeduction(mileage.data);
    const totalDeductions = totalExpenses + totalMileageDeduction;
    
    return totalIncome - totalDeductions;
  }, [gigs.data, expenses.data, mileage.data]);
  
  // Get tax breakdown using same hook as dashboard
  const { breakdown: taxBreakdown } = useWithholding(netProfit);

  // Run validation when data loads
  useEffect(() => {
    if (gigs.data && expenses.data && mileage.data) {
      // Transform data to export format (simplified for now)
      const gigsExport = gigs.data.map(g => ({
        ...g,
        gig_id: g.user_id, // Placeholder
        title: g.payer || 'Gig',
        payer_name: g.payer,
        payer_ein_or_ssn: null,
        city: g.city_state?.split(',')[0] || null,
        state: g.city_state?.split(',')[1]?.trim() || null,
        country: 'US',
        payment_method: null,
        invoice_url: null,
        paid: true,
        withholding_federal: 0,
        withholding_state: 0,
      })) as GigExportRow[];

      const expensesExport = expenses.data.map(e => ({
        ...e,
        expense_id: e.user_id, // Placeholder
        merchant: e.vendor,
        gl_category: e.category,
        irs_schedule_c_line: '27a', // Default to Other
        meals_percent_allowed: e.category === 'Meals' ? 0.5 : 1,
        linked_gig_id: null,
      })) as ExpenseExportRow[];

      const mileageExport = mileage.data.map(m => ({
        ...m,
        trip_id: m.user_id, // Placeholder
        business_miles: m.miles,
        vehicle: null,
        standard_rate: getMileageRateForDate(m.date),
        calculated_deduction: m.deduction_amount,
      })) as MileageExportRow[];

      const result = validateExportData(gigsExport, expensesExport, mileageExport);
      setValidationResult(result);
    }
  }, [gigs.data, expenses.data, mileage.data]);

  const handleDownloadCSVs = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const limitCheck = await checkAndIncrementLimit(userId, 'exports');
    if (!limitCheck.allowed) {
      Alert.alert(
        '⚠️ Monthly Limit Reached',
        limitCheck.message + '\n\nUpgrade to Pro for unlimited exports!',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      await generateCSVBundle(taxPackage.data);
      
      // Track analytics
      const { trackExportCreated } = await import('../lib/analytics');
      trackExportCreated({ export_type: 'csv_bundle', source: 'exports_screen' });
      
      Alert.alert('CSV Bundle Downloaded', 'Your ZIP file contains 7 CSV files for CPA sharing and tax prep.');
    } catch (error: any) {
      console.error('CSV export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to generate CSV bundle');
    }
  };

  const handleDownloadJSON = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const limitCheck = await checkAndIncrementLimit(userId, 'exports');
    if (!limitCheck.allowed) {
      Alert.alert(
        '⚠️ Monthly Limit Reached',
        limitCheck.message + '\n\nUpgrade to Pro for unlimited exports!',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      downloadJSONBackupCanonical(taxPackage.data);
      
      // Track analytics
      const { trackExportCreated } = await import('../lib/analytics');
      trackExportCreated({ export_type: 'json_backup', source: 'exports_screen' });
      
      Alert.alert('Success', 'JSON backup downloaded successfully.');
    } catch (error: any) {
      console.error('JSON export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to generate JSON backup');
    }
  };

  const handleDownloadExcel = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const limitCheck = await checkAndIncrementLimit(userId, 'exports');
    if (!limitCheck.allowed) {
      Alert.alert(
        '⚠️ Monthly Limit Reached',
        limitCheck.message + '\n\nUpgrade to Pro for unlimited exports!',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      downloadExcelFromPackage(taxPackage.data);
      
      // Track analytics
      const { trackExportCreated } = await import('../lib/analytics');
      trackExportCreated({ export_type: 'excel', source: 'exports_screen' });
      
      Alert.alert('Success', 'Excel file has been downloaded!');
    } catch (error: any) {
      console.error('Excel export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to generate Excel file');
    }
  };

  const handleDownloadPDF = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const limitCheck = await checkAndIncrementLimit(userId, 'exports');
    if (!limitCheck.allowed) {
      Alert.alert(
        '⚠️ Monthly Limit Reached',
        limitCheck.message + '\n\nUpgrade to Pro for unlimited exports!',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      const pdfBytes = await generateScheduleCSummaryPdf({
        pkg: taxPackage.data,
        appVersion: 'Bozzy v1.0',
      });

      const { downloadBinaryFile } = await import('../lib/exports/webDownloadHelpers');
      await downloadBinaryFile(pdfBytes, `ScheduleC_Summary_${taxYear}.pdf`, 'application/pdf');

      Alert.alert('Success', 'PDF has been downloaded!');
    } catch (error: any) {
      console.error('PDF export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to generate PDF');
    }
  };

  const handleDownloadTXF = async () => {
    // Check export limit
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    const limitCheck = await checkAndIncrementLimit(userId, 'exports');
    
    if (!limitCheck.allowed) {
      Alert.alert(
        '⚠️ Monthly Limit Reached',
        limitCheck.message + '\n\nUpgrade to Pro for unlimited exports!',
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    if (!validationResult?.isValid) {
      Alert.alert(
        'Validation Required',
        'Please fix all blocking errors before exporting. Tap "View Issues" to see details.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Issues', onPress: () => setShowValidationDetails(true) },
        ]
      );
      return;
    }

    // Generate and download TXF file
    try {
      console.log('Generating TXF file...');
      
      // Get user profile for taxpayer info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const taxpayerName = profileData?.full_name || 'Taxpayer';
      
      // Check if data is loaded
      if (!gigs.data || !expenses.data || !mileage.data) {
        throw new Error('Export data not loaded yet. Please wait.');
      }
      
      // Transform data to export format (same as validation)
      const gigsExport = gigs.data.map(g => ({
        ...g,
        gig_id: g.user_id,
        title: g.payer || 'Gig',
        payer_name: g.payer,
        payer_ein_or_ssn: null,
        city: g.city_state?.split(',')[0] || null,
        state: g.city_state?.split(',')[1]?.trim() || null,
        country: 'US',
        payment_method: null,
        invoice_url: null,
        paid: true,
        withholding_federal: 0,
        withholding_state: 0,
      })) as GigExportRow[];

      const expensesExport = expenses.data.map(e => ({
        ...e,
        expense_id: e.user_id,
        merchant: e.vendor,
        gl_category: e.category,
        irs_schedule_c_line: '27a',
        meals_percent_allowed: e.category === 'Meals' ? 0.5 : 1,
        linked_gig_id: null,
      })) as ExpenseExportRow[];
      
      // Calculate Schedule C summary from raw data
      const grossReceipts = gigs.data.reduce((sum, g) => sum + (g.gross_amount || 0) + (g.tips || 0) + (g.per_diem || 0) + (g.other_income || 0), 0);
      const fees = gigs.data.reduce((sum, g) => sum + (g.fees || 0), 0);
      const totalIncome = grossReceipts - fees;
      
      const expensesByCategory: Record<string, number> = {};
      expenses.data.forEach(e => {
        const cat = e.category || 'Other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
      });
      
      const mileageDeduction = mileage.data.reduce((sum, m) => sum + (m.deduction_amount || 0), 0);
      
      const advertising = expensesByCategory['Marketing'] || 0;
      const carTruck = mileageDeduction;
      const supplies = expensesByCategory['Supplies'] || 0;
      const travel = (expensesByCategory['Travel'] || 0) + (expensesByCategory['Lodging'] || 0);
      const meals = (expensesByCategory['Meals'] || 0) * 0.5;
      const officeExpense = expensesByCategory['Software'] || 0;
      const legalProfessional = expensesByCategory['Fees'] || 0;
      const otherExpenses = Object.entries(expensesByCategory)
        .filter(([cat]) => !['Marketing', 'Supplies', 'Travel', 'Lodging', 'Meals', 'Software', 'Fees'].includes(cat))
        .reduce((sum, [, amount]) => sum + amount, 0);
      
      const totalExpenses = advertising + carTruck + supplies + travel + meals + officeExpense + legalProfessional + otherExpenses;
      const netProfit = totalIncome - totalExpenses;
      
      const seTax = taxBreakdown?.selfEmployment || 0;
      const estimatedIncomeTax = taxBreakdown?.federalIncome || 0;
      const estimatedStateTax = taxBreakdown?.stateIncome || 0;
      const totalTax = taxBreakdown?.total || 0;
      
      const scheduleCSummaryData = {
        tax_year: taxYear,
        filing_status: 'single' as const,
        state_of_residence: 'XX',
        standard_or_itemized: 'itemized' as const,
        gross_receipts: grossReceipts - fees,
        returns_and_allowances: 0,
        other_income: 0,
        total_income: totalIncome,
        advertising,
        car_truck: carTruck,
        commissions: 0,
        contract_labor: 0,
        depreciation: 0,
        employee_benefit: 0,
        insurance_other: 0,
        interest_mortgage: 0,
        interest_other: 0,
        legal_professional: legalProfessional,
        office_expense: officeExpense,
        rent_vehicles: 0,
        rent_other: 0,
        repairs_maintenance: 0,
        supplies,
        taxes_licenses: 0,
        travel,
        meals_allowed: meals,
        utilities: 0,
        wages: 0,
        other_expenses_total: otherExpenses,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        se_tax_basis: netProfit * 0.9235,
        est_se_tax: seTax,
        est_federal_income_tax: estimatedIncomeTax,
        est_state_income_tax: estimatedStateTax,
        est_total_tax: totalTax,
        set_aside_suggested: totalTax,
      };
      
      // Generate TXF content
      const txfContent = generateTXF({
        taxYear,
        taxpayerName,
        gigs: gigsExport,
        expenses: expensesExport,
        scheduleCSummary: scheduleCSummaryData,
      });
      
      // Download the file
      await downloadTXF(txfContent, taxYear);
      
      console.log('TXF file downloaded successfully');
      
      // Show success message with instructions
      Alert.alert(
        'TXF Export Complete',
        'Your TXF file has been downloaded. This file can be imported into TurboTax Desktop (NOT TurboTax Online).\n\nTap "View Instructions" to see how to import it.',
        [
          { 
            text: 'View Instructions', 
            onPress: () => setShowTXFInfo(true)
          },
          { text: 'Done' },
        ]
      );
    } catch (error: any) {
      console.error('TXF export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to generate TXF file');
    }
  };

  const handleDownloadTurboTaxTXF = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      const { filename, content } = generateTXFv042({
        pkg: taxPackage.data,
        flavor: 'turbotax',
        appVersion: '1.0.0',
      });

      downloadTXFWeb(content, filename);

      Alert.alert(
        'TurboTax Desktop TXF Export Complete',
        'Your TXF file has been downloaded. This file can be imported into TurboTax Desktop (NOT TurboTax Online).\n\nThese exports organize your Bozzy data for tax preparation. They are not tax advice and may require review/adjustment. Please verify totals and consult a tax professional if you\'re unsure.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('TurboTax TXF export error:', error);
      if (error instanceof TaxExportError && error.code === 'NON_USD_CURRENCY') {
        setTaxExportError(error.message);
        Alert.alert('Currency Error', error.message);
      } else {
        Alert.alert('Export Error', error.message || 'Failed to generate TurboTax TXF file');
      }
    }
  };

  const handleDownloadHRBlockTXF = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      const { filename, content } = generateTXFv042({
        pkg: taxPackage.data,
        flavor: 'hrblock',
        appVersion: '1.0.0',
      });

      downloadTXFWeb(content, filename);

      Alert.alert(
        'H&R Block Desktop TXF Export Complete',
        'Your TXF file has been downloaded. This file can be imported into H&R Block Desktop.\n\nThese exports organize your Bozzy data for tax preparation. They are not tax advice and may require review/adjustment. Please verify totals and consult a tax professional if you\'re unsure.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('H&R Block TXF export error:', error);
      if (error instanceof TaxExportError && error.code === 'NON_USD_CURRENCY') {
        setTaxExportError(error.message);
        Alert.alert('Currency Error', error.message);
      } else {
        Alert.alert('Export Error', error.message || 'Failed to generate H&R Block TXF file');
      }
    }
  };

  const handleDownloadTaxActPack = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      const { filename, bytes } = await generateTaxActPackZip({
        pkg: taxPackage.data,
        appVersion: '1.0.0',
      });

      downloadZip(bytes, filename);

      Alert.alert(
        'TaxAct Tax Prep Pack Export Complete',
        'Your ZIP file has been downloaded with CSVs, PDF summary, and README.\n\nTaxAct export is a Tax Prep Pack (ZIP) designed for easy manual entry and CPA sharing.\n\nThese exports organize your Bozzy data for tax preparation. They are not tax advice and may require review/adjustment. Please verify totals and consult a tax professional if you\'re unsure.',
        [
          { text: 'View Info', onPress: () => setShowTaxActInfo(true) },
          { text: 'Done' },
        ]
      );
    } catch (error: any) {
      console.error('TaxAct pack export error:', error);
      if (error instanceof TaxExportError && error.code === 'NON_USD_CURRENCY') {
        setTaxExportError(error.message);
        Alert.alert('Currency Error', error.message);
      } else {
        Alert.alert('Export Error', error.message || 'Failed to generate TaxAct pack');
      }
    }
  };

  const handleDownloadTurboTaxOnlinePack = async () => {
    setTaxExportError(null);
    const userId = await getSharedUserId();
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!taxPackage.data) {
      Alert.alert('Error', 'Tax export package not loaded. Please wait or refresh.');
      return;
    }

    try {
      const bytes = await generateTurboTaxOnlinePack(taxPackage.data);
      const filename = `TurboTax_Online_Manual_Entry_Pack_${taxYear}.zip`;

      downloadZip(bytes, filename);

      Alert.alert(
        'TurboTax Online Manual Entry Pack Downloaded',
        'Your ZIP file includes Schedule C summary, detail CSVs, PDF, and step-by-step README for manual entry into TurboTax Online.\n\nIMPORTANT: TurboTax Online does NOT support TXF import. Use the included files for manual entry.\n\nOrganized for tax prep. Not tax advice. Verify totals and consult a tax professional if needed.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('TurboTax Online pack export error:', error);
      if (error instanceof TaxExportError && error.code === 'NON_USD_CURRENCY') {
        setTaxExportError(error.message);
        Alert.alert('Currency Error', error.message);
      } else {
        Alert.alert('Export Error', error.message || 'Failed to generate TurboTax Online pack');
      }
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const warningCount = validationResult?.warnings?.length ?? 0;
  const hasWarnings = warningCount > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ── Summary bar ─────────────────────────────── */}
      <StatsSummaryBar
        style={{ marginBottom: 14 }}
        items={[
          { label: 'GIGS', value: isLoading ? '—' : (gigs.data?.length ?? 0) },
          { label: 'EXPENSES', value: isLoading ? '—' : (expenses.data?.length ?? 0) },
          { label: 'MILEAGE', value: isLoading ? '—' : (mileage.data?.length ?? 0) },
          { label: 'PAYERS', value: isLoading ? '—' : (payers.data?.length ?? 0) },
        ]}
      />

      {/* ── Warning callout (conditional) ───────────── */}
      {hasWarnings && (
        <View style={styles.warningCallout}>
          <Text style={styles.warningCalloutIcon}>⚠️</Text>
          <View style={styles.warningCalloutBody}>
            <Text style={styles.warningCalloutTitle}>{warningCount} warnings found</Text>
            <Text style={styles.warningCalloutDesc}>Won't block your export, but review for accuracy before filing.</Text>
            <TouchableOpacity onPress={() => setShowValidationDetails(true)}>
              <Text style={styles.warningCalloutLink}>View Warnings →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Filters ─────────────────────────────────── */}
      <Text style={styles.sectionLabel}>FILTERS</Text>
      <View style={styles.filtersCard}>
        <Text style={styles.yearSubLabel}>TAX YEAR</Text>
        <View style={styles.yearRow}>
          {yearOptions.map((year) => (
            <TouchableOpacity
              key={year}
              style={[styles.yearBtn, taxYear === year && !customDateRange && styles.yearBtnActive]}
              onPress={() => { setTaxYear(year); setCustomDateRange(false); }}
            >
              <Text style={taxYear === year && !customDateRange ? { ...styles.yearBtnText, ...styles.yearBtnTextActive } : styles.yearBtnText}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Toggle: Use Custom Date Range */}
        <TouchableOpacity style={styles.toggleRow} onPress={() => setCustomDateRange(!customDateRange)} activeOpacity={0.8}>
          <Text style={styles.toggleLabel}>Use Custom Date Range</Text>
          <View style={[styles.toggleTrack, customDateRange ? styles.toggleTrackOn : styles.toggleTrackOff]}>
            <View style={[styles.toggleThumb, customDateRange ? styles.toggleThumbOn : styles.toggleThumbOff]} />
          </View>
        </TouchableOpacity>
        {/* Toggle: Include Tips */}
        <TouchableOpacity style={[styles.toggleRow, styles.toggleRowBorder]} onPress={() => setIncludeTips(!includeTips)} activeOpacity={0.8}>
          <Text style={styles.toggleLabel}>Include Tips in Income</Text>
          <View style={[styles.toggleTrack, includeTips ? styles.toggleTrackOn : styles.toggleTrackOff]}>
            <View style={[styles.toggleThumb, includeTips ? styles.toggleThumbOn : styles.toggleThumbOff]} />
          </View>
        </TouchableOpacity>
        {/* Toggle: Include Fees */}
        <TouchableOpacity style={[styles.toggleRow, styles.toggleRowBorder]} onPress={() => setIncludeFees(!includeFees)} activeOpacity={0.8}>
          <Text style={styles.toggleLabel}>Include Fees as Deduction</Text>
          <View style={[styles.toggleTrack, includeFees ? styles.toggleTrackOn : styles.toggleTrackOff]}>
            <View style={[styles.toggleThumb, includeFees ? styles.toggleThumbOn : styles.toggleThumbOff]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Tax Software ────────────────────────────── */}
      <Text style={styles.sectionLabel}>TAX SOFTWARE</Text>
      <View style={styles.exportGroupCard}>
        {/* TurboTax Online */}
        <View style={styles.exportRow}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.greenLight }]}>
            <Text style={styles.exportIconEmoji}>📊</Text>
          </View>
          <View style={styles.exportInfo}>
            <View style={styles.exportNameRow}>
              <Text style={styles.exportName}>TurboTax Online</Text>
              <View style={styles.badgeRecommended}><Text style={styles.badgeRecommendedText}>RECOMMENDED</Text></View>
            </View>
            <Text style={styles.exportDesc}>Schedule C summary + detail. Best for self-filing online.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadTurboTaxOnlinePack} disabled={!taxPackage.data || taxPackage.isLoading}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedSoftware('turbotax-online'); setShowHowToImport(true); }}>
              <Text style={styles.howToLink}>How to import</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* TurboTax Desktop */}
        <View style={[styles.exportRow, styles.exportRowBorder]}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.accentLight }]}>
            <Text style={styles.exportIconEmoji}>🖥️</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportName}>TurboTax Desktop</Text>
            <Text style={styles.exportDesc}>TXF format. For desktop app only, not Online.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadTurboTaxTXF} disabled={!taxPackage.data || taxPackage.isLoading}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedSoftware('turbotax-desktop'); setShowHowToImport(true); }}>
              <Text style={styles.howToLink}>How to import</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* H&R Block */}
        <View style={[styles.exportRow, styles.exportRowBorder]}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.amberLight }]}>
            <Text style={styles.exportIconEmoji}>🧾</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportName}>H&R Block Desktop</Text>
            <Text style={styles.exportDesc}>Import into H&R Block Desktop software.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadHRBlockTXF} disabled={!taxPackage.data || taxPackage.isLoading}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedSoftware('hrblock-desktop'); setShowHowToImport(true); }}>
              <Text style={styles.howToLink}>How to import</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* TaxAct */}
        <View style={[styles.exportRow, styles.exportRowBorder]}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.surface2 }]}>
            <Text style={styles.exportIconEmoji}>📋</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportName}>TaxAct Tax Prep Pack</Text>
            <Text style={styles.exportDesc}>ZIP bundle for TaxAct manual entry or CPA sharing.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadTaxActPack} disabled={!taxPackage.data || taxPackage.isLoading}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedSoftware('taxact'); setShowHowToImport(true); }}>
              <Text style={styles.howToLink}>How to import</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Share with a CPA ─────────────────────── */}
      <Text style={styles.sectionLabel}>SHARE WITH A CPA</Text>
      <View style={styles.exportGroupCard}>
        {/* CSV Bundle */}
        <View style={styles.exportRow}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.greenLight }]}>
            <Text style={styles.exportIconEmoji}>📦</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportName}>CSV Bundle (ZIP)</Text>
            <Text style={styles.exportDesc}>7 CSVs in one ZIP — complete data for any preparer.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadCSVs}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Excel */}
        <View style={[styles.exportRow, styles.exportRowBorder]}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.dangerLight }]}>
            <Text style={styles.exportIconEmoji}>📗</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportName}>Excel (.xlsx)</Text>
            <Text style={styles.exportDesc}>Single file with separate sheets per data type.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadExcel}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* PDF Summary */}
        <View style={[styles.exportRow, styles.exportRowBorder]}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.amberLight }]}>
            <Text style={styles.exportIconEmoji}>📄</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportName}>PDF Summary</Text>
            <Text style={styles.exportDesc}>Tax-ready summary formatted for your CPA.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPDF}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Backup ───────────────────────────────── */}
      <Text style={styles.sectionLabel}>BACKUP</Text>
      <View style={styles.exportGroupCard}>
        <View style={styles.exportRow}>
          <View style={[styles.exportIconWrap, { backgroundColor: T.surface2 }]}>
            <Text style={styles.exportIconEmoji}>💾</Text>
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportName}>JSON Backup</Text>
            <Text style={styles.exportDesc}>Complete data archive in JSON format.</Text>
          </View>
          <View style={styles.exportActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadJSON}>
              <Text style={styles.downloadBtnText}>↓ Download</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Tax Season Checklist ─────────────────── */}
      <TouchableOpacity style={styles.checklistRow} onPress={() => setShowTaxPrepChecklist(!showTaxPrepChecklist)} activeOpacity={0.8}>
        <Text style={styles.checklistIcon}>📋</Text>
        <Text style={styles.checklistText}>Tax Season Prep Checklist</Text>
        <Text style={styles.checklistArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Legacy / Troubleshooting ─────────────── */}
      <TouchableOpacity style={styles.legacyRow} onPress={() => setShowLegacySection(!showLegacySection)} activeOpacity={0.8}>
        <Text style={styles.legacyRowLabel}>Legacy / Troubleshooting</Text>
        <Text style={styles.legacyRowArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Disclaimer ───────────────────────────── */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerIcon}>✅</Text>
        <Text style={styles.disclaimerTitle}>You have everything you need</Text>
        <Text style={styles.disclaimerBody}>These exports organize your data for tax preparation. Review and verify all totals before filing.</Text>
        <Text style={styles.disclaimerFine}>When in doubt, consult a tax professional for guidance specific to your situation.</Text>
      </View>

      {/* ── How To Import Modal ───────────────────── */}
      <HowToImportModal
        visible={showHowToImport}
        software={selectedSoftware}
        onClose={() => { setShowHowToImport(false); setSelectedSoftware(null); }}
      />

      {/* TXF Info Modal */}
      <Modal visible={showTXFInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>TXF Format Information</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                {getTXFImportInstructions()}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowTXFInfo(false)}
            >
              <Text style={styles.modalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TaxAct Info Modal */}
      <Modal visible={showTaxActInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>TaxAct Tax Prep Pack</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                {`Your ZIP file contains:\n\n• ScheduleC_Summary_${taxYear}.csv - Main Schedule C totals\n• Expense_Detail_${taxYear}.csv - All expenses with categories\n• Income_Detail_${taxYear}.csv - All income transactions\n• Mileage_${taxYear}.csv - Business mileage log\n• PDF_Summary_${taxYear}.pdf - Professional summary for your CPA\n• README_Tax_Filing_${taxYear}.txt - Instructions and notes\n\nHow to use:\n\n1. Extract the ZIP file\n2. Review the PDF summary for totals\n3. Use the CSV files for manual entry into TaxAct or share with your CPA\n4. Keep the README for reference\n\nImportant: These exports organize your GigLedger data for tax preparation. They are not tax advice and may require review/adjustment. Please verify totals and consult a tax professional if you're unsure.`}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowTaxActInfo(false)}
            >
              <Text style={styles.modalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Validation Details Modal */}
      <Modal visible={showValidationDetails} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Validation Issues</Text>
            <ScrollView style={styles.modalScroll}>
              {validationResult?.errors && validationResult.errors.length > 0 && (
                <>
                  <Text style={styles.issuesSectionTitle}>
                    \u274c Blocking Errors ({validationResult.errors.length})
                  </Text>
                  {validationResult.errors.map((issue, idx) => (
                    <View key={idx} style={styles.issueCard}>
                      <Text style={styles.issueCategory}>{issue.category}</Text>
                      <Text style={styles.issueMessage}>{issue.message}</Text>
                    </View>
                  ))}
                </>
              )}
              
              {validationResult?.warnings && validationResult.warnings.length > 0 && (
                <>
                  <Text style={styles.issuesSectionTitle}>
                    ⚠️ Warnings ({validationResult.warnings.length})
                  </Text>
                  {validationResult.warnings.map((issue, idx) => (
                    <View key={idx} style={[styles.issueCard, styles.issueCardWarning]}>
                      <Text style={styles.issueCategory}>{issue.category}</Text>
                      <Text style={styles.issueMessage}>{issue.message}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowValidationDetails(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          // Navigation to subscription tab would happen here
          // For now, just close the modal
        }}
        title="Exports are a Pro feature"
        message="Upgrade to Pro to export your gigs, expenses, mileage, and tax summaries in formats ready for tax prep tools."
      />
    </ScrollView>
  );
}

const T = {
  bg: colors.surface.canvas,
  surfacePanel: colors.surface.DEFAULT,
  surface: colors.surface.elevated,
  surface2: colors.surface.muted,
  border: colors.border.DEFAULT,
  borderMuted: colors.border.muted,
  textPrimary: colors.text.DEFAULT,
  textSecondary: colors.text.muted,
  textMuted: colors.text.subtle,
  textOnBrand: colors.brand.foreground,
  green: colors.success.DEFAULT,
  greenLight: colors.success.muted,
  amber: colors.warning.DEFAULT,
  amberLight: colors.warning.muted,
  danger: colors.danger.DEFAULT,
  dangerLight: colors.danger.muted,
  accent: colors.brand.DEFAULT,
  accentLight: colors.brand.muted,
  overlay: colors.overlay.DEFAULT,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  contentContainer: { paddingBottom: 40 },

  // ── Warning callout ──────────────────────────────
  warningCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 10,
    marginBottom: 16,
    backgroundColor: T.amberLight,
    borderRadius: 14,
    padding: 14,
  },
  warningCalloutIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  warningCalloutBody: { flex: 1 },
  warningCalloutTitle: { fontSize: 13, fontWeight: '700', color: T.amber },
  warningCalloutDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: T.amber,
    opacity: 0.85,
    marginTop: 3,
    lineHeight: 17,
  },
  warningCalloutLink: {
    fontSize: 13,
    fontWeight: '700',
    color: T.accent,
    marginTop: 8,
  },

  // ── Section label ────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },

  // ── Filters card ─────────────────────────────────
  filtersCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: 10,
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  yearSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  yearBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
  },
  yearBtnActive: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  yearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
  },
  yearBtnTextActive: {
    color: T.textOnBrand,
  },

  // ── iOS-style toggle ─────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: T.textPrimary,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: T.accent },
  toggleTrackOff: { backgroundColor: T.surface2 },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: T.surface,
    shadowColor: colors.overlay.DEFAULT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    position: 'absolute',
  },
  toggleThumbOn: { right: 3 },
  toggleThumbOff: { left: 3 },

  // ── Export group card ────────────────────────────
  exportGroupCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  exportRowBorder: {
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  exportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exportIconEmoji: { fontSize: 20 },
  exportInfo: { flex: 1, minWidth: 0 },
  exportNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  exportName: {
    fontSize: 14,
    fontWeight: '700',
    color: T.textPrimary,
  },
  exportDesc: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  exportActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  downloadBtn: {
    backgroundColor: T.greenLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.green,
  },
  howToLink: {
    fontSize: 11,
    fontWeight: '500',
    color: T.textMuted,
    textDecorationLine: 'underline',
  },

  // ── Recommended badge ────────────────────────────
  badgeRecommended: {
    backgroundColor: T.greenLight,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeRecommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.green,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ── Checklist row ────────────────────────────────
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 10,
    marginBottom: 16,
    backgroundColor: T.accentLight,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  checklistIcon: { fontSize: 20, flexShrink: 0 },
  checklistText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: T.accent,
  },
  checklistArrow: { fontSize: 18, color: T.accent },

  // ── Legacy row ───────────────────────────────────
  legacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginBottom: 16,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  legacyRowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: T.textMuted,
  },
  legacyRowArrow: { fontSize: 18, color: T.textMuted },

  // ── Disclaimer ───────────────────────────────────
  disclaimer: {
    marginHorizontal: 10,
    marginBottom: 16,
    backgroundColor: T.greenLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  disclaimerIcon: { fontSize: 24, marginBottom: 8 },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.green,
    marginBottom: 6,
    textAlign: 'center',
  },
  disclaimerBody: {
    fontSize: 12,
    color: T.green,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.85,
  },
  disclaimerFine: {
    fontSize: 11,
    fontStyle: 'italic',
    color: T.green,
    opacity: 0.7,
    marginTop: 8,
    lineHeight: 16,
    textAlign: 'center',
  },

  // ── Modals (kept for existing modal JSX) ─────────
  modalOverlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 24,
    maxWidth: 500,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 16,
  },
  modalScroll: { maxHeight: 400, marginBottom: 20 },
  modalText: { fontSize: 14, color: T.textSecondary, lineHeight: 20 },
  modalButton: {
    backgroundColor: T.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: { fontSize: 15, fontWeight: '600', color: T.textOnBrand },
  issuesSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textPrimary,
    marginTop: 16,
    marginBottom: 10,
  },
  issueCard: {
    backgroundColor: T.dangerLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: T.danger,
  },
  issueCardWarning: {
    backgroundColor: T.amberLight,
    borderLeftColor: T.amber,
  },
  issueCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: T.danger,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  issueMessage: { fontSize: 13, color: T.textSecondary, lineHeight: 18 },
});
