import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { H1, H2, H3, Text, Button, Card, Badge } from '../ui';
import { ExportCard } from '../components/ExportCard';
import { HowToImportModal, type TaxSoftware } from '../components/HowToImportModal';
import { colors, spacing, radius, typography } from '../styles/theme';
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
import { downloadExcel } from '../lib/exports/excel-generator';
import { openScheduleCPDF } from '../lib/exports/pdf-generator';
import type { GigExportRow, ExpenseExportRow, MileageExportRow } from '../lib/exports/schemas';
import { useWithholding } from '../hooks/useWithholding';
import { useTaxExportPackage } from '../hooks/useTaxExportPackage';
import { generateTXFv042 } from '../lib/exports/txf-v042-generator';
import { generateTaxActPackZip } from '../lib/exports/taxact-pack';
import { generateTurboTaxOnlinePack } from '../lib/exports/turbotax-online-pack';
import { downloadTXF as downloadTXFWeb, downloadZip } from '../lib/exports/webDownloadHelpers';
import { TaxExportError } from '../lib/exports/buildTaxExportPackage';

export function ExportsScreen() {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
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

  // Fetch canonical tax export package (new)
  const taxPackage = useTaxExportPackage({
    userId: currentUserId,
    taxYear,
    timezone: 'America/New_York',
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
    const totalMiles = mileage.data.reduce((sum, m) => sum + m.miles, 0);
    const totalMileageDeduction = totalMiles * 0.67; // Standard mileage rate
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
        standard_rate: 0.67,
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
      generateCSVBundle(taxPackage.data);
      Alert.alert('Success', 'CSV files are being downloaded. Check your downloads folder.');
    } catch (error: any) {
      console.error('CSV export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to generate CSV files');
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
        appVersion: 'GigLedger v1.0',
      });

      // Download PDF
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ScheduleC_Summary_${taxYear}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

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
      
      const mileageDeduction = mileage.data.reduce((sum, m) => sum + (m.deduction_amount || m.miles * 0.67), 0);
      
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
      downloadTXF(txfContent, taxYear);
      
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
        'Your TXF file has been downloaded. This file can be imported into TurboTax Desktop (NOT TurboTax Online).\n\nThese exports organize your GigLedger data for tax preparation. They are not tax advice and may require review/adjustment. Please verify totals and consult a tax professional if you\'re unsure.',
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
        'Your TXF file has been downloaded. This file can be imported into H&R Block Desktop.\n\nThese exports organize your GigLedger data for tax preparation. They are not tax advice and may require review/adjustment. Please verify totals and consult a tax professional if you\'re unsure.',
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
        'Your ZIP file has been downloaded with CSVs, PDF summary, and README.\n\nTaxAct export is a Tax Prep Pack (ZIP) designed for easy manual entry and CPA sharing.\n\nThese exports organize your GigLedger data for tax preparation. They are not tax advice and may require review/adjustment. Please verify totals and consult a tax professional if you\'re unsure.',
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <H1>Export Center</H1>
        <Text muted>
          Download tax-ready exports for self-filing or CPA sharing
        </Text>
      </View>

      {/* Tax Season Prep Checklist */}
      <View style={styles.taxPrepSection}>
        <TouchableOpacity 
          style={styles.taxPrepHeader}
          onPress={() => setShowTaxPrepChecklist(!showTaxPrepChecklist)}
        >
          <Text style={styles.taxPrepTitle}>🧾 Tax Season Prep Checklist</Text>
          <Text style={styles.taxPrepToggle}>{showTaxPrepChecklist ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        
        {showTaxPrepChecklist && (
          <View style={styles.taxPrepContent}>
            <Text style={styles.taxPrepIntro}>
              Before exporting, take a couple minutes to make sure your data is ready. This helps avoid back-and-forth later with your CPA or tax software.
            </Text>
            
            <View style={styles.checklistItems}>
              <View style={styles.checklistItem}>
                <Text style={styles.checklistIcon}>✓</Text>
                <Text style={styles.checklistText}>All gigs for the year are entered</Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={styles.checklistIcon}>✓</Text>
                <Text style={styles.checklistText}>Expenses are added (estimates are OK)</Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={styles.checklistIcon}>✓</Text>
                <Text style={styles.checklistText}>Mileage is logged if applicable</Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={styles.checklistIcon}>✓</Text>
                <Text style={styles.checklistText}>Business structure is set correctly (Account → Tax Profile)</Text>
              </View>
            </View>
            
            <View style={styles.taxPrepReassurance}>
              <Text style={styles.taxPrepReassuranceText}>
                Don't worry — perfection isn't required. Clean, honest data beats perfect data entered late.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Filters Section */}
      <View style={styles.filtersSection}>
        <H2>Filters</H2>

        {/* Tax Year Selector */}
        <View style={styles.filterGroup}>
          <Text semibold>Tax Year</Text>
          <View style={styles.yearButtons}>
            {yearOptions.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  taxYear === year && !customDateRange && styles.yearButtonActive,
                ]}
                onPress={() => {
                  setTaxYear(year);
                  setCustomDateRange(false);
                }}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    taxYear === year && !customDateRange && styles.yearButtonTextActive,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Date Range Toggle */}
        <TouchableOpacity
          style={styles.customRangeToggle}
          onPress={() => setCustomDateRange(!customDateRange)}
        >
          <View style={[styles.checkbox, customDateRange && styles.checkboxActive]}>
            {customDateRange && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text>Use custom date range</Text>
        </TouchableOpacity>

        {/* Include Options */}
        <View style={styles.includeOptions}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setIncludeTips(!includeTips)}
          >
            <View style={[styles.checkbox, includeTips && styles.checkboxActive]}>
              {includeTips && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text>Include Tips in Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setIncludeFees(!includeFees)}
          >
            <View style={[styles.checkbox, includeFees && styles.checkboxActive]}>
              {includeFees && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text>Include Fees as Deduction</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Summary */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
          <Text muted>Loading export data...</Text>
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <H3 style={{ color: colors.danger.DEFAULT }}>Error loading data</H3>
          <Text muted>
            {gigs.error?.message || expenses.error?.message || mileage.error?.message || 
             payers.error?.message || scheduleC.error?.message || 'Please try again later'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summarySection}>
            <H2>Data Summary</H2>
            <View style={styles.summaryGrid}>
              <Card variant="flat" style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{gigs.data?.length || 0}</Text>
                <Text subtle>Gigs</Text>
              </Card>
              <Card variant="flat" style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{expenses.data?.length || 0}</Text>
                <Text subtle>Expenses</Text>
              </Card>
              <Card variant="flat" style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{mileage.data?.length || 0}</Text>
                <Text subtle>Mileage Entries</Text>
              </Card>
              <Card variant="flat" style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{payers.data?.length || 0}</Text>
                <Text subtle>Payers</Text>
              </Card>
            </View>
            
            {/* No data warning */}
            {(gigs.data?.length === 0 && expenses.data?.length === 0 && mileage.data?.length === 0) && (
              <Card variant="flat" style={styles.noDataWarning}>
                <Text style={styles.noDataIcon}>📭</Text>
                <Text semibold>
                  No data found for {customDateRange ? 'selected date range' : taxYear}
                </Text>
                <Text subtle>
                  Try selecting a different year or date range above
                </Text>
              </Card>
            )}
          </View>

          {/* Validation Status Card */}
          {validationResult && (
            <View style={[
              styles.validationCard,
              !validationResult.isValid && styles.validationCardError,
              validationResult.warnings.length > 0 && validationResult.isValid && styles.validationCardWarning
            ]}>
              <Text style={styles.validationIcon}>
                {validationResult.isValid 
                  ? (validationResult.warnings.length > 0 ? '⚠️' : '✅')
                  : '❌'}
              </Text>
              <Text style={styles.validationTitle}>
                {validationResult.isValid 
                  ? (validationResult.warnings.length > 0 
                      ? 'Ready to Export (with warnings)' 
                      : 'All Checks Passed')
                  : `${validationResult.summary.blockingErrors} Issue(s) Must Be Fixed`}
              </Text>
              <Text style={styles.validationText}>
                {validationResult.isValid 
                  ? (validationResult.warnings.length > 0
                      ? `${validationResult.warnings.length} warning(s) found. These won't block your export, but you should review them for accuracy.`
                      : 'Your data is ready to export. No issues found.')
                  : getValidationSummary(validationResult)}
              </Text>
              {(validationResult.warnings.length > 0 || !validationResult.isValid) && (
                <TouchableOpacity onPress={() => setShowValidationDetails(true)}>
                  <Text style={styles.validationLink}>
                    {validationResult.warnings.length > 0 && validationResult.isValid
                      ? 'View Warnings →'
                      : 'View Issues →'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tax Software Section */}
          <View style={styles.exportSection}>
            <H2>Tax Software</H2>
            <Text muted style={styles.sectionSubtitle}>Import or manually enter into tax software</Text>
            
            <View style={styles.exportGrid}>

              <ExportCard
                title="TurboTax Online Manual Entry Pack"
                subtitle="Best for TurboTax Online self-filing. Includes Schedule C summary + detail CSVs + PDF + import guide."
                icon={<Text style={{ fontSize: 20 }}>📦</Text>}
                badge="recommended"
                onPress={handleDownloadTurboTaxOnlinePack}
                onHelpPress={() => {
                  setSelectedSoftware('turbotax-online');
                  setShowHowToImport(true);
                }}
                loading={taxPackage.isLoading}
                disabled={!taxPackage.data || taxPackage.isLoading}
              />

              <ExportCard
                title="TurboTax Desktop (TXF)"
                subtitle="Import into TurboTax Desktop (NOT Online)."
                icon={<Text style={{ fontSize: 20 }}>🧾</Text>}
                onPress={handleDownloadTurboTaxTXF}
                onHelpPress={() => {
                  setSelectedSoftware('turbotax-desktop');
                  setShowHowToImport(true);
                }}
                loading={taxPackage.isLoading}
                disabled={!taxPackage.data || taxPackage.isLoading}
              />

              <ExportCard
                title="H&R Block Desktop (TXF)"
                subtitle="Import into H&R Block Desktop."
                icon={<Text style={{ fontSize: 20 }}>📋</Text>}
                onPress={handleDownloadHRBlockTXF}
                onHelpPress={() => {
                  setSelectedSoftware('hrblock-desktop');
                  setShowHowToImport(true);
                }}
                loading={taxPackage.isLoading}
                disabled={!taxPackage.data || taxPackage.isLoading}
              />

              <ExportCard
                title="TaxAct Tax Prep Pack (ZIP)"
                subtitle="For TaxAct manual entry and CPA sharing."
                icon={<Text style={{ fontSize: 20 }}>📄</Text>}
                onPress={handleDownloadTaxActPack}
                onHelpPress={() => {
                  setSelectedSoftware('taxact');
                  setShowHowToImport(true);
                }}
                loading={taxPackage.isLoading}
                disabled={!taxPackage.data || taxPackage.isLoading}
              />
            </View>
          </View>

          {/* CPA Sharing Section */}
          <View style={styles.exportSection}>
            <H2>Share with a CPA</H2>
            <Text muted style={styles.sectionSubtitle}>Professional-ready formats for tax preparers</Text>
            
            <View style={styles.exportGrid}>
              <ExportCard
                title="CSV Bundle"
                subtitle="CPA-ready CSV bundle."
                icon={<Text style={{ fontSize: 20 }}>📊</Text>}
                onPress={handleDownloadCSVs}
                disabled={!validationResult?.isValid}
              />

              <ExportCard
                title="Excel (.xlsx)"
                subtitle="One .xlsx file with separate sheets."
                icon={<Text style={{ fontSize: 20 }}>📘</Text>}
                onPress={handleDownloadExcel}
              />

              <ExportCard
                title="PDF Summary"
                subtitle="Tax-ready summary for your CPA."
                icon={<Text style={{ fontSize: 20 }}>📄</Text>}
                onPress={handleDownloadPDF}
              />
            </View>
          </View>

          {/* Backup Section */}
          <View style={styles.exportSection}>
            <H2>Backup</H2>
            <Text muted style={styles.sectionSubtitle}>Archive your data</Text>
            
            <View style={styles.exportGrid}>
              <ExportCard
                title="JSON Backup"
                subtitle="Complete data backup in JSON format."
                icon={<Text style={{ fontSize: 20 }}>💾</Text>}
                onPress={handleDownloadJSON}
              />
            </View>
          </View>

          {/* Legacy Section (Collapsed) */}
          <View style={styles.legacySection}>
            <TouchableOpacity
              style={styles.legacyHeader}
              onPress={() => setShowLegacySection(!showLegacySection)}
            >
              <Text style={styles.legacyTitle}>Legacy / Troubleshooting</Text>
              <Text style={styles.legacyToggle}>{showLegacySection ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            
            {showLegacySection && (
              <View style={styles.legacyContent}>
                <Text style={styles.legacyDescription}>
                  These are older export formats kept for compatibility. Most users should use the options above.
                </Text>
                <View style={styles.exportGrid}>

                  <ExportCard
                    title="TXF (Legacy)"
                    subtitle="Old TXF format for TurboTax Desktop. Use the newer TXF option above instead."
                    icon={<Text style={{ fontSize: 20 }}>💼</Text>}
                    onPress={handleDownloadTXF}
                    disabled={!validationResult?.isValid}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Finish Line Section */}
          <View style={styles.finishLineSection}>
            <Text style={styles.finishLineIcon}>✅</Text>
            <Text style={styles.finishLineTitle}>
              You now have everything you need to share with a CPA or complete manual entry in tax software.
            </Text>
            <Text style={styles.finishLineText}>
              Please review and verify totals before filing. These exports organize your data for tax preparation but are not tax advice.
            </Text>
            <Text style={styles.finishLineNote}>
              When in doubt, consult a tax professional for guidance specific to your situation.
            </Text>
          </View>

          {/* How To Import Modal */}
          <HowToImportModal
            visible={showHowToImport}
            software={selectedSoftware}
            onClose={() => {
              setShowHowToImport(false);
              setSelectedSoftware(null);
            }}
          />
        </>
      )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
  header: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[5]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  filtersSection: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[5]),
    marginTop: parseInt(spacing[3]),
    borderRadius: parseInt(radius.md),
    marginHorizontal: parseInt(spacing[4]),
  },
  filterGroup: {
    marginBottom: parseInt(spacing[5]),
  },
  yearButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[2]),
  },
  yearButton: {
    paddingVertical: parseInt(spacing[3]),
    paddingHorizontal: parseInt(spacing[5]),
    borderRadius: parseInt(radius.sm),
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  yearButtonActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  yearButtonText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  yearButtonTextActive: {
    color: colors.brand.foreground,
  },
  customRangeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: parseInt(spacing[4]),
  },
  includeOptions: {
    gap: parseInt(spacing[3]),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: parseInt(radius.sm),
    borderWidth: 2,
    borderColor: colors.border.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: parseInt(spacing[3]),
  },
  checkboxActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  checkmark: {
    color: colors.brand.foreground,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
  loadingContainer: {
    padding: parseInt(spacing[10]),
    alignItems: 'center',
    gap: parseInt(spacing[3]),
  },
  errorContainer: {
    padding: parseInt(spacing[10]),
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  summarySection: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[5]),
    marginTop: parseInt(spacing[3]),
    marginHorizontal: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[3]),
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: parseInt(spacing[1]),
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.DEFAULT,
  },
  exportSection: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[5]),
    marginTop: parseInt(spacing[3]),
    marginHorizontal: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
  },
  exportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[3]),
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    padding: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
    marginBottom: parseInt(spacing[3]),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonIcon: {
    fontSize: 32,
    marginRight: parseInt(spacing[4]),
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[1]),
  },
  exportButtonDescription: {
    fontSize: parseInt(typography.fontSize.caption.size),
    color: colors.text.muted,
  },
  taxHelperSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  taxHelperText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    textAlign: 'center',
  },
  helpSection: {
    backgroundColor: '#eff6ff',
    padding: 20,
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
    marginBottom: 12,
  },
  helpBold: {
    fontWeight: '600',
  },
  helpNote: {
    fontSize: 13,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  // Phase E: Validation & TXF styles
  validationCard: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[5]),
    marginTop: parseInt(spacing[3]),
    marginHorizontal: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
    borderWidth: 2,
    borderColor: colors.success.DEFAULT,
    alignItems: 'center',
  },
  validationCardError: {
    borderColor: colors.danger.DEFAULT,
  },
  validationCardWarning: {
    borderColor: colors.warning.DEFAULT,
    backgroundColor: colors.warning.muted,
  },
  validationIcon: {
    fontSize: 48,
    marginBottom: parseInt(spacing[3]),
  },
  validationTitle: {
    fontSize: parseInt(typography.fontSize.h3.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[2]),
  },
  validationText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  validationLink: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.DEFAULT,
  },
  sectionSubtitle: {
    marginBottom: parseInt(spacing[4]),
    marginTop: parseInt(spacing[1]) * -1,
  },
  exportButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: parseInt(spacing[1]),
  },
  exportButtonBadge: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning.DEFAULT,
    textTransform: 'uppercase',
  },
  infoIconButton: {
    padding: parseInt(spacing[1]),
    marginLeft: parseInt(spacing[2]),
  },
  infoIcon: {
    fontSize: 18,
    color: colors.brand.DEFAULT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: parseInt(spacing[5]),
  },
  modalContent: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: parseInt(radius.lg),
    padding: parseInt(spacing[6]),
    maxWidth: 500,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: parseInt(typography.fontSize.h2.size),
    fontWeight: typography.fontWeight.bold,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[4]),
  },
  modalScroll: {
    maxHeight: 400,
    marginBottom: parseInt(spacing[5]),
  },
  modalText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.muted,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: colors.brand.DEFAULT,
    padding: parseInt(spacing[4]),
    borderRadius: parseInt(radius.sm),
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.foreground,
  },
  issuesSectionTitle: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
    marginTop: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[3]),
  },
  issueCard: {
    backgroundColor: colors.danger.muted,
    padding: parseInt(spacing[3]),
    borderRadius: parseInt(radius.sm),
    marginBottom: parseInt(spacing[2]),
    borderLeftWidth: 3,
    borderLeftColor: colors.danger.DEFAULT,
  },
  issueCardWarning: {
    backgroundColor: colors.warning.muted,
    borderLeftColor: colors.warning.DEFAULT,
  },
  issueCategory: {
    fontSize: parseInt(typography.fontSize.caption.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.danger.DEFAULT,
    textTransform: 'uppercase',
    marginBottom: parseInt(spacing[1]),
  },
  issueMessage: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.muted,
    lineHeight: 20,
  },
  noDataWarning: {
    marginTop: parseInt(spacing[4]),
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  noDataIcon: {
    fontSize: 48,
  },
  taxPrepSection: {
    backgroundColor: colors.surface.DEFAULT,
    marginTop: parseInt(spacing[3]),
    marginHorizontal: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  taxPrepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: parseInt(spacing[4]),
    backgroundColor: '#eff6ff',
  },
  taxPrepTitle: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  taxPrepToggle: {
    fontSize: 14,
    color: colors.text.muted,
  },
  taxPrepContent: {
    padding: parseInt(spacing[4]),
  },
  taxPrepIntro: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: parseInt(spacing[4]),
  },
  checklistItems: {
    gap: parseInt(spacing[3]),
    marginBottom: parseInt(spacing[4]),
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: parseInt(spacing[2]),
  },
  checklistIcon: {
    fontSize: 16,
    color: colors.success.DEFAULT,
    fontWeight: typography.fontWeight.bold,
  },
  checklistText: {
    flex: 1,
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.DEFAULT,
    lineHeight: 20,
  },
  taxPrepReassurance: {
    backgroundColor: '#fef3c7',
    padding: parseInt(spacing[3]),
    borderRadius: parseInt(radius.sm),
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  taxPrepReassuranceText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: '#92400e',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  exportCard: {
    marginBottom: parseInt(spacing[3]),
  },
  guidanceDrawer: {
    backgroundColor: '#f8f9fa',
    padding: parseInt(spacing[4]),
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    gap: parseInt(spacing[3]),
  },
  guidanceTitle: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
    marginTop: parseInt(spacing[2]),
  },
  guidanceText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.muted,
    lineHeight: 20,
  },
  guidanceReassurance: {
    backgroundColor: '#e0f2fe',
    padding: parseInt(spacing[3]),
    borderRadius: parseInt(radius.sm),
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.DEFAULT,
    marginTop: parseInt(spacing[2]),
  },
  guidanceReassuranceText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: '#0369a1',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  finishLineSection: {
    backgroundColor: '#f0fdf4',
    padding: parseInt(spacing[5]),
    marginTop: parseInt(spacing[4]),
    marginHorizontal: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[6]),
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: '#86efac',
  },
  finishLineIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  finishLineTitle: {
    fontSize: parseInt(typography.fontSize.h3.size),
    fontWeight: typography.fontWeight.semibold,
    color: '#166534',
    textAlign: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  finishLineText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: '#166534',
    lineHeight: 22,
    marginBottom: parseInt(spacing[3]),
  },
  finishLineNote: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: '#15803d',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  legacySection: {
    backgroundColor: colors.surface.DEFAULT,
    marginTop: parseInt(spacing[3]),
    marginHorizontal: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  legacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: parseInt(spacing[4]),
    backgroundColor: '#f9fafb',
  },
  legacyTitle: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  legacyToggle: {
    fontSize: 14,
    color: colors.text.muted,
  },
  legacyContent: {
    padding: parseInt(spacing[4]),
  },
  legacyDescription: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: parseInt(spacing[4]),
  },
  errorBanner: {
    backgroundColor: colors.danger.muted,
    padding: parseInt(spacing[4]),
    marginHorizontal: parseInt(spacing[4]),
    marginTop: parseInt(spacing[3]),
    borderRadius: parseInt(radius.md),
    borderLeftWidth: 4,
    borderLeftColor: colors.danger.DEFAULT,
  },
  errorText: {
    fontSize: parseInt(typography.fontSize.body.size),
    color: colors.danger.DEFAULT,
    fontWeight: typography.fontWeight.semibold,
  },
});
