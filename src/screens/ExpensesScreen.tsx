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
import { useEntitlements } from '../hooks/useEntitlements';
import { H3, Text } from '../ui';
import { colors } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';
import { DeductionInfoCard } from '../components/DeductionInfoCard';
import { type DateRange, dateRangeToStrings } from '../lib/dateRangeUtils';
import { useDateRange } from '../hooks/useDateRange';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { StatsSummaryBar } from '../components/ui/StatsSummaryBar';

interface ExpensesScreenProps {
  onNavigateToSubscription?: () => void;
}

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
  greenLight: colors.success.muted,
  amber: colors.warning.DEFAULT,
  amberLight: colors.warning.muted,
  accent: colors.brand.DEFAULT,
  accentLight: colors.brand.muted,
  red: colors.danger.DEFAULT,
  overlay: colors.overlay.DEFAULT,
};

export function ExpensesScreen({ onNavigateToSubscription }: ExpensesScreenProps = {}) {
  
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
  
  // Date range state - managed independently per page
  const { range: dateRange, customStart, customEnd, setRange, setCustomRange } = useDateRange();

  const queryDateRange = dateRange ? dateRangeToStrings(dateRange, customStart, customEnd) : null;
  const { data: expenses, isLoading, error } = useExpenses(
    queryDateRange
      ? {
          startDate: queryDateRange.startDate,
          endDate: queryDateRange.endDate,
        }
      : undefined
  );
  const { data: activeRecurring } = useActiveRecurringExpenses();
  const deleteExpense = useDeleteExpense();
  const quickAdd = useQuickAddExpense();

  const entitlements = useEntitlements();
  const expenseCount = entitlements.usage.expensesCount;
  const isFreePlan = !entitlements.isPro;
  const hasReachedExpenseLimit = !entitlements.can.createExpense;

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
      <StatsSummaryBar
        items={[
          { label: 'TOTAL EXPENSES', value: expenses?.length || 0 },
          { label: 'TOTAL SPENT', value: formatCurrency(totalExpenses) },
          { label: 'DEDUCTIBLE', value: formatCurrency(deductibleTotal), valueColor: colors.success.DEFAULT },
        ]}
      />

      {/* ── Section Header ── */}
      <View style={styles.sectionHeader}>
        <RNText style={styles.sectionTitle}>ALL EXPENSES</RNText>
        <View style={styles.headerActions}>
          <DateRangeFilter
            selected={dateRange}
            onSelect={setRange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomRangeChange={setCustomRange}
          />
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
            limitCount={entitlements.limits.expensesMax ?? 0}
            onUpgradePress={handleNavigateToSubscription}
          />
        </View>
      )}

      {/* Main list */}
      <View style={styles.contentArea}>
        {expenses && expenses.length === 0 ? (
          <View style={styles.onboardingCardWrapper}>
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
      </View>

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
    backgroundColor: T.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg,
    gap: 8,
  },
  contentArea: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 12,
    paddingHorizontal: 10,
    backgroundColor: T.surfacePanel,
    borderWidth: 1,
    borderColor: T.borderMuted,
    borderRadius: 16,
    overflow: 'hidden',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addBtn: {
    backgroundColor: T.accent,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textOnBrand,
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
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  filterIcon: {
    fontSize: 15,
  },
  filterLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },
  filterChevron: {
    fontSize: 10,
    color: T.textMuted,
  },
  recurringPill: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  recurringPillActive: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  recurringPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },
  recurringPillTextActive: {
    color: T.textOnBrand,
  },

  // ── Filter Menu ──
  filterMenuBackdrop: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'flex-start',
    paddingTop: 160,
    paddingHorizontal: 10,
  },
  filterMenu: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: colors.overlay.DEFAULT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24 },
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
    borderBottomColor: T.borderMuted,
  },
  filterMenuItemActive: {
    backgroundColor: T.accentLight,
  },
  filterMenuIcon: {
    fontSize: 16,
  },
  filterMenuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: T.textPrimary,
  },
  filterMenuLabelActive: {
    fontWeight: '700',
    color: T.accent,
  },
  filterCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCheckMark: {
    fontSize: 11,
    color: T.textOnBrand,
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
    color: T.textMuted,
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
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
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
    color: T.textPrimary,
  },
  quickAddChipAmount: {
    fontSize: 13,
    color: T.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  quickAddChipPlus: {
    fontSize: 16,
    fontWeight: '700',
    color: T.accent,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // ── Expense Card ──
  expenseCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.borderMuted,
    overflow: 'hidden',
    marginBottom: 10,
    marginHorizontal: 0,
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
    color: T.textPrimary,
  },
  expenseVendor: {
    fontSize: 13,
    color: T.textSecondary,
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
    backgroundColor: T.surface2,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  expenseDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textSecondary,
  },
  expenseCategoryChip: {
    backgroundColor: T.surface2,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  expenseCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textSecondary,
    letterSpacing: 0.3,
  },
  expenseRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  expenseAmountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expenseAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: T.red,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 28,
  },
  expenseDeductible: {
    fontSize: 11,
    fontWeight: '600',
    color: T.green,
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
    borderTopColor: T.borderMuted,
    backgroundColor: T.surfacePanel,
  },
  footerActionBlue: {
    fontSize: 13,
    fontWeight: '600',
    color: T.accent,
  },
  footerActionRed: {
    fontSize: 13,
    fontWeight: '600',
    color: T.red,
  },

  // ── Misc ──
  bannerWrapper: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  onboardingCardWrapper: {
    paddingTop: 20,
  },
});
