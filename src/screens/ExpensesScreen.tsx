import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useExpenses, useDeleteExpense } from '../hooks/useExpenses';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { RecurringExpenseModal } from '../components/RecurringExpenseModal';
import {
  useRecurringExpenses,
  useActiveRecurringExpenses,
  useDeleteRecurringExpense,
  useQuickAddExpense,
  type RecurringExpense,
} from '../hooks/useRecurringExpenses';

export function ExpensesScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | undefined>(undefined);
  
  const { data: expenses, isLoading, error } = useExpenses();
  const { data: recurringExpenses, isLoading: recurringLoading } = useRecurringExpenses();
  const { data: activeRecurring } = useActiveRecurringExpenses();
  const deleteExpense = useDeleteExpense();
  const deleteRecurring = useDeleteRecurringExpense();
  const quickAdd = useQuickAddExpense();

  const handleDelete = async (id: string, description: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete "${description}"?`)
      : true; // Will add Alert for mobile later

    if (!confirmed) return;

    try {
      await deleteExpense.mutateAsync(id);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to delete expense'}`);
      }
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingExpense(null);
  };

  const handleEditRecurring = (recurring: RecurringExpense) => {
    setEditingRecurring(recurring);
    setRecurringModalVisible(true);
  };

  const handleCloseRecurringModal = () => {
    setRecurringModalVisible(false);
    setEditingRecurring(undefined);
  };

  const handleDeleteRecurring = async (id: string, name: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete "${name}"?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Recurring Expense',
            `Are you sure you want to delete "${name}"?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await deleteRecurring.mutateAsync(id);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to delete recurring expense'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to delete recurring expense');
      }
    }
  };

  const handleQuickAdd = async (recurringId: string, name: string) => {
    try {
      await quickAdd.mutateAsync({ recurringExpenseId: recurringId });
      if (Platform.OS === 'web') {
        window.alert(`Added "${name}" to expenses!`);
      } else {
        Alert.alert('Success', `Added "${name}" to expenses!`);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to add expense'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to add expense');
      }
    }
  };

  const formatDate = (dateString: string) => {
    // Parse date as local date to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
        <Text style={styles.errorText}>Error loading expenses</Text>
        <Text style={styles.errorDetail}>{(error as Error).message}</Text>
      </View>
    );
  }

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>
            {expenses?.length || 0} expenses • {formatCurrency(totalExpenses)} total
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => activeTab === 'all' ? setModalVisible(true) : setRecurringModalVisible(true)}
        >
          <Text style={styles.addButtonText}>
            {activeTab === 'all' ? '+ Add Expense' : '+ New Template'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recurring' && styles.tabActive]}
          onPress={() => setActiveTab('recurring')}
        >
          <Text style={[styles.tabText, activeTab === 'recurring' && styles.tabTextActive]}>
            Recurring
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick-add buttons for active recurring expenses */}
      {activeTab === 'all' && activeRecurring && activeRecurring.length > 0 && (
        <View style={styles.quickAddSection}>
          <Text style={styles.quickAddTitle}>Quick Add</Text>
          <View style={styles.quickAddButtons}>
            {activeRecurring.map((recurring) => (
              <TouchableOpacity
                key={recurring.id}
                style={styles.quickAddButton}
                onPress={() => handleQuickAdd(recurring.id, recurring.name)}
              >
                <Text style={styles.quickAddButtonText}>{recurring.name}</Text>
                <Text style={styles.quickAddButtonAmount}>{formatCurrency(recurring.amount)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* All Expenses Tab */}
      {activeTab === 'all' && (expenses && expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No expenses yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Track your business expenses for tax deductions
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.description}>{item.description}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.category}>{item.category}</Text>
                    <Text style={styles.date}>{formatDate(item.date)}</Text>
                  </View>
                  {item.vendor && (
                    <Text style={styles.vendor}>📍 {item.vendor}</Text>
                  )}
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                  {item.receipt_url && (
                    <Text style={styles.receiptBadge}>📎</Text>
                  )}
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
                  onPress={() => handleDelete(item.id, item.description)}
                  style={styles.actionButton}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ))}

      {/* Recurring Expenses Tab */}
      {activeTab === 'recurring' && (recurringLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : recurringExpenses && recurringExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No recurring expenses yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create templates for expenses like rent, subscriptions, or storage
          </Text>
        </View>
      ) : (
        <FlatList
          data={recurringExpenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <View style={styles.recurringHeader}>
                    <Text style={styles.description}>{item.name}</Text>
                    {!item.is_active && (
                      <Text style={styles.pausedBadge}>Paused</Text>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.category}>{item.category}</Text>
                    <Text style={styles.frequency}>
                      {item.frequency === 'weekly' ? '📅 Weekly' : 
                       item.frequency === 'monthly' ? '📅 Monthly' : 
                       '📅 Yearly'}
                    </Text>
                  </View>
                  {item.vendor && (
                    <Text style={styles.vendor}>📍 {item.vendor}</Text>
                  )}
                  {item.next_due_date && (
                    <Text style={styles.nextDue}>
                      Next: {formatDate(item.next_due_date)}
                    </Text>
                  )}
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                </View>
              </View>

              {item.notes && (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleQuickAdd(item.id, item.name)}
                  style={styles.actionButton}
                  disabled={!item.is_active}
                >
                  <Text style={[styles.editText, !item.is_active && styles.disabledText]}>
                    Quick Add
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEditRecurring(item)}
                  style={styles.actionButton}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteRecurring(item.id, item.name)}
                  style={styles.actionButton}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ))}

      <AddExpenseModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingExpense={editingExpense}
      />

      <RecurringExpenseModal
        visible={recurringModalVisible}
        onClose={handleCloseRecurringModal}
        editingExpense={editingRecurring}
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
  description: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  category: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  date: {
    fontSize: 13,
    color: '#9ca3af',
  },
  vendor: {
    fontSize: 13,
    color: '#6b7280',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 4,
  },
  receiptBadge: {
    fontSize: 16,
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  quickAddSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  quickAddButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  quickAddButtonAmount: {
    fontSize: 13,
    color: '#3b82f6',
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pausedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  frequency: {
    fontSize: 13,
    color: '#6b7280',
  },
  nextDue: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 4,
  },
  disabledText: {
    color: '#9ca3af',
  },
});
