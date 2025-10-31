/**
 * Inline mileage row for Add Gig modal
 * Shows mileage input with IRS rate deduction preview
 * Supports automatic calculation from home address to venue
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { IRS_MILEAGE_RATE, calculateMileageDeduction } from '../../hooks/useTaxEstimate';
import { calculateDrivingDistance } from '../../services/mileageService';

export interface InlineMileage {
  miles: string;
  note?: string;
  venueAddress?: string;
  roundTrip?: boolean;
}

interface InlineMileageRowProps {
  mileage: InlineMileage | null;
  onChange: (mileage: InlineMileage | null) => void;
  homeAddress?: string | null;
  venueAddress?: string; // From gig location/city/state
}

export function InlineMileageRow({ mileage, onChange, homeAddress, venueAddress }: InlineMileageRowProps) {
  const [calculating, setCalculating] = useState(false);
  const [useAutoCalculate, setUseAutoCalculate] = useState(false);
  
  const miles = parseFloat(mileage?.miles || '0');
  const deduction = calculateMileageDeduction(miles);
  const roundTrip = mileage?.roundTrip ?? true;

  const canAutoCalculate = homeAddress && venueAddress;

  const handleAutoCalculate = async () => {
    if (!homeAddress || !venueAddress) return;
    
    setCalculating(true);
    try {
      const result = await calculateDrivingDistance(homeAddress, venueAddress, roundTrip);
      if (result) {
        onChange({
          miles: result.miles.toString(),
          note: `Auto: ${result.distance} (${result.duration})${roundTrip ? ' round trip' : ''}`,
          venueAddress,
          roundTrip,
        });
      } else {
        // API not configured, show message
        alert('Google Maps API not configured. Please enter miles manually or add API key in settings.');
      }
    } catch (error) {
      console.error('Error calculating mileage:', error);
      alert('Failed to calculate mileage. Please enter manually.');
    } finally {
      setCalculating(false);
    }
  };

  const handleMilesChange = (text: string) => {
    if (!text || text === '0') {
      onChange(null);
    } else {
      onChange({
        miles: text,
        note: mileage?.note || '',
        venueAddress: mileage?.venueAddress,
        roundTrip: mileage?.roundTrip ?? true,
      });
    }
  };

  const handleNoteChange = (text: string) => {
    if (mileage) {
      onChange({
        ...mileage,
        note: text,
      });
    }
  };

  const toggleRoundTrip = () => {
    if (mileage) {
      onChange({
        ...mileage,
        roundTrip: !roundTrip,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mileage</Text>
        {miles > 0 && (
          <Text style={styles.deduction}>
            -${deduction.toFixed(2)} deduction
          </Text>
        )}
      </View>

      {/* Auto Calculate Button */}
      {canAutoCalculate && (
        <View>
          <TouchableOpacity
            style={styles.autoButton}
            onPress={handleAutoCalculate}
            disabled={calculating}
          >
            {calculating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.autoButtonText}>
                📍 Auto-Calculate {roundTrip ? 'Round Trip' : 'One Way'}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Round Trip Toggle Below Button */}
          <TouchableOpacity
            style={styles.roundTripToggleRow}
            onPress={toggleRoundTrip}
          >
            <View style={[styles.checkbox, roundTrip && styles.checkboxChecked]}>
              {roundTrip && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.roundTripText}>Round trip (default)</Text>
          </TouchableOpacity>
        </View>
      )}

      {!canAutoCalculate && homeAddress && (
        <Text style={styles.hint}>Add venue location to auto-calculate mileage</Text>
      )}

      {!homeAddress && (
        <Text style={styles.hint}>Add home address in Account settings to enable auto-calculate</Text>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.milesInput]}
          value={mileage?.miles || ''}
          onChangeText={handleMilesChange}
          placeholder="0"
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
        />
        <Text style={styles.milesLabel}>miles</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={mileage?.note || ''}
          onChangeText={handleNoteChange}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {miles > 0 && (
        <Text style={styles.rateInfo}>
          @ ${IRS_MILEAGE_RATE.toFixed(2)}/mile (IRS 2025 rate)
        </Text>
      )}
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
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deduction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  autoButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  roundTripToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingLeft: 4,
  },
  roundTripToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  roundTripText: {
    fontSize: 13,
    color: '#374151',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#111827',
  },
  milesInput: {
    width: 80,
  },
  milesLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  noteInput: {
    flex: 1,
  },
  rateInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});
