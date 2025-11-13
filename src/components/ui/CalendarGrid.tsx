/**
 * CalendarGrid Component
 * Pure calendar grid for date selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { isSameDay, isBeforeDay, isAfterDay } from '../../lib/date';

interface CalendarGridProps {
  /** The month to display */
  month: Date;
  /** Currently selected date */
  value?: Date | null;
  /** Callback when a date is selected */
  onSelect: (date: Date) => void;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Theme (light or dark) */
  isDark?: boolean;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarGrid({
  month,
  value,
  onSelect,
  minDate,
  maxDate,
  isDark = false,
}: CalendarGridProps) {
  // Get all days to display (including padding days from prev/next month)
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  
  const today = new Date();

  return (
    <View style={styles.container}>
      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, isDark && styles.weekdayTextDark]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.daysGrid}>
        {days.map((day) => {
          const isOtherMonth = !isSameMonth(day, month);
          const isSelected = value && isSameDay(day, value);
          const isToday = isSameDay(day, today);
          const isDisabled =
            (minDate && isBeforeDay(day, minDate)) ||
            (maxDate && isAfterDay(day, maxDate));

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => !isDisabled && onSelect(day)}
              disabled={isDisabled}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={format(day, 'MMMM d, yyyy')}
              accessibilityState={{
                selected: !!isSelected,
                disabled: !!isDisabled,
              }}
            >
              <Text
                style={[
                  styles.dayText,
                  isDark && styles.dayTextDark,
                  isOtherMonth && styles.dayTextOtherMonth,
                  isOtherMonth && isDark && styles.dayTextOtherMonthDark,
                  isDisabled && styles.dayTextDisabled,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday,
                ]}
              >
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  weekdayTextDark: {
    color: '#9ca3af',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: '13.28%', // ~1/7th with gaps
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    minHeight: 40,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      },
    }),
  },
  dayCellSelected: {
    backgroundColor: '#3b82f6',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  dayTextDark: {
    color: '#f9fafb',
  },
  dayTextOtherMonth: {
    color: '#d1d5db',
  },
  dayTextOtherMonthDark: {
    color: '#4b5563',
  },
  dayTextDisabled: {
    color: '#d1d5db',
    opacity: 0.4,
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dayTextToday: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
