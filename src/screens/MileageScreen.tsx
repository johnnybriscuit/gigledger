import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useMileage, useDeleteMileage, calculateMileageDeduction, IRS_MILEAGE_RATE } from '../hooks/useMileage';
import { AddMileageModal } from '../components/AddMileageModal';

export function MileageScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMileage, setEditingMileage] = useState<any>(null);
  
  const { data: mileage, isLoading, error } = useMileage();
  const deleteMileage = useDeleteMileage();

  const handleDelete = async (id: string, purpose: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete "${purpose}"?`)
      : true;

    if (!confirmed) return;

    try {
      await deleteMileage.mutateAsync(id);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to delete mileage'}`);
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingMileage(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingMileage(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
        <Text style={styles.errorText}>Error loading mileage</Text>
        <Text style={styles.errorDetail}>{(error as Error).message}</Text>
      </View>
    );
  }

  const totalMiles = mileage?.reduce((sum, item) => sum + item.miles, 0) || 0;
  const totalDeduction = calculateMileageDeduction(totalMiles);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mileage</Text>
          <Text style={styles.subtitle}>
            {mileage?.length || 0} trips • {totalMiles.toFixed(1)} miles • {formatCurrency(totalDeduction)} deduction
          </Text>
          <Text style={styles.rateInfo}>
            IRS Rate: ${IRS_MILEAGE_RATE}/mile (2024)
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Trip</Text>
        </TouchableOpacity>
      </View>

      {mileage && mileage.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No mileage tracked yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Track business miles for tax deductions
          </Text>
        </View>
      ) : (
        <FlatList
          data={mileage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const deduction = calculateMileageDeduction(item.miles);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.purpose}>{item.purpose}</Text>
                    <Text style={styles.date}>{formatDate(item.date)}</Text>
                    <View style={styles.locationRow}>
                      <Text style={styles.location}>📍 {item.start_location}</Text>
                      <Text style={styles.arrow}>→</Text>
                      <Text style={styles.location}>{item.end_location}</Text>
                    </View>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.miles}>{item.miles} mi</Text>
                    <Text style={styles.deduction}>{formatCurrency(deduction)}</Text>
                  </View>
                </View>

                {item.notes && (
                  <Text style={styles.notes} numberOfLines={2}>
                    {item.notes}
                  </Text>
                )}

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.purpose)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <AddMileageModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingMileage={editingMileage}
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
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  rateInfo: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
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
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
  },
  purpose: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  location: {
    fontSize: 13,
    color: '#6b7280',
  },
  arrow: {
    fontSize: 13,
    color: '#9ca3af',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  miles: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  deduction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  notes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
