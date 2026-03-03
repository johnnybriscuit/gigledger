import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Text as RNText,
  Modal,
} from 'react-native';
import { useExpenses, useDeleteExpense } from '../hooks/useExpenses';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { RecurringExpenseModal } from '../components/RecurringExpenseModal';
import { PaywallModal } from '../components/PaywallModal';
import { UsageLimitBanner } from '../components/UsageLimitBanner';
import { OnboardingHelperCard } from '../components/OnboardingHelperCard';
import {
  useActiveRecurringExpenses,
  useQuickAddExpense,
  type RecurringExpense,
} from '../hooks/useRecurringExpenses';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { H3, Text } from '../ui';
import { colors } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';
import { DeductionInfoCard } from '../components/DeductionInfoCard';
import { type DateRange, getDateRangeConfig, filterByDateRange } from '../lib/dateRangeUtils';

interface ExpensesScreenProps {
  onNavigateToSubscription?: () => void;
  dateRange?: DateRange;
  customStart?: Date;
  customEnd?: Date;
}

export function ExpensesScreen({ onNavigateToSubscription, dateRange, customStart, customEnd }: ExpensesScreenProps = {}) {
  
  const handleNavigateToSubscription = () => {
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
    } else if (Platform.OS === 'web') {
      // Direct web navigation to subscription page
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'subscription');
      window.history.pushState({}, '', currentUrl.toString());
      window.dispatchEvent(new CustomEvent('tabChange', { detail: 'subscription' }));
    }
  };
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [recurringFilter, setRecurringFilter] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<any>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | undefined>(undefined);
  
  const { data: allExpenses, isLoading, error } = useExpenses();

  // Client-side date filtering — useExpenses fetches all, we filter here
  const expenses = dateRange
    ? (() => {
        const { startDate, endDate } = getDateRangeConfig(dateRange, customStart, customEnd);
        return filterByDateRange(allExpenses, startDate, endDate);
      })()
    : allExpenses;
  const { data: activeRecurring } = useActiveRecurringExpenses();
  const deleteExpense = useDeleteExpense();
  const quickAdd = useQuickAddExpense();

  // Use unified plan limits hook
  const expenseCount = expenses?.length || 0;
  const planLimits = usePlanLimits(0, expenseCount);
  const { isFreePlan, hasReachedExpenseLimit } = planLimits;

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
    setDuplicatingExpense(null);
    setModalVisible(true);
  };

  const handleRepeat = (expense: any) => {
    setDuplicatingExpense(expense);
    setEditingExpense(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingExpense(null);
    setDuplicatingExpense(null);
  };

  const handleCloseRecurringModal = () => {
    setRecurringModalVisible(false);
    setEditingRecurring(undefined);
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
  const deductibleTotal = totalExpenses;

  // Clean display name: strip "Receipt: " prefix and " - YYYY-MM-DD" suffix
  const cleanName = (raw: string) => {
    let name = raw.replace(/^Receipt:\s*/i, '');
    name = name.replace(/\s*-\s*\d{4}-\d{2}-\d{2}$/, '');
    return name.trim();
  };

  const CATEGORY_OPTIONS = [
    { label: 'All Categories', icon: '📋' },
    { label: 'Equipment/Gear', icon: '🎸' },
    { label: 'Meals & Entertainment', icon: '🍽️' },
    { label: 'Mileage', icon: '🚗' },
    { label: 'Other', icon: '📦' },
  ];
  const activeCategoryOption = CATEGORY_OPTIONS.find(o => o.label === categoryFilter) || CATEGORY_OPTIONS[0];

  return (
    <View style={styles.container}>

      {/* ── Summary Bar ── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryStat}>
          <RNText style={styles.summaryLabel}>TOTAL EXPENSES</RNText>
          <RNText style={styles.summaryValue}>{expenses?.length || 0}</RNText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStat}>
          <RNText style={styles.summaryLabel}>TOTAL SPENT</RNText>
          <RNText style={styles.summaryValue}>{formatCurrency(totalExpenses)}</RNText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStat}>
          <RNText style={styles.summaryLabel}>DEDUCTIBLE</RNText>
          <RNText style={[styles.summaryValue, styles.summaryValueGreen]}>{formatCurrency(deductibleTotal)}</RNText>
        </View>
      </View>

      {/* ── Section Header ── */}
      <View style={styles.sectionHeader}>
        <RNText style={styles.sectionTitle}>ALL EXPENSES</RNText>
        {hasReachedExpenseLimit ? (
          <TouchableOpacity style={styles.addBtn} onPress={handleNavigateToSubscription}>
            <RNText style={styles.addBtnText}>⭐ Upgrade</RNText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (hasReachedExpenseLimit) { setShowPaywallModal(true); return; }
              setModalVisible(true);
            }}
          >
            <RNText style={styles.addBtnText}>+ Add Expense</RNText>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter Row ── */}
      <View style={styles.filterRow}>
        {/* Category dropdown */}
        <TouchableOpacity
          style={styles.filterDropdownBtn}
          onPress={() => setCategoryFilterOpen(v => !v)}
          activeOpacity={0.8}
        >
          <RNText style={styles.filterIcon}>{activeCategoryOption.icon}</RNText>
          <RNText style={styles.filterLabel}>{activeCategoryOption.label}</RNText>
          <RNText style={styles.filterChevron}>▼</RNText>
        </TouchableOpacity>

        {/* Recurring toggle */}
        <TouchableOpacity
          style={[styles.recurringPill, recurringFilter && styles.recurringPillActive]}
          onPress={() => setRecurringFilter(v => !v)}
          activeOpacity={0.8}
        >
          <RNText style={[styles.recurringPillText, recurringFilter && styles.recurringPillTextActive]}>Recurring</RNText>
        </TouchableOpacity>
      </View>

      {/* Category dropdown menu (Modal overlay) */}
      <Modal
        visible={categoryFilterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryFilterOpen(false)}
      >
        <TouchableOpacity
          style={styles.filterMenuBackdrop}
          activeOpacity={1}
          onPress={() => setCategoryFilterOpen(false)}
        >
          <View style={styles.filterMenu}>
            {CATEGORY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.filterMenuItem,
                  categoryFilter === opt.label && styles.filterMenuItemActive,
                ]}
                onPress={() => { setCategoryFilter(opt.label); setCategoryFilterOpen(false); }}
              >
                <RNText style={styles.filterMenuIcon}>{opt.icon}</RNText>
                <RNText style={[
                  styles.filterMenuLabel,
                  categoryFilter === opt.label && styles.filterMenuLabelActive,
                ]}>{opt.label}</RNText>
                {categoryFilter === opt.label && (
                  <View style={styles.filterCheck}>
                    <RNText style={styles.filterCheckMark}>✓</RNText>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Usage Banner */}
      {isFreePlan && (
        <View style={styles.bannerWrapper}>
          <UsageLimitBanner
            label="expenses"
            usedCount={expenseCount}
            limitCount={7}
            onUpgradePress={handleNavigateToSubscription}
          />
        </View>
      )}

      {/* Main list */}
      {expenses && expenses.length === 0 ? (
        <View style={{ padding: 20 }}>
          <OnboardingHelperCard
            icon="💰"
            title="Log your first expense"
            description="Track business expenses to maximize your tax deductions. Every dollar counts!"
            actionLabel="Add Expense"
            onAction={() => setModalVisible(true)}
          />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Quick Add strip */}
              {activeRecurring && activeRecurring.length > 0 && (
                <View style={styles.quickAddStrip}>
                  <RNText style={styles.quickAddLabel}>QUICK ADD</RNText>
                  <View style={styles.quickAddChips}>
                    {activeRecurring.map((recurring) => (
                      <TouchableOpacity
                        key={recurring.id}
                        style={styles.quickAddChip}
                        onPress={() => handleQuickAdd(recurring.id, recurring.name)}
                        activeOpacity={0.7}
                      >
                        <RNText style={styles.quickAddChipRecurIcon}>🔄</RNText>
                        <RNText style={styles.quickAddChipName}>{recurring.name}</RNText>
                        <RNText style={styles.quickAddChipAmount}>{formatCurrency(recurring.amount)}</RNText>
                        <RNText style={styles.quickAddChipPlus}>＋</RNText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Edu card */}
              <DeductionInfoCard />
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.expenseCard}>
              <View style={styles.expenseCardMain}>
                {/* Left */}
                <View style={styles.expenseLeft}>
                  <RNText style={styles.expenseName} numberOfLines={1}>{cleanName(item.description)}</RNText>
                  {item.vendor ? (
                    <RNText style={styles.expenseVendor} numberOfLines={1}>📍 {item.vendor}</RNText>
                  ) : null}
                  <View style={styles.expenseMeta}>
                    <View style={styles.expenseDateChip}>
                      <RNText style={styles.expenseDateText}>{formatDate(item.date)}</RNText>
                    </View>
                    {item.category ? (
                      <View style={styles.expenseCategoryChip}>
                        <RNText style={styles.expenseCategoryText}>{item.category.toUpperCase()}</RNText>
                      </View>
                    ) : null}
                  </View>
                </View>
                {/* Right */}
                <View style={styles.expenseRight}>
                  <RNText style={styles.expenseAmountLabel}>AMOUNT</RNText>
                  <RNText style={styles.expenseAmount}>{formatCurrency(item.amount)}</RNText>
                  <RNText style={styles.expenseDeductible}>✓ deductible</RNText>
                </View>
              </View>
              {/* Footer actions */}
              <View style={styles.expenseCardFooter}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <RNText style={styles.footerActionBlue}>Edit</RNText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRepeat(item)}>
                  <RNText style={styles.footerActionBlue}>Repeat</RNText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.description)}>
                  <RNText style={styles.footerActionRed}>Delete</RNText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <AddExpenseModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingExpense={editingExpense}
        duplicatingExpense={duplicatingExpense}
      />

      <RecurringExpenseModal
        visible={recurringModalVisible}
        onClose={handleCloseRecurringModal}
        editingExpense={editingRecurring}
      />
      
      {/* Paywall Modal - shown when user hits expense limit */}
      {showPaywallModal && (
        <PaywallModal
          visible={showPaywallModal}
          reason="expense_limit"
          onClose={() => setShowPaywallModal(false)}
          onUpgrade={() => {
            setShowPaywallModal(false);
            handleNavigateToSubscription();
          }}
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

  // ── Summary Bar ──
  summaryBar: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 10,
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginTop: 2,
  },
  summaryValueGreen: {
    color: '#4ADE80',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A7671',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addBtn: {
    backgroundColor: '#2D5BE3',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Filter Row ──
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 14,
    alignItems: 'center',
  },
  filterDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E3DE',
    backgroundColor: '#FFFFFF',
  },
  filterIcon: {
    fontSize: 15,
  },
  filterLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  filterChevron: {
    fontSize: 10,
    color: '#B0ADA8',
  },
  recurringPill: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E3DE',
    backgroundColor: '#FFFFFF',
  },
  recurringPillActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  recurringPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  recurringPillTextActive: {
    color: '#FFFFFF',
  },

  // ── Filter Menu ──
  filterMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 160,
    paddingHorizontal: 10,
  },
  filterMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E3DE',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E3DE',
  },
  filterMenuItemActive: {
    backgroundColor: '#F5F4F0',
  },
  filterMenuIcon: {
    fontSize: 16,
  },
  filterMenuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  filterMenuLabelActive: {
    fontWeight: '700',
    color: '#2D5BE3',
  },
  filterCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2D5BE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCheckMark: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Quick Add Strip ──
  quickAddStrip: {
    paddingHorizontal: 10,
    paddingBottom: 14,
  },
  quickAddLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  quickAddChips: {
    flexDirection: 'column',
    gap: 8,
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E3DE',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  quickAddChipRecurIcon: {
    fontSize: 14,
  },
  quickAddChipName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  quickAddChipAmount: {
    fontSize: 13,
    color: '#B0ADA8',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  quickAddChipPlus: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D5BE3',
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 32,
  },

  // ── Expense Card ──
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    overflow: 'hidden',
    marginBottom: 10,
    marginHorizontal: 10,
  },
  expenseCardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  expenseLeft: {
    flex: 1,
    minWidth: 0,
  },
  expenseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  expenseVendor: {
    fontSize: 13,
    color: '#7A7671',
    marginTop: 3,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  expenseDateChip: {
    backgroundColor: '#EEECEA',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  expenseDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A7671',
  },
  expenseCategoryChip: {
    backgroundColor: '#EEECEA',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  expenseCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A7671',
    letterSpacing: 0.3,
  },
  expenseRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  expenseAmountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expenseAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 28,
  },
  expenseDeductible: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D9B5E',
    marginTop: 3,
  },
  expenseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E3DE',
    backgroundColor: '#F5F4F0',
  },
  footerActionBlue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5BE3',
  },
  footerActionRed: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },

  // ── Misc ──
  bannerWrapper: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
});
