import React, { useState } from 'react';
import {
  View,
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
import { usePlanLimits } from '../hooks/usePlanLimits';
import { H1, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';
import { DeductionInfoCard } from '../components/DeductionInfoCard';

interface ExpensesScreenProps {
  onNavigateToSubscription?: () => void;
}

export function ExpensesScreen({ onNavigateToSubscription }: ExpensesScreenProps = {}) {
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

  // Use unified plan limits hook
  const expenseCount = expenses?.length || 0;
  const planLimits = usePlanLimits(0, expenseCount);
  const { isFreePlan, hasReachedExpenseLimit, maxExpenses, expensesRemaining } = planLimits;

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
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatDateUtil(date);
  };

  const formatCurrency = formatCurrencyUtil;

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
        <H3 style={{ color: colors.danger.DEFAULT }}>Error loading expenses</H3>
        <Text muted>{(error as Error).message}</Text>
      </View>
    );
  }

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <H1>Expenses</H1>
          <Text muted>
            {expenses?.length || 0} expenses • {formatCurrency(totalExpenses)} total
          </Text>
        </View>
        {hasReachedExpenseLimit && activeTab === 'all' ? (
          <Button
            variant="success"
            size="sm"
            onPress={() => onNavigateToSubscription?.()}
          >
            ⭐ Upgrade to add more
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              if (activeTab === 'all') {
                if (hasReachedExpenseLimit) {
                  // Don't open modal if at limit
                  return;
                }
                setModalVisible(true);
              } else {
                setRecurringModalVisible(true);
              }
            }}
          >
            {activeTab === 'all' ? '+ Add Expense' : '+ New Template'}
          </Button>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text semibold style={activeTab === 'all' ? { color: colors.brand.DEFAULT } : { color: colors.text.muted }}>
            All Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recurring' && styles.tabActive]}
          onPress={() => setActiveTab('recurring')}
        >
          <Text semibold style={activeTab === 'recurring' ? { color: colors.brand.DEFAULT } : { color: colors.text.muted }}>
            Recurring
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick-add buttons for active recurring expenses */}
      {activeTab === 'all' && activeRecurring && activeRecurring.length > 0 && (
        <View style={styles.quickAddSection}>
          <Text semibold muted>Quick Add</Text>
          <View style={styles.quickAddButtons}>
            {activeRecurring.map((recurring) => (
              <TouchableOpacity
                key={recurring.id}
                style={styles.quickAddButton}
                onPress={() => handleQuickAdd(recurring.id, recurring.name)}
              >
                <Text semibold style={{ color: '#1e40af' }}>{recurring.name}</Text>
                <Text style={{ color: colors.brand.DEFAULT, fontSize: parseInt(typography.fontSize.subtle.size) }}>{formatCurrency(recurring.amount)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* All Expenses Tab */}
      {activeTab === 'all' && (expenses && expenses.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          description="Track your business expenses for tax deductions"
          action={{
            label: 'Add Expense',
            onPress: () => setModalVisible(true),
          }}
        />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <DeductionInfoCard />
              {isFreePlan && (
                <View style={styles.usageIndicator}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageText}>
                      You've used {expenseCount} of {maxExpenses} expenses on the free plan
                    </Text>
                    <TouchableOpacity onPress={() => onNavigateToSubscription?.()}>
                      <Text semibold style={{ color: colors.brand.DEFAULT }}>Upgrade</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${Math.min((expenseCount / maxExpenses) * 100, 100)}%` }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <Card variant="elevated" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <H3>{item.description}</H3>
                  <View style={styles.metaRow}>
                    <Badge variant="neutral" size="sm">{item.category}</Badge>
                    <Text subtle>{formatDate(item.date)}</Text>
                  </View>
                  {item.vendor && (
                    <Text muted>📍 {item.vendor}</Text>
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
                <Text muted numberOfLines={2} style={styles.notes}>
                  {item.notes}
                </Text>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.actionButton}
                >
                  <Text semibold style={{ color: colors.brand.DEFAULT }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.description)}
                  style={styles.actionButton}
                >
                  <Text semibold style={{ color: colors.danger.DEFAULT }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      ))}

      {/* Recurring Expenses Tab */}
      {activeTab === 'recurring' && (recurringLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
        </View>
      ) : recurringExpenses && recurringExpenses.length === 0 ? (
        <EmptyState
          title="No recurring expenses yet"
          description="Create templates for expenses like rent, subscriptions, or storage"
          action={{
            label: 'New Template',
            onPress: () => setRecurringModalVisible(true),
          }}
        />
      ) : (
        <FlatList
          data={recurringExpenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card variant="elevated" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <View style={styles.recurringHeader}>
                    <H3>{item.name}</H3>
                    {!item.is_active && (
                      <Badge variant="warning" size="sm">Paused</Badge>
                    )}
                  </View>
                  <View style={styles.metaRow}>
                    <Badge variant="neutral" size="sm">{item.category}</Badge>
                    <Text muted>
                      {item.frequency === 'weekly' ? '📅 Weekly' : 
                       item.frequency === 'monthly' ? '📅 Monthly' : 
                       '📅 Yearly'}
                    </Text>
                  </View>
                  {item.vendor && (
                    <Text muted>📍 {item.vendor}</Text>
                  )}
                  {item.next_due_date && (
                    <Text semibold style={{ color: colors.brand.DEFAULT, fontSize: parseInt(typography.fontSize.caption.size), marginTop: parseInt(spacing[1]) }}>
                      Next: {formatDate(item.next_due_date)}
                    </Text>
                  )}
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                </View>
              </View>

              {item.notes && (
                <Text muted numberOfLines={2} style={styles.notes}>
                  {item.notes}
                </Text>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleQuickAdd(item.id, item.name)}
                  style={styles.actionButton}
                  disabled={!item.is_active}
                >
                  <Text semibold style={{ color: item.is_active ? colors.brand.DEFAULT : colors.text.subtle }}>
                    Quick Add
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEditRecurring(item)}
                  style={styles.actionButton}
                >
                  <Text semibold style={{ color: colors.brand.DEFAULT }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteRecurring(item.id, item.name)}
                  style={styles.actionButton}
                >
                  <Text semibold style={{ color: colors.danger.DEFAULT }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
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
    marginBottom: parseInt(spacing[2]),
  },
  cardInfo: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[3]),
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: parseInt(spacing[1]),
  },
  amount: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.danger.DEFAULT,
  },
  receiptBadge: {
    fontSize: 16,
  },
  notes: {
    marginBottom: parseInt(spacing[3]),
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: parseInt(spacing[4]),
    paddingTop: parseInt(spacing[3]),
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  actionButton: {
    paddingHorizontal: parseInt(spacing[2]),
    paddingVertical: parseInt(spacing[1]),
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  tab: {
    flex: 1,
    paddingVertical: parseInt(spacing[4]),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.brand.DEFAULT,
  },
  quickAddSection: {
    backgroundColor: colors.surface.DEFAULT,
    padding: parseInt(spacing[4]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    gap: parseInt(spacing[3]),
  },
  quickAddButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[2]),
  },
  quickAddButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: parseInt(radius.sm),
    paddingVertical: parseInt(spacing[2]),
    paddingHorizontal: parseInt(spacing[3]),
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  usageIndicator: {
    backgroundColor: '#fef3c7',
    padding: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[2]),
  },
  usageText: {
    fontSize: parseInt(typography.fontSize.body.size),
    color: '#78350f',
    fontWeight: typography.fontWeight.medium,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#fde68a',
    borderRadius: parseInt(radius.full),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: parseInt(radius.full),
  },
});
