/**
 * TimePickerModal Component
 * Reusable, accessible modal time picker for Bozzy.
 * Mirrors DatePickerModal's layout/interaction pattern (grid selection,
 * Cancel/Apply footer) but for a 12-hour time with AM/PM.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface TimePickerModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current value as 24-hour "HH:MM", or empty/undefined when unset */
  value?: string;
  /** Callback when a time is applied. Called with '' when cleared. */
  onChange: (value: string) => void;
  /** Modal title */
  title?: string;
  /** Theme (light or dark) */
  isDark?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

function to24Hour(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let hour24 = hour12 % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function from24Hour(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const [hStr, mStr] = value.split(':');
  const hour24 = parseInt(hStr, 10) || 0;
  const minute = parseInt(mStr, 10) || 0;
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

export function formatTime12Hour(value: string | undefined | null): string {
  if (!value) return '';
  const { hour12, minute, period } = from24Hour(value);
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function TimePickerModal({
  open,
  onOpenChange,
  value,
  onChange,
  title = 'Select time',
  isDark,
}: TimePickerModalProps) {
  const { theme } = useTheme();
  const resolvedIsDark = typeof isDark === 'boolean' ? isDark : theme === 'dark';

  const initial = value ? from24Hour(value) : { hour12: 7, minute: 0, period: 'PM' as const };
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);

  useEffect(() => {
    if (open) {
      const parsed = value ? from24Hour(value) : { hour12: 7, minute: 0, period: 'PM' as const };
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [open, value]);

  const handleApply = () => {
    onChange(to24Hour(hour12, minute, period));
    onOpenChange(false);
  };

  const handleClear = () => {
    onChange('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
      statusBarTranslucent={true}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleCancel}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.content, resolvedIsDark && styles.contentDark, Platform.OS === 'web' && styles.contentWeb]}
        >
          <Text style={[styles.title, resolvedIsDark && styles.titleDark]}>{title}</Text>

          <Text style={[styles.sectionLabel, resolvedIsDark && styles.sectionLabelDark]}>Hour</Text>
          <View style={styles.grid}>
            {HOURS.map((h) => {
              const isSelected = h === hour12;
              return (
                <TouchableOpacity
                  key={h}
                  style={[styles.cell, resolvedIsDark && styles.cellDark, isSelected && styles.cellSelected]}
                  onPress={() => setHour12(h)}
                  accessibilityRole="button"
                  accessibilityLabel={`${h} hour`}
                >
                  <Text style={[styles.cellText, resolvedIsDark && styles.cellTextDark, isSelected && styles.cellTextSelected]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, resolvedIsDark && styles.sectionLabelDark]}>Minute</Text>
          <View style={styles.grid}>
            {MINUTES.map((m) => {
              const isSelected = m === minute;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.cell, resolvedIsDark && styles.cellDark, isSelected && styles.cellSelected]}
                  onPress={() => setMinute(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m} minutes`}
                >
                  <Text style={[styles.cellText, resolvedIsDark && styles.cellTextDark, isSelected && styles.cellTextSelected]}>
                    {String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.periodRow}>
            {(['AM', 'PM'] as const).map((p) => {
              const isSelected = p === period;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodButton, resolvedIsDark && styles.periodButtonDark, isSelected && styles.periodButtonSelected]}
                  onPress={() => setPeriod(p)}
                  accessibilityRole="button"
                  accessibilityLabel={p}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      resolvedIsDark && styles.periodButtonTextDark,
                      isSelected && styles.periodButtonTextSelected,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear time"
            >
              <Text style={[styles.clearButtonText, resolvedIsDark && styles.clearButtonTextDark]}>Clear</Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleCancel}
                style={[styles.button, styles.buttonCancel, resolvedIsDark && styles.buttonCancelDark]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.buttonText, resolvedIsDark && styles.buttonTextDark]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApply}
                style={[styles.button, styles.buttonApply]}
                accessibilityRole="button"
                accessibilityLabel="Apply time selection"
              >
                <Text style={[styles.buttonText, styles.buttonTextApply]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(4px)',
      },
    }),
  },
  content: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  contentDark: {
    backgroundColor: '#1f2937',
  },
  contentWeb: {
    maxWidth: 420,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  titleDark: {
    color: '#f9fafb',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  sectionLabelDark: {
    color: '#9ca3af',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cell: {
    width: '21.5%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      },
    }),
  },
  cellDark: {
    backgroundColor: '#374151',
  },
  cellSelected: {
    backgroundColor: '#3b82f6',
  },
  cellText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  cellTextDark: {
    color: '#d1d5db',
  },
  cellTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  periodButtonDark: {
    backgroundColor: '#374151',
  },
  periodButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  periodButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  periodButtonTextDark: {
    color: '#d1d5db',
  },
  periodButtonTextSelected: {
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  clearButtonTextDark: {
    color: '#60a5fa',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      },
    }),
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonCancelDark: {
    borderColor: '#4b5563',
  },
  buttonApply: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  buttonTextDark: {
    color: '#f9fafb',
  },
  buttonTextApply: {
    color: '#ffffff',
  },
});
