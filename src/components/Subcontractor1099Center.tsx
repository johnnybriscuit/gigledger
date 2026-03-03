/**
 * 1099-NEC Center Component
 * Manages 1099 preparation for subcontractors
 */

import React, { useState } from 'react';
import {
  View,
  Text,
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
import { supabase } from '../lib/supabase';
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-1099-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subcontractorId: subcontractor.subcontractor_id,
            taxYear: selectedYear,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send email');

      alert(`1099 email sent successfully to ${getEffective1099Email(subcontractor)}`);
    } catch (error: any) {
      alert(`Error sending email: ${error.message}`);
    }
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D5BE3" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading 1099 data: {error.message}</Text>
      </View>
    );
  }

  const subcontractorsRequiring1099 = totals?.filter(s => s.requires_1099) || [];
  const totalAmount = totals?.reduce((sum, s) => sum + s.total_paid, 0) || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Amber info callout */}
      <View style={styles.callout}>
        <View style={styles.calloutRow}>
          <Text style={styles.calloutIcon}>📋</Text>
          <Text style={styles.calloutText}>
            1099-NEC is required for contractors paid $600+ in a calendar year.
          </Text>
        </View>
        <View style={styles.calloutRow}>
          <Text style={styles.calloutIcon}>⚠️</Text>
          <Text style={styles.calloutText}>
            IRS filing not included in Bozzy yet — use exports to prepare forms or share with your CPA.
          </Text>
        </View>
      </View>

      {/* Tax Year selector */}
      <Text style={styles.sectionLabel}>Tax Year</Text>
      <View style={styles.yearRow}>
        {yearOptions.map(year => (
          <TouchableOpacity
            key={year}
            style={[styles.yearBtn, selectedYear === year && styles.yearBtnActive]}
            onPress={() => setSelectedYear(year)}
            activeOpacity={0.75}
          >
            <Text style={[styles.yearBtnText, selectedYear === year && styles.yearBtnTextActive]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Requiring 1099</Text>
          <Text style={styles.statValue}>{subcontractorsRequiring1099.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Paid</Text>
          <Text style={styles.statValue}>
            ${totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* Export section */}
      <Text style={styles.sectionLabel}>Export</Text>
      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn, (!totals || totals.length === 0) && styles.exportBtnDisabled]}
          onPress={handleDownloadAllCsv}
          activeOpacity={0.75}
          disabled={!totals || totals.length === 0}
        >
          <Text style={styles.exportBtnText}>↓ All CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, subcontractorsRequiring1099.length === 0 && styles.exportBtnDisabled]}
          onPress={handleDownloadRequiredCsv}
          activeOpacity={0.75}
          disabled={subcontractorsRequiring1099.length === 0}
        >
          <Text style={styles.exportBtnText}>↓ Required Only</Text>
        </TouchableOpacity>
      </View>

      {/* Subcontractors list (if any) */}
      {totals && totals.length > 0 && (
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

      <View style={styles.bottomPad} />
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
    <View style={styles.row}>
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
          <View style={[styles.inlineBadge, subcontractor.requires_1099 ? styles.badgeGreen : styles.badgeNeutral]}>
            <Text style={[styles.inlineBadgeText, subcontractor.requires_1099 ? styles.badgeGreenText : styles.badgeNeutralText]}>
              {subcontractor.requires_1099 ? '≥ $600' : '< $600'}
            </Text>
          </View>
          <View style={[styles.inlineBadge, subcontractor.w9_status === 'received' ? styles.badgeGreen : styles.badgeAmber]}>
            <Text style={[styles.inlineBadgeText, subcontractor.w9_status === 'received' ? styles.badgeGreenText : styles.badgeAmberText]}>
              {subcontractor.w9_status === 'received' ? 'W-9 Received' : 'W-9 Missing'}
            </Text>
          </View>
          {missingInfo.length > 0 && (
            <View style={[styles.inlineBadge, styles.badgeRed]}>
              <Text style={[styles.inlineBadgeText, styles.badgeRedText]}>⚠️ {missingInfo.length} missing</Text>
            </View>
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
          <Text style={canEmail ? styles.actionButtonText : styles.actionButtonTextDisabled}>
            Email PDF {!canEmail && '(consent required)'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F4F0',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    padding: 24,
  },

  // Amber callout
  callout: {
    margin: 16,
    marginBottom: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 10,
    gap: 8,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  calloutIcon: {
    fontSize: 14,
    marginTop: 1,
    flexShrink: 0,
  },
  calloutText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#D97706',
    lineHeight: 18,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },

  // Year selector
  yearRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 14,
  },
  yearBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E3DE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  yearBtnActive: {
    backgroundColor: '#2D5BE3',
    borderColor: '#2D5BE3',
  },
  yearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7671',
  },
  yearBtnTextActive: {
    color: '#FFFFFF',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E3DE',
    borderRadius: 14,
    padding: 12,
    paddingHorizontal: 14,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 4,
  },

  // Export row
  exportRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 14,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E3DE',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnDisabled: {
    opacity: 0.45,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // Subcontractor list (detail rows kept for SubcontractorRow)
  list: {
    paddingHorizontal: 10,
    gap: 10,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    padding: 16,
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  nameSection: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  legalName: { fontSize: 12, color: '#B0ADA8', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700', color: '#2D5BE3' },
  rowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  gigCount: { fontSize: 12, color: '#B0ADA8' },
  missingInfo: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  missingInfoText: { fontSize: 12, color: '#DC2626' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    backgroundColor: '#FFFFFF',
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { fontSize: 12, color: '#2D5BE3' },
  actionButtonTextDisabled: { color: '#B0ADA8' },

  // Inline badges for SubcontractorRow
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeGreenText: { color: '#065F46' },
  badgeNeutral: { backgroundColor: '#EEECEA' },
  badgeNeutralText: { color: '#7A7671' },
  badgeAmber: { backgroundColor: '#FEF3C7' },
  badgeAmberText: { color: '#D97706' },
  badgeRed: { backgroundColor: '#FEE2E2' },
  badgeRedText: { color: '#DC2626' },

  bottomPad: { height: 32 },
});
