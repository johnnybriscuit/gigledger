import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';

interface BusinessUseSliderProps {
  value: number;
  onChange: (value: number) => void;
  amount: number;
}

export function BusinessUseSlider({ value, onChange, amount }: BusinessUseSliderProps) {
  const increment = () => {
    const newValue = Math.min(100, value + 5);
    onChange(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(0, value - 5);
    onChange(newValue);
  };

  const handleSliderChange = (event: any) => {
    if (Platform.OS === 'web') {
      const newValue = parseInt(event.target.value, 10);
      onChange(newValue);
    }
  };

  const handleTextChange = (text: string) => {
    const numValue = parseInt(text, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onChange(numValue);
    } else if (text === '') {
      onChange(0);
    }
  };

  const deductibleAmount = (amount * value) / 100;

  return (
    <View style={styles.container}>
      <View style={styles.sliderRow}>
        <View style={styles.percentageContainer}>
          <TextInput
            style={styles.percentageText}
            value={`${value}`}
            onChangeText={handleTextChange}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.percentSymbol}>%</Text>
        </View>

        {Platform.OS === 'web' ? (
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            onChange={handleSliderChange}
            style={{
              flex: 1,
              marginLeft: 16,
              marginRight: 16,
              height: 6,
              borderRadius: 3,
              outline: 'none',
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
              WebkitAppearance: 'none' as any,
              cursor: 'pointer',
            }}
            className="business-use-slider"
          />
        ) : (
          <View style={styles.sliderPlaceholder}>
            <View style={[styles.sliderTrack, { width: `${value}%` }]} />
          </View>
        )}

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.button}
            onPress={decrement}
            disabled={value === 0}
          >
            <Text style={[styles.buttonText, value === 0 && styles.buttonTextDisabled]}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={increment}
            disabled={value === 100}
          >
            <Text style={[styles.buttonText, value === 100 && styles.buttonTextDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.helperText}>
        You can deduct ${deductibleAmount.toFixed(2)} of this ${amount.toFixed(2)} expense
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
  },
  percentageText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
    minWidth: 50,
    padding: 0,
  },
  percentSymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 2,
  },
  sliderPlaceholder: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sliderTrack: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
  },
  buttonTextDisabled: {
    color: '#d1d5db',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});
