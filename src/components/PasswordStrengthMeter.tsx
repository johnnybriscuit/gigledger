import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { validatePassword, PasswordValidationResult } from '../lib/passwordValidation';

interface PasswordStrengthMeterProps {
  password: string;
  showErrors?: boolean;
}

export function PasswordStrengthMeter({ password, showErrors = true }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const result: PasswordValidationResult = validatePassword(password);
  const { strength, score, errors, suggestions } = result;

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return '#ef4444';
      case 'fair': return '#f59e0b';
      case 'good': return '#10b981';
      case 'strong': return '#059669';
      default: return '#9ca3af';
    }
  };

  const getStrengthLabel = () => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'fair': return 'Fair';
      case 'good': return 'Good';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Strength bar */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View 
            style={[
              styles.barFill, 
              { 
                width: `${score}%`,
                backgroundColor: getStrengthColor()
              }
            ]} 
          />
        </View>
        <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
          {getStrengthLabel()}
        </Text>
      </View>

      {/* Errors (required) */}
      {showErrors && errors.length > 0 && (
        <View style={styles.messageContainer} role="alert" aria-live="polite">
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      {/* Suggestions (optional improvements) */}
      {showErrors && errors.length === 0 && suggestions.length > 0 && strength !== 'strong' && (
        <View style={styles.messageContainer}>
          {suggestions.slice(0, 2).map((suggestion, index) => (
            <Text key={index} style={styles.suggestionText}>
              💡 {suggestion}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 50,
  },
  messageContainer: {
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    lineHeight: 18,
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 2,
  },
});
