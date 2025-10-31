import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { usePayers, useDeletePayer } from '../hooks/usePayers';
import { useGigs } from '../hooks/useGigs';
import { AddPayerModal } from '../components/AddPayerModal';

export function PayersScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPayer, setEditingPayer] = useState<any>(null);
  
  const { data: payers, isLoading, error } = usePayers();
  const { data: gigs } = useGigs();
  const deletePayer = useDeletePayer();

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
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading payers</Text>
        <Text style={styles.errorDetail}>{(error as Error).message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Payer</Text>
        </TouchableOpacity>
      </View>

      {payers && payers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No payers yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add venues, clients, or platforms you work with
          </Text>
        </View>
      ) : (
        <FlatList
          data={payers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.payerName}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.payerType}>{item.type}</Text>
                    {item.expect_1099 && (
                      <View style={styles.badge1099}>
                        <Text style={styles.badge1099Text}>1099</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.name)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {item.contact_email && (
                <Text style={styles.email}>{item.contact_email}</Text>
              )}
              {item.notes && (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
            </View>
          )}
        />
      )}

      <AddPayerModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingPayer={editingPayer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
  },
  payerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payerType: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  badge1099: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badge1099Text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
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
});
