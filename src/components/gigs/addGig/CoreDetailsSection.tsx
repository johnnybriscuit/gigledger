import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../../styles/theme';

interface CoreDetailsSectionProps {
  payerField: React.ReactNode;
  basePayField: React.ReactNode;
  dateField: React.ReactNode;
  titleField: React.ReactNode;
  venueField: React.ReactNode;
  headerActions?: React.ReactNode;
  mileageCard?: React.ReactNode;
  venueHelper?: React.ReactNode;
  isStacked?: boolean;
}

export function CoreDetailsSection({
  payerField,
  basePayField,
  dateField,
  titleField,
  venueField,
  headerActions,
  mileageCard,
  venueHelper,
  isStacked = false,
}: CoreDetailsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={[styles.headerRow, isStacked && styles.headerRowStacked]}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Core Details</Text>
          <Text style={styles.description}>
            Start with the agreement details. Extras live in Pay breakdown.
          </Text>
        </View>
        {headerActions ? (
          <View style={[styles.headerActions, isStacked && styles.headerActionsStacked]}>
            {headerActions}
          </View>
        ) : null}
      </View>

      <View style={[styles.row, isStacked && styles.rowStacked]}>
        <View style={styles.primaryField}>{payerField}</View>
        <View style={styles.secondaryField}>{titleField}</View>
      </View>

      <View style={[styles.row, isStacked && styles.rowStacked]}>
        <View style={styles.flexField}>{basePayField}</View>
        <View style={styles.flexField}>{dateField}</View>
      </View>

      <View style={styles.fieldGroup}>
        {venueField}
        {venueHelper}
      </View>

      {mileageCard ? <View style={styles.mileageCard}>{mileageCard}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: parseInt(spacing[5]),
    padding: parseInt(spacing[4]),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.lg),
    backgroundColor: colors.surface.DEFAULT,
    gap: parseInt(spacing[4]),
  },
  title: {
    fontSize: parseInt(typography.fontSize.h3.size),
    fontWeight: typography.fontWeight.bold,
    color: colors.text.DEFAULT,
  },
  description: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.muted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: parseInt(spacing[4]),
  },
  headerRowStacked: {
    flexDirection: 'column',
  },
  headerCopy: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  headerActions: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  headerActionsStacked: {
    alignItems: 'stretch',
  },
  fieldGroup: {
    gap: parseInt(spacing[2]),
  },
  row: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
  },
  rowStacked: {
    flexDirection: 'column',
  },
  flexField: {
    flex: 1,
  },
  primaryField: {
    flex: 1.5,
  },
  secondaryField: {
    flex: 1,
  },
  mileageCard: {
    marginTop: -4,
  },
});
