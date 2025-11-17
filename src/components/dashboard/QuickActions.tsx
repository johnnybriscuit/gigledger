/**
 * Quick action buttons for common tasks
 * + Add Gig, + Expense, Scan Receipt, Export
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, chartColors } from '../../lib/charts/colors';
import { Text } from '../../ui';
import { colors, spacing, radius, typography } from '../../styles/theme';

interface QuickActionsProps {
  onAddGig: () => void;
  onAddExpense: () => void;
  onScanReceipt?: () => void;
  onExport: () => void;
}

export function QuickActions({
  onAddGig,
  onAddExpense,
  onScanReceipt,
  onExport,
}: QuickActionsProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const actions = [
    {
      icon: '➕',
      label: 'Add Gig',
      color: chartColors.blue,
      onPress: onAddGig,
    },
    {
      icon: '💳',
      label: 'Expense',
      color: chartColors.red,
      onPress: onAddExpense,
    },
    ...(onScanReceipt ? [{
      icon: '📸',
      label: 'Scan',
      color: chartColors.amber,
      onPress: onScanReceipt,
    }] : []),
    {
      icon: '📊',
      label: 'Export',
      color: chartColors.green,
      onPress: onExport,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.actionButton,
            { backgroundColor: colors.cardBg, borderColor: colors.border }
          ]}
          onPress={action.onPress}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${action.color}15` }]}>
            <Text style={styles.icon}>{action.icon}</Text>
          </View>
          <Text semibold style={{ color: colors.text }}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]) + 2,
    padding: parseInt(spacing[3]) + 2,
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: parseInt(radius.sm),
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
});
