import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Accordion } from '../../ui/Accordion';
import { spacing } from '../../../styles/theme';

interface LocationDetailsSectionProps {
  startTimeField: React.ReactNode;
  endTimeField: React.ReactNode;
  invoiceField: React.ReactNode;
  locationFields: React.ReactNode;
  isStacked?: boolean;
}

export function LocationDetailsSection({
  startTimeField,
  endTimeField,
  invoiceField,
  locationFields,
  isStacked = false,
}: LocationDetailsSectionProps) {
  return (
    <Accordion title="Time, invoice & location details" description="Optional schedule and reporting fields">
      <View style={[styles.row, isStacked && styles.rowStacked]}>
        <View style={styles.flexField}>{startTimeField}</View>
        <View style={styles.flexField}>{endTimeField}</View>
      </View>

      <View style={styles.block}>{invoiceField}</View>
      <View style={styles.block}>{locationFields}</View>
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
  flexField: {
    flex: 1,
  },
  block: {
    marginTop: parseInt(spacing[4]),
  },
});
