/**
 * DatePickerModal Component
 * Reusable, accessible modal date picker for GigLedger
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { addMonths, subMonths, startOfMonth, format, setMonth as setDateMonth, setYear } from 'date-fns';
import { CalendarGrid } from './CalendarGrid';
import { getToday } from '../../lib/date';

export interface DatePickerModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current selected value (local Date) */
  value?: Date | null;
  /** Callback when date is applied */
  onChange: (date: Date) => void;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Modal title */
  title?: string;
  /** Initial month to show when no value */
  initialMonth?: Date;
  /** Show "Today" shortcut button */
  showTodayShortcut?: boolean;
  /** Theme (light or dark) */
  isDark?: boolean;
}

export function DatePickerModal({
  open,
  onOpenChange,
  value,
  onChange,
  minDate,
  maxDate,
  title = 'Select date',
  initialMonth,
  showTodayShortcut = true,
  isDark = false,
}: DatePickerModalProps) {
  // Draft state for the selected date (not committed until Apply)
  const [draft, setDraft] = useState<Date>(value ?? getToday());
  // Current month being displayed
  const [month, setMonth] = useState<Date>(
    startOfMonth(value ?? initialMonth ?? getToday())
  );
  // Month/year picker state
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  // Update draft when value changes externally
  useEffect(() => {
    if (value) {
      setDraft(value);
      setMonth(startOfMonth(value));
    }
  }, [value]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setMonth((m) => subMonths(m, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setMonth((m) => addMonths(m, 1));
  };

  // Handle date selection (updates draft)
  const handleSelectDate = (date: Date) => {
    setDraft(date);
  };

  // Handle "Today" shortcut
  const handleToday = () => {
    const today = getToday();
    setDraft(today);
    setMonth(startOfMonth(today));
  };

  // Handle month/year selection
  const handleMonthYearSelect = (monthIndex: number, yearValue: number) => {
    const newMonth = setYear(setDateMonth(month, monthIndex), yearValue);
    setMonth(startOfMonth(newMonth));
    setShowMonthYearPicker(false);
  };

  // Handle Apply button
  const handleApply = () => {
    onChange(draft);
    onOpenChange(false);
  };

  // Handle Cancel button
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
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.content,
            isDark && styles.contentDark,
            Platform.OS === 'web' && styles.contentWeb,
          ]}
        >
          {/* Header with month navigation */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.navButton, isDark && styles.navButtonDark]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Text style={[styles.navButtonText, isDark && styles.navButtonTextDark]}>
                ‹
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerTitle}
              onPress={() => setShowMonthYearPicker(true)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Select month and year"
            >
              <Text style={[styles.monthText, isDark && styles.monthTextDark]}>
                {format(month, 'MMMM yyyy')}
              </Text>
              <Text style={[styles.dropdownIcon, isDark && styles.dropdownIconDark]}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navButton, isDark && styles.navButtonDark]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Text style={[styles.navButtonText, isDark && styles.navButtonTextDark]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* Calendar grid */}
          <CalendarGrid
            month={month}
            value={draft}
            onSelect={handleSelectDate}
            minDate={minDate}
            maxDate={maxDate}
            isDark={isDark}
          />

          {/* Footer with actions */}
          <View style={styles.footer}>
            {showTodayShortcut && (
              <TouchableOpacity
                onPress={handleToday}
                style={styles.todayButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Select today"
              >
                <Text style={[styles.todayButtonText, isDark && styles.todayButtonTextDark]}>
                  Today
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleCancel}
                style={[styles.button, styles.buttonCancel, isDark && styles.buttonCancelDark]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApply}
                style={[styles.button, styles.buttonApply]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Apply date selection"
              >
                <Text style={[styles.buttonText, styles.buttonTextApply]}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Month/Year Picker Modal */}
      {showMonthYearPicker && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMonthYearPicker(false)}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShowMonthYearPicker(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.pickerContent, isDark && styles.pickerContentDark]}
            >
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, isDark && styles.pickerTitleDark]}>
                  Select Month & Year
                </Text>
                <TouchableOpacity onPress={() => setShowMonthYearPicker(false)}>
                  <Text style={[styles.pickerClose, isDark && styles.pickerCloseDark]}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerScroll}>
                {/* Generate years from 2020 to current year + 2 */}
                {Array.from(
                  { length: new Date().getFullYear() - 2018 },
                  (_, i) => new Date().getFullYear() + 2 - i
                ).map((year) => (
                  <View key={year} style={styles.yearSection}>
                    <Text style={[styles.yearLabel, isDark && styles.yearLabelDark]}>{year}</Text>
                    <View style={styles.monthGrid}>
                      {[
                        'Jan',
                        'Feb',
                        'Mar',
                        'Apr',
                        'May',
                        'Jun',
                        'Jul',
                        'Aug',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dec',
                      ].map((monthName, monthIndex) => {
                        const isSelected =
                          month.getFullYear() === year && month.getMonth() === monthIndex;
                        return (
                          <TouchableOpacity
                            key={monthName}
                            style={[
                              styles.monthButton,
                              isDark && styles.monthButtonDark,
                              isSelected && styles.monthButtonSelected,
                            ]}
                            onPress={() => handleMonthYearSelect(monthIndex, year)}
                          >
                            <Text
                              style={[
                                styles.monthButtonText,
                                isDark && styles.monthButtonTextDark,
                                isSelected && styles.monthButtonTextSelected,
                              ]}
                            >
                              {monthName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
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
    maxWidth: 720,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  monthTextDark: {
    color: '#f9fafb',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  dropdownIconDark: {
    color: '#9ca3af',
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      },
    }),
  },
  navButtonDark: {
    backgroundColor: 'transparent',
  },
  navButtonText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#374151',
  },
  navButtonTextDark: {
    color: '#d1d5db',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  todayButtonTextDark: {
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
  // Month/Year Picker Styles
  pickerContent: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
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
  pickerContentDark: {
    backgroundColor: '#1f2937',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pickerTitleDark: {
    color: '#f9fafb',
  },
  pickerClose: {
    fontSize: 20,
    color: '#6b7280',
    paddingHorizontal: 8,
  },
  pickerCloseDark: {
    color: '#9ca3af',
  },
  pickerScroll: {
    maxHeight: 400,
  },
  yearSection: {
    marginBottom: 24,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  yearLabelDark: {
    color: '#f9fafb',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
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
  monthButtonDark: {
    backgroundColor: '#374151',
  },
  monthButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  monthButtonTextDark: {
    color: '#d1d5db',
  },
  monthButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
