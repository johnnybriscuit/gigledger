import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Accordion } from '../../ui/Accordion';
import { spacing } from '../../../styles/theme';

interface PayBreakdownSectionProps {
  tipsField: React.ReactNode;
  feesField: React.ReactNode;
  perDiemField: React.ReactNode;
  otherIncomeField: React.ReactNode;
  paymentMethodField: React.ReactNode;
  isStacked?: boolean;
}

export function PayBreakdownSection({
  tipsField,
  feesField,
  perDiemField,
  otherIncomeField,
  paymentMethodField,
  isStacked = false,
}: PayBreakdownSectionProps) {
  return (
    <Accordion title="Pay breakdown" description="Tips, fees, per diem, and payment method">
      <View style={[styles.row, isStacked && styles.rowStacked]}>
        <View style={styles.flexField}>{tipsField}</View>
        <View style={styles.flexField}>{feesField}</View>
      </View>

      <View style={[styles.row, isStacked && styles.rowStacked, styles.secondaryRow]}>
        <View style={styles.flexField}>{perDiemField}</View>
        <View style={styles.flexField}>{otherIncomeField}</View>
      </View>

      <View style={styles.paymentMethod}>{paymentMethodField}</View>
    </Accordion>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
  },
  rowStacked: {
    flexDirection: 'column',
  },
  secondaryRow: {
    marginTop: parseInt(spacing[4]),
  },
  flexField: {
    flex: 1,
  },
  paymentMethod: {
    marginTop: parseInt(spacing[4]),
  },
});
