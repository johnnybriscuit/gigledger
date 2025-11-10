import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAllExportData, type ExportFilters } from '../hooks/useExports';
import { downloadAllCSVs, downloadJSONBackup } from '../lib/csvExport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { canExport } from '../config/plans';
import { UpgradeModal } from '../components/UpgradeModal';

export function ExportsScreen() {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [includeTips, setIncludeTips] = useState(true);
  const [includeFees, setIncludeFees] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  const handleDownloadCSVs = () => {
    if (!canExport(userPlan)) {
      setShowUpgradeModal(true);
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

  const handleDownloadJSON = () => {
    if (!canExport(userPlan)) {
      setShowUpgradeModal(true);
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

  const handleDownloadExcel = () => {
    Alert.alert('Coming Soon', 'Excel export will be available in the next update.');
  };

  const handleDownloadPDF = () => {
    Alert.alert('Coming Soon', 'PDF export will be available in the next update.');
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export Center</Text>
        <Text style={styles.subtitle}>
          Download tax-ready reports for your CPA
        </Text>
      </View>

      {/* Filters Section */}
      <View style={styles.filtersSection}>
        <Text style={styles.sectionTitle}>Filters</Text>

        {/* Tax Year Selector */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Tax Year</Text>
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
          <Text style={styles.checkboxLabel}>Use custom date range</Text>
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
            <Text style={styles.checkboxLabel}>Include Tips in Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setIncludeFees(!includeFees)}
          >
            <View style={[styles.checkbox, includeFees && styles.checkboxActive]}>
              {includeFees && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Include Fees as Deduction</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Summary */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading export data...</Text>
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading data</Text>
          <Text style={styles.errorDetail}>
            {gigs.error?.message || expenses.error?.message || mileage.error?.message || 
             payers.error?.message || scheduleC.error?.message || 'Please try again later'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Data Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{gigs.data?.length || 0}</Text>
                <Text style={styles.summaryLabel}>Gigs</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{expenses.data?.length || 0}</Text>
                <Text style={styles.summaryLabel}>Expenses</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{mileage.data?.length || 0}</Text>
                <Text style={styles.summaryLabel}>Mileage Entries</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{payers.data?.length || 0}</Text>
                <Text style={styles.summaryLabel}>Payers</Text>
              </View>
            </View>
          </View>

          {/* Export Buttons */}
          <View style={styles.exportSection}>
            <Text style={styles.sectionTitle}>Export Options</Text>

            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleDownloadCSVs}
            >
              <Text style={styles.exportButtonIcon}>📊</Text>
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Download CSVs</Text>
                <Text style={styles.exportButtonDescription}>
                  5 CSV files (gigs, expenses, mileage, payers, Schedule C)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonDisabled]}
              onPress={handleDownloadExcel}
            >
              <Text style={styles.exportButtonIcon}>📗</Text>
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Download Excel</Text>
                <Text style={styles.exportButtonDescription}>
                  One .xlsx file with separate sheets (Coming Soon)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonDisabled]}
              onPress={handleDownloadPDF}
            >
              <Text style={styles.exportButtonIcon}>📄</Text>
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Download PDF Summary</Text>
                <Text style={styles.exportButtonDescription}>
                  Tax-ready summary for your CPA (Coming Soon)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleDownloadJSON}
            >
              <Text style={styles.exportButtonIcon}>💾</Text>
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Download JSON Backup</Text>
                <Text style={styles.exportButtonDescription}>
                  Complete data backup in JSON format
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Tax Prep Helper Text */}
          <View style={styles.taxHelperSection}>
            <Text style={styles.taxHelperText}>
              These exports are formatted so you or your CPA can easily use them in tools like TurboTax. Always review for accuracy.
            </Text>
          </View>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>📋 What gets exported?</Text>
            <Text style={styles.helpText}>
              • <Text style={styles.helpBold}>Gigs CSV:</Text> All your gig income with payer details{'\n'}
              • <Text style={styles.helpBold}>Expenses CSV:</Text> Categorized business expenses{'\n'}
              • <Text style={styles.helpBold}>Mileage CSV:</Text> Business mileage with IRS deduction{'\n'}
              • <Text style={styles.helpBold}>Payers CSV:</Text> Contact info for 1099 tracking{'\n'}
              • <Text style={styles.helpBold}>Schedule C CSV:</Text> Tax-ready expense categories
            </Text>
            <Text style={styles.helpNote}>
              💡 Tip: Send the CSV files to your CPA along with the PDF summary for easy tax preparation.
            </Text>
          </View>
        </>
      )}

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
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filtersSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  yearButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  yearButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  yearButtonTextActive: {
    color: '#fff',
  },
  customRangeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  includeOptions: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  summarySection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  exportSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  exportButtonDescription: {
    fontSize: 13,
    color: '#6b7280',
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
});
