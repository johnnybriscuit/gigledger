/**
 * 1099-NEC Center Component
 * Manages 1099 preparation for subcontractors
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { use1099Totals, getMissingInfoWarnings, canEmail1099, getEffective1099Email } from '../hooks/use1099Totals';
import { useW9Upload } from '../hooks/useW9Upload';
import { download1099Csv, download1099RequiredCsv } from '../lib/1099/generate1099Csv';
import { download1099PrepPdf } from '../lib/1099/generate1099PrepPdf';
import { H2, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import type { Subcontractor1099Total } from '../hooks/use1099Totals';

export function Subcontractor1099Center() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { data: totals, isLoading, error } = use1099Totals(selectedYear);
  const { uploadW9, toggleW9Status, downloadW9 } = useW9Upload();

  // Generate year options (current year and 2 previous years)
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const handleUploadW9 = async (subcontractorId: string) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.jpg,.jpeg,.png';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          try {
            await uploadW9.mutateAsync({ subcontractorId, file });
            alert('W-9 uploaded successfully');
          } catch (error: any) {
            alert(`Error uploading W-9: ${error.message}`);
          }
        }
      };
      input.click();
    }
  };

  const handleToggleW9Status = async (subcontractorId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'received' ? 'missing' : 'received';
    try {
      await toggleW9Status.mutateAsync({ subcontractorId, newStatus });
    } catch (error: any) {
      alert(`Error updating W-9 status: ${error.message}`);
    }
  };

  const handleDownloadPdf = async (subcontractor: Subcontractor1099Total) => {
    try {
      // TODO: Get payer info from user's invoice settings or profile
      const payerInfo = {
        businessName: 'Your Business Name',
        addressLine1: '123 Main St',
        city: 'City',
        state: 'ST',
        postalCode: '12345',
      };

      await download1099PrepPdf({
        subcontractor,
        payer: payerInfo,
        taxYear: selectedYear,
      });
    } catch (error: any) {
      alert(`Error generating PDF: ${error.message}`);
    }
  };

  const handleEmailPdf = async (subcontractor: Subcontractor1099Total) => {
    if (!canEmail1099(subcontractor)) {
      alert('Cannot email 1099: E-delivery consent required and valid email needed');
      return;
    }

    // TODO: Call edge function to send email
    alert(`Email 1099 to ${getEffective1099Email(subcontractor)} - Feature coming soon!`);
  };

  const handleDownloadAllCsv = () => {
    if (!totals || totals.length === 0) return;
    download1099Csv(totals, selectedYear);
  };

  const handleDownloadRequiredCsv = () => {
    if (!totals || totals.length === 0) return;
    download1099RequiredCsv(totals, selectedYear);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading 1099 data: {error.message}</Text>
      </View>
    );
  }

  const subcontractorsRequiring1099 = totals?.filter(s => s.requires_1099) || [];
  const totalAmount = totals?.reduce((sum, s) => sum + s.total_paid, 0) || 0;
  const totalRequiredAmount = subcontractorsRequiring1099.reduce((sum, s) => sum + s.total_paid, 0);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <H2>1099-NEC Center</H2>
        <Text style={styles.subtitle}>
          Prepare and manage 1099-NEC forms for subcontractors
        </Text>
      </View>

      {/* Info Banner */}
      <Card style={styles.infoBanner}>
        <Text style={styles.infoText}>
          📋 <Text style={styles.infoBold}>1099-NEC</Text> is commonly issued for $600+ paid to contractors in a calendar year.
        </Text>
        <Text style={styles.infoText}>
          ⚠️ Filing with IRS not included in Bozzy yet. Use these exports to prepare forms manually or share with your CPA.
        </Text>
      </Card>

      {/* Year Selector & Summary */}
      <View style={styles.controlsRow}>
        <View style={styles.yearSelector}>
          <Text style={styles.label}>Tax Year:</Text>
          <View style={styles.yearButtons}>
            {yearOptions.map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  selectedYear === year && styles.yearButtonActive,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[
                  styles.yearButtonText,
                  selectedYear === year && styles.yearButtonTextActive,
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryBold}>{subcontractorsRequiring1099.length}</Text> requiring 1099
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryBold}>${totalRequiredAmount.toFixed(2)}</Text> total
          </Text>
        </View>
      </View>

      {/* Bulk Actions */}
      <View style={styles.bulkActions}>
        <Button
          title="Download All CSV"
          onPress={handleDownloadAllCsv}
          variant="outline"
          disabled={!totals || totals.length === 0}
        />
        <Button
          title="Download Required CSV"
          onPress={handleDownloadRequiredCsv}
          variant="outline"
          disabled={subcontractorsRequiring1099.length === 0}
        />
      </View>

      {/* Subcontractors List */}
      {!totals || totals.length === 0 ? (
        <EmptyState
          title="No Subcontractor Payments"
          message={`No payments to subcontractors found for ${selectedYear}. Payments will appear here once you add subcontractor payouts to your gigs.`}
        />
      ) : (
        <View style={styles.list}>
          {totals.map(subcontractor => (
            <SubcontractorRow
              key={subcontractor.subcontractor_id}
              subcontractor={subcontractor}
              onToggleW9Status={handleToggleW9Status}
              onUploadW9={handleUploadW9}
              onDownloadW9={downloadW9}
              onDownloadPdf={handleDownloadPdf}
              onEmailPdf={handleEmailPdf}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

interface SubcontractorRowProps {
  subcontractor: Subcontractor1099Total;
  onToggleW9Status: (id: string, currentStatus: string) => void;
  onUploadW9: (id: string) => void;
  onDownloadW9: (filePath: string) => void;
  onDownloadPdf: (subcontractor: Subcontractor1099Total) => void;
  onEmailPdf: (subcontractor: Subcontractor1099Total) => void;
}

function SubcontractorRow({
  subcontractor,
  onToggleW9Status,
  onUploadW9,
  onDownloadW9,
  onDownloadPdf,
  onEmailPdf,
}: SubcontractorRowProps) {
  const [showActions, setShowActions] = useState(false);
  const missingInfo = getMissingInfoWarnings(subcontractor);
  const canEmail = canEmail1099(subcontractor);

  return (
    <Card style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.nameSection}>
          <Text style={styles.name}>{subcontractor.name}</Text>
          {subcontractor.legal_name && subcontractor.legal_name !== subcontractor.name && (
            <Text style={styles.legalName}>Legal: {subcontractor.legal_name}</Text>
          )}
        </View>
        <Text style={styles.amount}>${subcontractor.total_paid.toFixed(2)}</Text>
      </View>

      <View style={styles.rowDetails}>
        <View style={styles.badges}>
          {/* Threshold Badge */}
          <Badge
            label={subcontractor.requires_1099 ? '≥ $600' : '< $600'}
            variant={subcontractor.requires_1099 ? 'success' : 'default'}
          />

          {/* W-9 Status Badge */}
          <Badge
            label={subcontractor.w9_status === 'received' ? 'W-9 Received' : 'W-9 Missing'}
            variant={subcontractor.w9_status === 'received' ? 'success' : 'warning'}
          />

          {/* Missing Info Warning */}
          {missingInfo.length > 0 && (
            <Badge
              label={`⚠️ ${missingInfo.length} missing`}
              variant="error"
            />
          )}
        </View>

        <Text style={styles.gigCount}>{subcontractor.gig_count} gigs</Text>
      </View>

      {/* Missing Info Details */}
      {missingInfo.length > 0 && (
        <View style={styles.missingInfo}>
          <Text style={styles.missingInfoText}>
            Missing: {missingInfo.join(', ')}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onToggleW9Status(subcontractor.subcontractor_id, subcontractor.w9_status)}
        >
          <Text style={styles.actionButtonText}>
            {subcontractor.w9_status === 'received' ? 'Mark W-9 Missing' : 'Mark W-9 Received'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onUploadW9(subcontractor.subcontractor_id)}
        >
          <Text style={styles.actionButtonText}>Upload W-9</Text>
        </TouchableOpacity>

        {subcontractor.w9_document_url && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDownloadW9(subcontractor.w9_document_url!)}
          >
            <Text style={styles.actionButtonText}>Download W-9</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDownloadPdf(subcontractor)}
        >
          <Text style={styles.actionButtonText}>Download PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, !canEmail && styles.actionButtonDisabled]}
          onPress={() => canEmail && onEmailPdf(subcontractor)}
          disabled={!canEmail}
        >
          <Text style={[styles.actionButtonText, !canEmail && styles.actionButtonTextDisabled]}>
            Email PDF {!canEmail && '(consent required)'}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoBanner: {
    margin: spacing.lg,
    marginTop: 0,
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning,
    borderWidth: 1,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoBold: {
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  yearSelector: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  yearButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  yearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  yearButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  yearButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  summary: {
    alignItems: 'flex-end',
  },
  summaryText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  summaryBold: {
    fontWeight: '600',
    color: colors.text,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  row: {
    padding: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  legalName: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  amount: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  rowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  gigCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  missingInfo: {
    backgroundColor: colors.error + '10',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  missingInfoText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
  },
  actionButtonTextDisabled: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    padding: spacing.lg,
  },
});
