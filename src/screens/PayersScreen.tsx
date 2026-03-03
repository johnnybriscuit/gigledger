import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { colors, spacing, radius, typography } from '../styles/theme';

type TabType = 'payers' | 'subcontractors' | '1099-center';

export function PayersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('payers');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPayer, setEditingPayer] = useState<any>(null);
  const [editingSubcontractor, setEditingSubcontractor] = useState<any>(null);
  
  const { data: payers, isLoading: payersLoading, error: payersError } = usePayers();
  const { data: subcontractors, isLoading: subcontractorsLoading, error: subcontractorsError } = useSubcontractors();
  const { data: gigs } = useGigs();
  const deletePayer = useDeletePayer();
  const deleteSubcontractor = useDeleteSubcontractor();
  
  const isLoading = activeTab === 'payers' ? payersLoading : (activeTab === 'subcontractors' ? subcontractorsLoading : false);
  const error = activeTab === 'payers' ? payersError : (activeTab === 'subcontractors' ? subcontractorsError : null);

  const handleDelete = async (id: string, name: string) => {
    console.log('handleDelete called for:', id, name);
    
    // Check if payer has any gigs
    const payerGigs = gigs?.filter(gig => gig.payer_id === id) || [];
    console.log('Payer gigs:', payerGigs);
    
    if (payerGigs.length > 0) {
      console.log('Payer has gigs, showing alert');
      if (Platform.OS === 'web') {
        window.alert(`Cannot delete "${name}" - this payer has ${payerGigs.length} gig${payerGigs.length > 1 ? 's' : ''} associated with it. Please delete or reassign those gigs first.`);
      } else {
        Alert.alert(
          'Cannot Delete Payer',
          `"${name}" has ${payerGigs.length} gig${payerGigs.length > 1 ? 's' : ''} associated with it. Please delete or reassign those gigs first.`,
          [{ text: 'OK' }]
        );
      }
      return;
    }

    console.log('Showing delete confirmation');
    
    // Use window.confirm on web, Alert.alert on native
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
      console.log('Delete cancelled');
      return;
    }

    console.log('Delete confirmed, calling mutation');
    try {
      await deletePayer.mutateAsync(id);
      console.log('Delete mutation completed');
    } catch (error: any) {
      console.error('Delete mutation failed:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to delete payer'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to delete payer');
      }
    }
  };

  const handleEdit = (payer: any) => {
    setEditingPayer(payer);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingPayer(null);
    setEditingSubcontractor(null);
  };

  const handleDeleteSubcontractor = async (id: string, name: string) => {
    // Check if subcontractor has any payments
    const subcontractorPayments = gigs?.filter(gig => 
      gig.subcontractor_payments?.some(p => p.subcontractor_id === id)
    ) || [];
    
    if (subcontractorPayments.length > 0) {
      if (Platform.OS === 'web') {
        window.alert(`Cannot delete "${name}" - this subcontractor has ${subcontractorPayments.length} payment${subcontractorPayments.length > 1 ? 's' : ''} associated with it. Please delete those payments first.`);
      } else {
        Alert.alert(
          'Cannot Delete Subcontractor',
          `"${name}" has ${subcontractorPayments.length} payment${subcontractorPayments.length > 1 ? 's' : ''} associated with it. Please delete those payments first.`,
          [{ text: 'OK' }]
        );
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

    if (!confirmed) return;

    try {
      await deleteSubcontractor.mutateAsync(id);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to delete subcontractor'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to delete subcontractor');
      }
    }
  };

  const handleEditSubcontractor = (subcontractor: any) => {
    setEditingSubcontractor(subcontractor);
    setModalVisible(true);
  };

  // Compute payer YTD earnings from gigs (current calendar year)
  const currentYear = new Date().getFullYear();
  const payerYtdMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!gigs) return map;
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31, 23, 59, 59);
    for (const gig of gigs) {
      if (!gig.payer_id || !gig.date) continue;
      const d = new Date(gig.date);
      if (d >= start && d <= end) {
        map[gig.payer_id] = (map[gig.payer_id] || 0) + (gig.net_amount || 0);
      }
    }
    return map;
  }, [gigs, currentYear]);

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatCurrency(amount: number): string {
    if (amount === 0) return '$0';
    return '$' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2D5BE3" />
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

  const showAddButton = activeTab !== '1099-center';

  return (
    <View style={styles.container}>
      {/* Top action row: + Add button (context-aware, hidden on 1099 tab) */}
      {showAddButton && (
        <View style={styles.addRow}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>
              {activeTab === 'payers' ? '+ Add Payer' : '+ Add Subcontractor'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pill segment control */}
      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          {(['payers', 'subcontractors', '1099-center'] as TabType[]).map((tab) => {
            const label = tab === 'payers' ? 'Payers' : tab === 'subcontractors' ? 'Subcontractors' : '1099 Center';
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.segBtn, isActive && styles.segBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segBtnText, isActive && styles.segBtnTextActive]} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* PAYERS TAB */}
      {activeTab === 'payers' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>{payers?.length ?? 0} Payers</Text>
          <View style={styles.cardList}>
            {(!payers || payers.length === 0) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No payers yet</Text>
                <Text style={styles.emptyDesc}>Add venues, clients, or platforms you work with</Text>
              </View>
            ) : (
              payers.map((item) => {
                const ytd = payerYtdMap[item.id] || 0;
                const initials = getInitials(item.name);
                return (
                  <View key={item.id} style={styles.contactCard}>
                    <View style={styles.contactCardMain}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.contactType}>{item.payer_type}</Text>
                      </View>
                      <View style={styles.earningsBlock}>
                        <Text style={styles.earningsValue}>{formatCurrency(ytd)}</Text>
                        <Text style={styles.earningsLabel}>YTD earned</Text>
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <TouchableOpacity onPress={() => handleEdit(item)} activeOpacity={0.7}>
                        <Text style={styles.footerEdit}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} activeOpacity={0.7}>
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
      )}

      {/* SUBCONTRACTORS TAB */}
      {activeTab === 'subcontractors' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>{subcontractors?.length ?? 0} Subcontractors</Text>
          <View style={styles.cardList}>
            {(!subcontractors || subcontractors.length === 0) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No subcontractors yet</Text>
                <Text style={styles.emptyDesc}>Add bandmates, crew, or other subcontractors you pay</Text>
              </View>
            ) : (
              subcontractors.map((item) => {
                const initials = getInitials(item.name);
                return (
                  <View key={item.id} style={styles.contactCard}>
                    <View style={styles.contactCardMain}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                        {item.role ? (
                          <Text style={styles.contactType}>{item.role}</Text>
                        ) : null}
                        {(item.email || item.phone) && (
                          <View style={styles.detailRow}>
                            {item.email && (
                              <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="tail">
                                ✉ {item.email}
                              </Text>
                            )}
                            {item.email && item.phone && (
                              <Text style={styles.detailSep}> · </Text>
                            )}
                            {item.phone && (
                              <Text style={styles.detailText} numberOfLines={1}>
                                {item.phone}
                              </Text>
                            )}
                          </View>
                        )}
                        {item.tax_id_last4 && (
                          <View style={styles.ssnBadge}>
                            <Text style={styles.ssnBadgeText}>
                              🔒 {item.tax_id_type?.toUpperCase() ?? 'SSN'} ****{item.tax_id_last4}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <TouchableOpacity onPress={() => handleEditSubcontractor(item)} activeOpacity={0.7}>
                        <Text style={styles.footerEdit}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteSubcontractor(item.id, item.name)} activeOpacity={0.7}>
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
      )}

      {/* 1099 CENTER TAB */}
      {activeTab === '1099-center' && <Subcontractor1099Center />}

      {/* Modals */}
      {activeTab === 'payers' ? (
        <AddPayerModal
          visible={modalVisible}
          onClose={handleCloseModal}
          editingPayer={editingPayer}
        />
      ) : (
        <SubcontractorFormModal
          visible={modalVisible}
          onClose={handleCloseModal}
          editingSubcontractor={editingSubcontractor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F0',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F4F0',
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorSub: {
    fontSize: 13,
    color: '#B0ADA8',
  },

  // + Add button row (sits below AppShell header on native)
  addRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  addButton: {
    backgroundColor: '#2D5BE3',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Pill segment control
  segmentWrap: {
    paddingHorizontal: 10,
    paddingBottom: 14,
    paddingTop: 6,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#EEECEA',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0ADA8',
  },
  segBtnTextActive: {
    color: '#1A1A1A',
  },

  // Tab content
  tabContent: {
    flex: 1,
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

  // Card list
  cardList: {
    paddingHorizontal: 10,
    gap: 10,
  },

  // Contact card
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    overflow: 'hidden',
    marginBottom: 10,
  },
  contactCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 10,
    gap: 12,
  },

  // Avatar
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEECEA',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7A7671',
  },

  // Contact info
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  contactType: {
    fontSize: 12,
    color: '#B0ADA8',
    marginTop: 2,
  },

  // Payer earnings
  earningsBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D9B5E',
  },
  earningsLabel: {
    fontSize: 11,
    color: '#B0ADA8',
    marginTop: 2,
  },

  // Subcontractor detail row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    overflow: 'hidden',
  },
  detailText: {
    fontSize: 12,
    color: '#7A7671',
    flexShrink: 1,
  },
  detailSep: {
    fontSize: 12,
    color: '#7A7671',
    flexShrink: 0,
  },

  // SSN badge
  ssnBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEECEA',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  ssnBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A7671',
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E3DE',
    backgroundColor: '#F5F4F0',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  footerEdit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5BE3',
  },
  footerDelete: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#B0ADA8',
    textAlign: 'center',
  },

  bottomPad: { height: 32 },
});
