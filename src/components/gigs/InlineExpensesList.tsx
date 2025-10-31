/**
 * Inline expenses list for Add Gig modal
 * Allows adding expenses directly when creating a gig
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export interface InlineExpense {
  id: string; // Temporary ID for UI
  category: string;
  amount: string;
  note?: string;
  receiptUri?: string;
}

interface InlineExpensesListProps {
  expenses: InlineExpense[];
  onChange: (expenses: InlineExpense[]) => void;
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals',
  'Lodging',
  'Supplies',
  'Equipment',
  'Fees',
  'Other',
];

export function InlineExpensesList({ expenses, onChange }: InlineExpensesListProps) {
  const addExpense = () => {
    const newExpense: InlineExpense = {
      id: `temp-${Date.now()}`,
      category: 'Other',
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

              {/* Amount and Note */}
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={expense.amount}
                  onChangeText={(text) => updateExpense(expense.id, { amount: text })}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.noteInput]}
                  value={expense.note}
                  onChangeText={(text) => updateExpense(expense.id, { note: text })}
                  placeholder="Note (optional)"
                  placeholderTextColor="#9ca3af"
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
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  expenseRow: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#111827',
  },
  amountInput: {
    width: 80,
  },
  noteInput: {
    flex: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
