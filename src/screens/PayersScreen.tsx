import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { usePayers, useDeletePayer } from '../hooks/usePayers';
import { useSubcontractors, useDeleteSubcontractor } from '../hooks/useSubcontractors';
import { useGigs } from '../hooks/useGigs';
import { AddPayerModal } from '../components/AddPayerModal';
import { SubcontractorFormModal } from '../components/SubcontractorFormModal';
import { Subcontractor1099Center } from '../components/Subcontractor1099Center';
import { StatsSummaryBar } from '../components/ui/StatsSummaryBar';
import { colors } from '../styles/theme';
import type { Database } from '../types/database.types';

type TabType = 'payers' | 'subcontractors' | '1099-center';
type Payer = Database['public']['Tables']['payers']['Row'];
type Subcontractor = Database['public']['Tables']['subcontractors']['Row'];

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
  accent: colors.brand.DEFAULT,
  accentLight: colors.brand.muted,
  red: colors.danger.DEFAULT,
};

export function PayersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('payers');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);

  const { data: payers, isLoading: payersLoading, error: payersError } = usePayers();
  const { data: subcontractors, isLoading: subcontractorsLoading, error: subcontractorsError } = useSubcontractors();
  const { data: gigs } = useGigs();
  const deletePayer = useDeletePayer();
  const deleteSubcontractor = useDeleteSubcontractor();

  const isLoading = activeTab === 'payers'
    ? payersLoading
    : activeTab === 'subcontractors'
      ? subcontractorsLoading
      : false;
  const error = activeTab === 'payers'
    ? payersError
    : activeTab === 'subcontractors'
      ? subcontractorsError
      : null;

  const currentYear = new Date().getFullYear();
  const payerYtdMap = useMemo(() => {
    const map: Record<string, number> = {};

    if (!gigs) {
      return map;
    }

    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31, 23, 59, 59);

    for (const gig of gigs) {
      if (!gig.payer_id || !gig.date) {
        continue;
      }

      const date = new Date(gig.date);
      if (date >= start && date <= end) {
        map[gig.payer_id] = (map[gig.payer_id] || 0) + (gig.net_amount || 0);
      }
    }

    return map;
  }, [currentYear, gigs]);

  const totalContacts = (payers?.length ?? 0) + (subcontractors?.length ?? 0);
  const showAddButton = activeTab !== '1099-center';
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const handleDelete = async (id: string, name: string) => {
    const payerGigs = gigs?.filter((gig) => gig.payer_id === id) || [];

    if (payerGigs.length > 0) {
      const message = `Cannot delete "${name}" because it still has ${payerGigs.length} gig${payerGigs.length > 1 ? 's' : ''} assigned. Delete or reassign those gigs first.`;

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Cannot Delete Payer', message, [{ text: 'OK' }]);
      }

      return;
    }

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete "${name}"?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Payer',
            `Are you sure you want to delete "${name}"?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) {
      return;
    }

    try {
      await deletePayer.mutateAsync(id);
    } catch (deleteError: unknown) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${getErrorMessage(deleteError, 'Failed to delete payer')}`);
      } else {
        Alert.alert('Error', getErrorMessage(deleteError, 'Failed to delete payer'));
      }
    }
  };

  const handleDeleteSubcontractor = async (id: string, name: string) => {
    const subcontractorPayments = gigs?.filter((gig) =>
      gig.subcontractor_payments?.some((payment) => payment.subcontractor_id === id)
    ) || [];

    if (subcontractorPayments.length > 0) {
      const message = `Cannot delete "${name}" because it still has ${subcontractorPayments.length} payment${subcontractorPayments.length > 1 ? 's' : ''} associated with it.`;

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Cannot Delete Subcontractor', message, [{ text: 'OK' }]);
      }

      return;
    }

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete "${name}"?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Subcontractor',
            `Are you sure you want to delete "${name}"?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) {
      return;
    }

    try {
      await deleteSubcontractor.mutateAsync(id);
    } catch (deleteError: unknown) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${getErrorMessage(deleteError, 'Failed to delete subcontractor')}`);
      } else {
        Alert.alert('Error', getErrorMessage(deleteError, 'Failed to delete subcontractor'));
      }
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingPayer(null);
    setEditingSubcontractor(null);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return '--';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) {
      return '$0';
    }

    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={styles.loadingText}>Loading contacts</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading contacts</Text>
        <Text style={styles.errorSub}>{(error as Error).message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatsSummaryBar
        items={[
          { label: 'TOTAL CONTACTS', value: totalContacts },
          { label: 'PAYERS', value: payers?.length ?? 0 },
          { label: 'SUBCONTRACTORS', value: subcontractors?.length ?? 0 },
        ]}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ALL CONTACTS</Text>
        <View style={styles.headerActions}>
          {showAddButton ? (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setModalVisible(true)}>
              <Text style={styles.btnPrimaryText}>
                {activeTab === 'payers' ? '+ Payer' : '+ Subcontractor'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.segment}>
          {([
            { key: 'payers' as TabType, label: 'Payers' },
            { key: 'subcontractors' as TabType, label: 'Subcontractors' },
            { key: '1099-center' as TabType, label: '1099 Center' },
          ]).map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentButtonText, isActive && styles.segmentButtonTextActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.contentArea}>
        {activeTab === 'payers' ? (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>{payers?.length ?? 0} PAYERS</Text>
            <View style={styles.cardList}>
              {!payers || payers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No payers yet</Text>
                  <Text style={styles.emptyDesc}>Add venues, clients, or platforms you work with.</Text>
                </View>
              ) : (
                payers.map((payer) => {
                  const ytd = payerYtdMap[payer.id] || 0;

                  return (
                    <View key={payer.id} style={styles.contactCard}>
                      <View style={styles.contactCardMain}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{getInitials(payer.name)}</Text>
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactName} numberOfLines={1}>
                            {payer.name}
                          </Text>
                          <Text style={styles.contactType}>{payer.payer_type}</Text>
                        </View>
                        <View style={styles.earningsBlock}>
                          <Text style={styles.earningsValue}>{formatCurrency(ytd)}</Text>
                          <Text style={styles.earningsLabel}>YTD earned</Text>
                        </View>
                      </View>
                      <View style={styles.cardFooter}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingPayer(payer);
                            setModalVisible(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.footerEdit}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(payer.id, payer.name)} activeOpacity={0.7}>
                          <Text style={styles.footerDelete}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
            <View style={styles.bottomPad} />
          </ScrollView>
        ) : null}

        {activeTab === 'subcontractors' ? (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>{subcontractors?.length ?? 0} SUBCONTRACTORS</Text>
            <View style={styles.cardList}>
              {!subcontractors || subcontractors.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No subcontractors yet</Text>
                  <Text style={styles.emptyDesc}>Add bandmates, crew, or other subcontractors you pay.</Text>
                </View>
              ) : (
                subcontractors.map((subcontractor) => (
                  <View key={subcontractor.id} style={styles.contactCard}>
                    <View style={styles.contactCardMain}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitials(subcontractor.name)}</Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {subcontractor.name}
                        </Text>
                        {subcontractor.role ? (
                          <Text style={styles.contactType}>{subcontractor.role}</Text>
                        ) : null}
                        {subcontractor.email || subcontractor.phone ? (
                          <View style={styles.detailRow}>
                            {subcontractor.email ? (
                              <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="tail">
                                ✉ {subcontractor.email}
                              </Text>
                            ) : null}
                            {subcontractor.email && subcontractor.phone ? (
                              <Text style={styles.detailSep}> · </Text>
                            ) : null}
                            {subcontractor.phone ? (
                              <Text style={styles.detailText} numberOfLines={1}>
                                {subcontractor.phone}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {subcontractor.tax_id_last4 ? (
                          <View style={styles.ssnBadge}>
                            <Text style={styles.ssnBadgeText}>
                              🔒 {subcontractor.tax_id_type?.toUpperCase() ?? 'SSN'} ****{subcontractor.tax_id_last4}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingSubcontractor(subcontractor);
                          setModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.footerEdit}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSubcontractor(subcontractor.id, subcontractor.name)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.footerDelete}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
            <View style={styles.bottomPad} />
          </ScrollView>
        ) : null}

        {activeTab === '1099-center' ? <Subcontractor1099Center /> : null}
      </View>

      {activeTab === 'payers' ? (
        <AddPayerModal
          visible={modalVisible}
          onClose={handleCloseModal}
          editingPayer={editingPayer}
        />
      ) : null}

      {activeTab === 'subcontractors' ? (
        <SubcontractorFormModal
          visible={modalVisible}
          onClose={handleCloseModal}
          editingSubcontractor={editingSubcontractor}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg,
    gap: 8,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textSecondary,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: T.red,
  },
  errorSub: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
    letterSpacing: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: T.accent,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textOnBrand,
  },
  filterRow: {
    paddingHorizontal: 10,
    paddingBottom: 14,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: T.surface2,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: T.surface,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textMuted,
  },
  segmentButtonTextActive: {
    color: T.textPrimary,
  },
  contentArea: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 12,
    backgroundColor: T.surfacePanel,
    borderWidth: 1,
    borderColor: T.borderMuted,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabContent: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cardList: {
    paddingHorizontal: 10,
  },
  contactCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.borderMuted,
    overflow: 'hidden',
    marginBottom: 10,
  },
  contactCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: T.textSecondary,
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
  },
  contactType: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  earningsBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: T.green,
  },
  earningsLabel: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    overflow: 'hidden',
  },
  detailText: {
    fontSize: 12,
    color: T.textSecondary,
    flexShrink: 1,
  },
  detailSep: {
    fontSize: 12,
    color: T.textSecondary,
    flexShrink: 0,
  },
  ssnBadge: {
    alignSelf: 'flex-start',
    backgroundColor: T.surface2,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  ssnBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: T.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: T.borderMuted,
    backgroundColor: T.surfacePanel,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  footerEdit: {
    fontSize: 13,
    fontWeight: '600',
    color: T.accent,
  },
  footerDelete: {
    fontSize: 13,
    fontWeight: '600',
    color: T.red,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: T.textMuted,
    textAlign: 'center',
  },
  bottomPad: {
    height: 32,
  },
});
