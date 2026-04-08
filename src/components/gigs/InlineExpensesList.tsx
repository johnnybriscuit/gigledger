/**
 * Inline expenses list for Add Gig modal
 * Allows adding expenses directly when creating a gig
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, radius, spacing, typography } from '../../styles/theme';

export interface InlineExpense {
  id: string; // Temporary ID for UI
  category: string;
  description: string; // Main description (e.g., "Gas for tour")
  amount: string;
  note?: string; // Optional additional notes
  receiptUri?: string;
}

interface InlineExpensesListProps {
  expenses: InlineExpense[];
  onChange: (expenses: InlineExpense[]) => void;
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals & Entertainment',
  'Lodging',
  'Supplies',
  'Equipment/Gear',
  'Professional Fees',
  'Marketing/Promotion',
  'Software/Subscriptions',
  'Education/Training',
  'Rent/Studio',
  'Other',
];

export function InlineExpensesList({ expenses, onChange }: InlineExpensesListProps) {
  const addExpense = () => {
    const newExpense: InlineExpense = {
      id: `temp-${Date.now()}`,
      category: 'Other',
      description: '',
      amount: '',
      note: '',
    };
    onChange([...expenses, newExpense]);
  };

  const updateExpense = (id: string, updates: Partial<InlineExpense>) => {
    onChange(
      expenses.map((exp) =>
        exp.id === id ? { ...exp, ...updates } : exp
      )
    );
  };

  const removeExpense = (id: string) => {
    onChange(expenses.filter((exp) => exp.id !== id));
  };

  const totalExpenses = expenses.reduce((sum, exp) => {
    return sum + (parseFloat(exp.amount) || 0);
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gig Expenses</Text>
        {expenses.length > 0 && (
          <Text style={styles.total}>-${totalExpenses.toFixed(2)}</Text>
        )}
      </View>

      {expenses.length === 0 ? (
        <Text style={styles.emptyText}>No expenses added yet</Text>
      ) : (
        <View style={styles.list}>
          {expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseRow}>
              {/* Category Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      expense.category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => updateExpense(expense.id, { category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        expense.category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description */}
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={expense.description}
                onChangeText={(text) => updateExpense(expense.id, { description: text })}
                placeholder="e.g., Gas for tour"
                placeholderTextColor={colors.text.subtle}
              />

              {/* Amount and Note */}
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={expense.amount}
                  onChangeText={(text) => updateExpense(expense.id, { amount: text })}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.subtle}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.noteInput]}
                  value={expense.note}
                  onChangeText={(text) => updateExpense(expense.id, { note: text })}
                  placeholder="Note (optional)"
                  placeholderTextColor={colors.text.subtle}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeExpense(expense.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={addExpense}>
        <Text style={styles.addButtonText}>+ Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: parseInt(spacing[4]),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  title: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  total: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.bold,
    color: colors.danger.DEFAULT,
  },
  emptyText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.subtle,
    fontStyle: 'italic',
    marginBottom: parseInt(spacing[3]),
  },
  list: {
    gap: parseInt(spacing[3]),
  },
  expenseRow: {
    backgroundColor: colors.surface.muted,
    borderRadius: parseInt(radius.md),
    padding: parseInt(spacing[3]),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  categoryScroll: {
    marginBottom: parseInt(spacing[2]),
  },
  categoryChip: {
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: 6,
    borderRadius: parseInt(radius.full),
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    marginRight: parseInt(spacing[2]),
  },
  categoryChipActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  categoryChipText: {
    fontSize: parseInt(typography.fontSize.caption.size),
    fontWeight: typography.fontWeight.medium,
    color: colors.text.muted,
  },
  categoryChipTextActive: {
    color: colors.brand.foreground,
  },
  inputRow: {
    flexDirection: 'row',
    gap: parseInt(spacing[2]),
    alignItems: 'center',
  },
  input: {
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.sm),
    padding: parseInt(spacing[2]),
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.DEFAULT,
  },
  amountInput: {
    width: 80,
  },
  descriptionInput: {
    marginBottom: parseInt(spacing[2]),
  },
  noteInput: {
    flex: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: colors.danger.DEFAULT,
    fontWeight: typography.fontWeight.semibold,
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: parseInt(spacing[2]),
  },
  addButtonText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.DEFAULT,
  },
});
