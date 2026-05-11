import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';

interface PercentageSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  color: string;
  label: string;
  disabled?: boolean;
}

export function PercentageSlider({
  value,
  min,
  max,
  onChange,
  color,
  label,
  disabled = false,
}: PercentageSliderProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);

  const handleChange = (newValue: number) => {
    onChange(Math.round(newValue));
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text.DEFAULT }]}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value}%</Text>
      </View>
      {Platform.OS === 'web' ? (
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          disabled={disabled}
          style={{
            width: '100%',
            height: 8,
            borderRadius: 4,
            outline: 'none',
            opacity: disabled ? 0.5 : 1,
            accentColor: color,
          }}
        />
      ) : (
        <View style={[styles.nativeSlider, { backgroundColor: colors.border.muted }]}>
          <View
            style={[
              styles.nativeSliderFill,
              {
                backgroundColor: color,
                width: `${((value - min) / (max - min)) * 100}%`,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  nativeSlider: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  nativeSliderFill: {
    height: '100%',
    borderRadius: 4,
  },
});
