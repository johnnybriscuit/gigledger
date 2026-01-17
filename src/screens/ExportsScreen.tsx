import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { H1, H2, H3, Text, Button, Card, Badge } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { useAllExportData, type ExportFilters } from '../hooks/useExports';
import { downloadAllCSVs, downloadJSONBackup } from '../lib/csvExport';
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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showTaxPrepChecklist, setShowTaxPrepChecklist] = useState(true);
  const [expandedGuidance, setExpandedGuidance] = useState<string | null>(null);

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

  // Build filters
  const filters: ExportFilters = {
    startDate: customDateRange ? startDate : `${taxYear}-01-01`,
    endDate: customDateRange ? endDate : `${taxYear}-12-31`,
    includeTips,
    includeFees,
  };

  // Fetch all export data
  const { gigs, expenses, mileage, payers, scheduleC, isLoading, isError } = useAllExportData(filters);
  
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

    if (!gigs.data || !expenses.data || !mileage.data || !payers.data || !scheduleC.data) {
      Alert.alert('Error', 'Data not loaded yet. Please wait.');
      return;
    }

    downloadAllCSVs(
      gigs.data,
      expenses.data,
      mileage.data,
      payers.data,
      scheduleC.data,
      taxYear
    );

    Alert.alert('Success', 'CSV files are being downloaded. Check your downloads folder.');
  };

  const handleDownloadJSON = async () => {
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

    if (!gigs.data || !expenses.data || !mileage.data || !payers.data || !scheduleC.data) {
      Alert.alert('Error', 'Data not loaded yet. Please wait.');
      return;
    }

    downloadJSONBackup(
      gigs.data,
      expenses.data,
      mileage.data,
      payers.data,
      scheduleC.data,
      taxYear
    );

    Alert.alert('Success', 'JSON backup downloaded successfully.');
  };

  const handleDownloadExcel = async () => {
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

    if (!gigs.data || !expenses.data || !mileage.data || !payers.data) {
      Alert.alert('Error', 'Data not loaded yet. Please wait.');
      return;
    }

    try {
      // Calculate Schedule C summary from raw data
      const grossReceipts = gigs.data.reduce((sum, g) => sum + (g.gross_amount || 0) + (g.tips || 0) + (g.per_diem || 0) + (g.other_income || 0), 0);
      const fees = gigs.data.reduce((sum, g) => sum + (g.fees || 0), 0);
      const totalIncome = grossReceipts - fees;
      
      // Expenses by category
      const expensesByCategory: Record<string, number> = {};
      expenses.data.forEach(e => {
        const cat = e.category || 'Other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
      });
      
      // Mileage deduction
      const mileageDeduction = mileage.data.reduce((sum, m) => sum + (m.deduction_amount || m.miles * 0.67), 0);
      
      // Map to Schedule C lines
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
      
      const calculatedScheduleC = {
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

      await downloadExcel({
        gigs: gigs.data,
        expenses: expenses.data,
        mileage: mileage.data,
        payers: payers.data,
        scheduleC: calculatedScheduleC,
        taxYear,
        taxBreakdown,
      });
      
      Alert.alert('Success', 'Excel file has been downloaded!');
    } catch (error: any) {
      console.error('Excel export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to generate Excel file');
    }
  };

  const handleDownloadPDF = async () => {
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

    if (!gigs.data || !expenses.data || !mileage.data) {
      Alert.alert('Error', 'Data not loaded yet. Please wait.');
      return;
    }

    try {
      // Calculate Schedule C summary from raw data
      const grossReceipts = gigs.data.reduce((sum, g) => sum + (g.gross_amount || 0) + (g.tips || 0) + (g.per_diem || 0) + (g.other_income || 0), 0);
      const fees = gigs.data.reduce((sum, g) => sum + (g.fees || 0), 0);
      const totalIncome = grossReceipts - fees;
      
      // Expenses by category
      const expensesByCategory: Record<string, number> = {};
      expenses.data.forEach(e => {
        const cat = e.category || 'Other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
      });
      
      // Mileage deduction
      const mileageDeduction = mileage.data.reduce((sum, m) => sum + (m.deduction_amount || m.miles * 0.67), 0);
      
      // Map to Schedule C lines
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
      
      // Use tax breakdown from useWithholding hook (same as dashboard)
      const seTax = taxBreakdown?.selfEmployment || 0;
      const estimatedIncomeTax = taxBreakdown?.federalIncome || 0;
      const estimatedStateTax = taxBreakdown?.stateIncome || 0;
      const totalTax = taxBreakdown?.total || 0;
      
      const calculatedScheduleC = {
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

      // Get user profile for taxpayer name
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const taxpayerName = profileData?.full_name || undefined;
      const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      // Open PDF in new window
      openScheduleCPDF({
        scheduleCSummary: calculatedScheduleC,
        taxYear,
        taxpayerName,
        generatedDate,
      });
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

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <H1>Export Center</H1>
        <Text muted>
          Download tax-ready reports for your CPA
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

          {/* Export Buttons */}
          <View style={styles.exportSection}>
            <H2>Export Options</H2>
            <Text muted style={styles.sectionSubtitle}>Choose your export format below</Text>

            {/* CSV Export */}
            <View style={styles.exportCard}>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  !validationResult?.isValid && styles.exportButtonDisabled
                ]}
                onPress={handleDownloadCSVs}
                disabled={!validationResult?.isValid}
              >
                <Text style={styles.exportButtonIcon}>📊</Text>
                <View style={styles.exportButtonContent}>
                  <View style={styles.exportButtonHeader}>
                    <Text style={styles.exportButtonTitle}>Download CSVs</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpandedGuidance(expandedGuidance === 'csv' ? null : 'csv');
                      }}
                      style={styles.infoIconButton}
                    >
                      <Text style={styles.infoIcon}>ℹ️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.exportButtonDescription}>
                    IRS-compliant CSV files — Recommended for CPAs
                  </Text>
                </View>
              </TouchableOpacity>
              
              {expandedGuidance === 'csv' && (
                <View style={styles.guidanceDrawer}>
                  <Text style={styles.guidanceTitle}>Who this is for:</Text>
                  <Text style={styles.guidanceText}>
                    Best if you work with a CPA, accountant, or tax preparer.
                  </Text>
                  
                  <Text style={styles.guidanceTitle}>What to do next:</Text>
                  <Text style={styles.guidanceText}>
                    • Download the CSV files{'\n'}
                    • Email or share them with your CPA{'\n'}
                    • Your CPA will import or reference these files for Schedule C or business returns
                  </Text>
                  
                  <Text style={styles.guidanceTitle}>What's included:</Text>
                  <Text style={styles.guidanceText}>
                    • Income by gig{'\n'}
                    • Categorized expenses{'\n'}
                    • Mileage totals{'\n'}
                    • Net profit summaries
                  </Text>
                  
                  <View style={styles.guidanceReassurance}>
                    <Text style={styles.guidanceReassuranceText}>
                      These files are designed to be readable by humans and tax software. Most CPAs prefer this format.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* TXF Export */}
            <View style={styles.exportCard}>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  !validationResult?.isValid && styles.exportButtonDisabled
                ]}
                onPress={handleDownloadTXF}
                disabled={!validationResult?.isValid}
              >
                <Text style={styles.exportButtonIcon}>💼</Text>
                <View style={styles.exportButtonContent}>
                  <View style={styles.exportButtonHeader}>
                    <Text style={styles.exportButtonTitle}>Download TXF (TurboTax Desktop ONLY)</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowTXFInfo(true);
                      }}
                      style={styles.infoIconButton}
                    >
                      <Text style={styles.infoIcon}>ℹ️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.exportButtonDescription}>
                    This option lets you import your GigLedger data directly into TurboTax Desktop and skip manual entry.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Excel Export */}
            <View style={styles.exportCard}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleDownloadExcel}
              >
                <Text style={styles.exportButtonIcon}>📘</Text>
                <View style={styles.exportButtonContent}>
                  <View style={styles.exportButtonHeader}>
                    <Text style={styles.exportButtonTitle}>Download Excel (.xlsx)</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpandedGuidance(expandedGuidance === 'excel' ? null : 'excel');
                      }}
                      style={styles.infoIconButton}
                    >
                      <Text style={styles.infoIcon}>ℹ️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.exportButtonDescription}>
                    One .xlsx file with separate sheets
                  </Text>
                </View>
              </TouchableOpacity>
              
              {expandedGuidance === 'excel' && (
                <View style={styles.guidanceDrawer}>
                  <Text style={styles.guidanceTitle}>Who this is for:</Text>
                  <Text style={styles.guidanceText}>
                    Best if you want to review, edit, or share everything in one file.
                  </Text>
                  
                  <Text style={styles.guidanceTitle}>Common use cases:</Text>
                  <Text style={styles.guidanceText}>
                    • Reviewing your numbers before filing{'\n'}
                    • Sharing with a CPA who prefers Excel{'\n'}
                    • Making notes or adjustments
                  </Text>
                  
                  <Text style={styles.guidanceTitle}>What to do next:</Text>
                  <Text style={styles.guidanceText}>
                    • Download the Excel file{'\n'}
                    • Review each sheet (Income, Expenses, Mileage){'\n'}
                    • Upload it to tax software or send it to your CPA
                  </Text>
                  
                  <View style={styles.guidanceReassurance}>
                    <Text style={styles.guidanceReassuranceText}>
                      This file mirrors the CSV exports, just combined into one workbook.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* PDF Export */}
            <View style={styles.exportCard}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleDownloadPDF}
              >
                <Text style={styles.exportButtonIcon}>🧾</Text>
                <View style={styles.exportButtonContent}>
                  <View style={styles.exportButtonHeader}>
                    <Text style={styles.exportButtonTitle}>Download PDF Summary</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpandedGuidance(expandedGuidance === 'pdf' ? null : 'pdf');
                      }}
                      style={styles.infoIconButton}
                    >
                      <Text style={styles.infoIcon}>ℹ️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.exportButtonDescription}>
                    Tax-ready summary for your CPA
                  </Text>
                </View>
              </TouchableOpacity>
              
              {expandedGuidance === 'pdf' && (
                <View style={styles.guidanceDrawer}>
                  <Text style={styles.guidanceTitle}>Who this is for:</Text>
                  <Text style={styles.guidanceText}>
                    Best for quick overviews or sharing a clean summary with your CPA.
                  </Text>
                  
                  <Text style={styles.guidanceTitle}>Important clarification:</Text>
                  <Text style={styles.guidanceText}>
                    This is a summary, not raw data.
                  </Text>
                  
                  <Text style={styles.guidanceTitle}>What to do next:</Text>
                  <Text style={styles.guidanceText}>
                    • Attach this PDF when emailing your CPA{'\n'}
                    • Use it as a reference while filing online
                  </Text>
                  
                  <View style={styles.guidanceReassurance}>
                    <Text style={styles.guidanceReassuranceText}>
                      We recommend pairing this with CSV or Excel exports for full detail.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* JSON Export */}
            <View style={styles.exportCard}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleDownloadJSON}
              >
                <Text style={styles.exportButtonIcon}>💾</Text>
                <View style={styles.exportButtonContent}>
                  <View style={styles.exportButtonHeader}>
                    <Text style={styles.exportButtonTitle}>Download JSON Backup</Text>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpandedGuidance(expandedGuidance === 'json' ? null : 'json');
                      }}
                      style={styles.infoIconButton}
                    >
                      <Text style={styles.infoIcon}>ℹ️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.exportButtonDescription}>
                    Complete data backup in JSON format
                  </Text>
                </View>
              </TouchableOpacity>
              
              {expandedGuidance === 'json' && (
                <View style={styles.guidanceDrawer}>
                  <Text style={styles.guidanceTitle}>Who this is for:</Text>
                  <Text style={styles.guidanceText}>
                    Advanced users or long-term backups.
                  </Text>
                  
                  <Text style={styles.guidanceTitle}>Purpose:</Text>
                  <Text style={styles.guidanceText}>
                    • Full data backup{'\n'}
                    • Migration or archival
                  </Text>
                  
                  <View style={styles.guidanceReassurance}>
                    <Text style={styles.guidanceReassuranceText}>
                      This file is not intended for tax filing or CPA use.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Finish Line Section */}
          <View style={styles.finishLineSection}>
            <Text style={styles.finishLineIcon}>✅</Text>
            <Text style={styles.finishLineTitle}>
              Once you've downloaded your exports, you're ready for tax filing.
            </Text>
            <Text style={styles.finishLineText}>
              If you're working with a CPA, sending them the CSVs or Excel file is usually all they need.
            </Text>
            <Text style={styles.finishLineText}>
              If you're filing yourself, follow your tax software's import steps and review carefully before submitting.
            </Text>
            <Text style={styles.finishLineNote}>
              When in doubt, a tax professional can help answer questions specific to your situation.
            </Text>
          </View>
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
});
