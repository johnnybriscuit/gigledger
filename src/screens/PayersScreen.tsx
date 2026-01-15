import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { usePayers, useDeletePayer } from '../hooks/usePayers';
import { useSubcontractors, useDeleteSubcontractor } from '../hooks/useSubcontractors';
import { useGigs } from '../hooks/useGigs';
import { AddPayerModal } from '../components/AddPayerModal';
import { SubcontractorFormModal } from '../components/SubcontractorFormModal';
import { H1, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';

type TabType = 'payers' | 'subcontractors';

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
  
  const isLoading = activeTab === 'payers' ? payersLoading : subcontractorsLoading;
  const error = activeTab === 'payers' ? payersError : subcontractorsError;

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

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <H3 style={{ color: colors.danger.DEFAULT }}>Error loading payers</H3>
        <Text muted>{(error as Error).message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <H1>Payers & Subcontractors</H1>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setModalVisible(true)}
        >
          {activeTab === 'payers' ? '+ Add Payer' : '+ Add Subcontractor'}
        </Button>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payers' && styles.tabActive]}
          onPress={() => setActiveTab('payers')}
        >
          <Text
            semibold={activeTab === 'payers'}
            style={activeTab === 'payers' ? styles.tabTextActive : styles.tabText}
          >
            Payers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subcontractors' && styles.tabActive]}
          onPress={() => setActiveTab('subcontractors')}
        >
          <Text
            semibold={activeTab === 'subcontractors'}
            style={activeTab === 'subcontractors' ? styles.tabTextActive : styles.tabText}
          >
            Subcontractors
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payers Tab Content */}
      {activeTab === 'payers' && (
        payers && payers.length === 0 ? (
          <EmptyState
            title="No payers yet"
            description="Add venues, clients, or platforms you work with"
            action={{
              label: 'Add Payer',
              onPress: () => setModalVisible(true),
            }}
          />
        ) : (
          <FlatList
            data={payers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <H3>{item.name}</H3>
                    <View style={styles.metaRow}>
                      <Text muted>{item.payer_type}</Text>
                      {item.expect_1099 && (
                        <Badge variant="neutral" size="sm">1099</Badge>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => handleEdit(item)}
                      style={styles.actionButton}
                    >
                      <Text semibold style={{ color: colors.brand.DEFAULT }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id, item.name)}
                      style={styles.actionButton}
                    >
                      <Text semibold style={{ color: colors.danger.DEFAULT }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {item.contact_email && (
                  <Text muted style={styles.email}>{item.contact_email}</Text>
                )}
                {item.notes && (
                  <Text style={styles.notes} numberOfLines={2}>
                    {item.notes}
                  </Text>
                )}
              </Card>
            )}
          />
        )
      )}

      {/* Subcontractors Tab Content */}
      {activeTab === 'subcontractors' && (
        subcontractors && subcontractors.length === 0 ? (
          <EmptyState
            title="No subcontractors yet"
            description="Add bandmates, crew, or other subcontractors you pay"
            action={{
              label: 'Add Subcontractor',
              onPress: () => setModalVisible(true),
            }}
          />
        ) : (
          <FlatList
            data={subcontractors}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <H3>{item.name}</H3>
                    {item.role && (
                      <Text muted>{item.role}</Text>
                    )}
                    {(item.email || item.phone) && (
                      <View style={styles.contactRow}>
                        {item.email && <Text muted style={styles.contactText}>{item.email}</Text>}
                        {item.email && item.phone && <Text muted> · </Text>}
                        {item.phone && <Text muted style={styles.contactText}>{item.phone}</Text>}
                      </View>
                    )}
                    {item.tax_id_last4 && (
                      <View style={styles.metaRow}>
                        <Badge variant="neutral" size="sm">
                          {item.tax_id_type?.toUpperCase()} ****{item.tax_id_last4}
                        </Badge>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => handleEditSubcontractor(item)}
                      style={styles.actionButton}
                    >
                      <Text semibold style={{ color: colors.brand.DEFAULT }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteSubcontractor(item.id, item.name)}
                      style={styles.actionButton}
                    >
                      <Text semibold style={{ color: colors.danger.DEFAULT }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}
          />
        )
      )}

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
    backgroundColor: colors.surface.muted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    gap: parseInt(spacing[2]),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: parseInt(spacing[5]),
    paddingVertical: parseInt(spacing[4]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  listContent: {
    padding: parseInt(spacing[5]),
  },
  card: {
    marginBottom: parseInt(spacing[3]),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: parseInt(spacing[2]),
  },
  cardInfo: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  cardActions: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
  },
  actionButton: {
    paddingHorizontal: parseInt(spacing[2]),
    paddingVertical: parseInt(spacing[1]),
  },
  email: {
    marginBottom: parseInt(spacing[1]),
  },
  notes: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.DEFAULT,
    lineHeight: parseInt(typography.fontSize.subtle.size) * 1.4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    paddingHorizontal: parseInt(spacing[5]),
  },
  tab: {
    paddingVertical: parseInt(spacing[3]),
    paddingHorizontal: parseInt(spacing[4]),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.brand.DEFAULT,
  },
  tabText: {
    fontSize: 16,
    color: colors.text.muted,
  },
  tabTextActive: {
    fontSize: 16,
    color: colors.brand.DEFAULT,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  contactText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
  },
});
