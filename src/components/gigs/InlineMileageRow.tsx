/**
 * Detailed mileage editor for the Add Gig modal.
 * The parent modal owns the top-level drive question and auto-calc flow.
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  calculateMileageDeduction,
  getMileageRateForDate,
  getMileageRateYearForDate,
} from '../../lib/mileage';
import { colors } from '../../styles/theme';
import type { InlineMileage } from './inlineMileage';

interface InlineMileageRowProps {
  mileage: InlineMileage | null;
  onChange: (mileage: InlineMileage | null) => void;
  date?: string | Date | null;
}

function formatMileageRate(rate: number): string {
  return Number.isInteger(rate * 100) ? rate.toFixed(2) : rate.toFixed(3);
}

export function InlineMileageRow({ mileage, onChange, date }: InlineMileageRowProps) {
  const miles = parseFloat(mileage?.miles || '0');
  const deduction = calculateMileageDeduction(miles, date);
  const mileageRate = getMileageRateForDate(date);
  const mileageYear = getMileageRateYearForDate(date);

  const handleMilesChange = (text: string) => {
    const parsedMiles = parseFloat(text);

    if (!text || Number.isNaN(parsedMiles) || parsedMiles <= 0) {
      onChange(null);
      return;
    }

    onChange({
      miles: text,
      note: mileage?.note || '',
      startLocation: mileage?.startLocation,
      endLocation: mileage?.endLocation,
      venueAddress: mileage?.venueAddress,
      roundTrip: mileage?.roundTrip ?? true,
      isAutoCalculated: false,
      oneWayMiles: undefined,
    });
  };

  const handleNoteChange = (text: string) => {
    if (!mileage) {
      return;
    }

    onChange({
      ...mileage,
      note: text,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mileage Details</Text>
          <Text style={styles.subtitle}>Manual override and notes for this gig trip</Text>
        </View>
        {miles > 0 && (
          <Text style={styles.deduction}>
            -${deduction.toFixed(2)} deduction
          </Text>
        )}
      </View>

      {mileage?.isAutoCalculated && (
        <Text style={styles.autoCalculatedHint}>
          Auto-calculated. Editing miles below will switch this trip to manual mileage.
        </Text>
      )}

      <View style={styles.inputRow}>
        <View style={styles.milesGroup}>
          <Text style={styles.fieldLabel}>Miles</Text>
          <View style={styles.milesInputRow}>
            <TextInput
              style={[styles.input, styles.milesInput]}
              value={mileage?.miles || ''}
              onChangeText={handleMilesChange}
              placeholder="0.0"
              placeholderTextColor={colors.text.subtle}
              keyboardType="decimal-pad"
            />
            <Text style={styles.milesLabel}>miles</Text>
          </View>
        </View>

        <View style={styles.noteGroup}>
          <Text style={styles.fieldLabel}>Note</Text>
          <TextInput
            style={[styles.input, styles.noteInput, !mileage && styles.inputDisabled]}
            value={mileage?.note || ''}
            onChangeText={handleNoteChange}
            placeholder={mileage ? 'Note (optional)' : 'Add miles first'}
            placeholderTextColor={colors.text.subtle}
            editable={Boolean(mileage)}
          />
        </View>
      </View>

      <Text style={styles.rateInfo}>
        @ ${formatMileageRate(mileageRate)}/mile (IRS {mileageYear} rate)
      </Text>
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
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  deduction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success.DEFAULT,
  },
  autoCalculatedHint: {
    fontSize: 12,
    color: colors.brand.DEFAULT,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  milesGroup: {
    width: 120,
  },
  noteGroup: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: '600',
    marginBottom: 6,
  },
  milesInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  milesInput: {
    width: 82,
  },
  noteInput: {
    width: '100%',
  },
  milesLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  rateInfo: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 8,
  },
});
