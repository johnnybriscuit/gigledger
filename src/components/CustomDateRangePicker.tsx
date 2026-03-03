/**
 * Custom Date Range Picker
 * Allows users to select specific date ranges or years
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';

interface CustomDateRangePickerProps {
  onSelectRange: (start: Date, end: Date) => void;
  onClose: () => void;
}

export function CustomDateRangePicker({ onSelectRange, onClose }: CustomDateRangePickerProps) {
  const [mode, setMode] = useState<'dates' | 'year'>('dates');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleApplyDates = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Invalid date format');
      return;
    }

    if (start > end) {
      alert('Start date must be before end date');
      return;
    }

    onSelectRange(start, end);
  };

  const handleApplyYear = () => {
    if (!selectedYear) {
      alert('Please select a year');
      return;
    }

    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);
    onSelectRange(start, end);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Custom Date Range</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'dates' && styles.modeButtonActive]}
          onPress={() => setMode('dates')}
        >
          <Text style={[styles.modeButtonText, mode === 'dates' && styles.modeButtonTextActive]}>
            Date Range
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'year' && styles.modeButtonActive]}
          onPress={() => setMode('year')}
        >
          <Text style={[styles.modeButtonText, mode === 'year' && styles.modeButtonTextActive]}>
            Year
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Mode */}
      {mode === 'dates' && (
        <ScrollView style={styles.scrollWrapper} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.dateInputGroup}>
            <Text style={styles.label}>Start Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: 12,
                  fontSize: 14,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  width: '100%',
                }}
              />
            ) : (
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            )}
          </View>

          <View style={styles.dateInputGroup}>
            <Text style={styles.label}>End Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: 12,
                  fontSize: 14,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  width: '100%',
                }}
              />
            ) : (
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            )}
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={handleApplyDates}>
            <Text style={styles.applyButtonText}>Apply Date Range</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Year Mode */}
      {mode === 'year' && (
        <View style={styles.scrollWrapper}>
          <View style={styles.yearModeContent}>
            <Text style={styles.label}>Select Year</Text>
          <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearOption,
                  selectedYear === year && styles.yearOptionActive,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <View style={styles.radioOuter}>
                  {selectedYear === year && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.yearText,
                    selectedYear === year && styles.yearTextActive,
                  ]}
                >
                  {year}
                </Text>
                {selectedYear === year && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>

            <TouchableOpacity style={styles.applyButton} onPress={handleApplyYear}>
              <Text style={styles.applyButtonText}>Apply Year</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 400,
    maxWidth: '90%',
    maxHeight: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    color: '#6b7280',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    marginHorizontal: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  modeButtonTextActive: {
    color: '#111827',
  },
  content: {
    gap: 16,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  dateInputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  yearModeContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    flex: 1,
  },
  yearList: {
    maxHeight: 240,
    marginVertical: 12,
  },
  yearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  yearOptionActive: {
    backgroundColor: '#f0f9ff',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  yearText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  yearTextActive: {
    fontWeight: '600',
    color: '#1e40af',
  },
  checkmark: {
    fontSize: 16,
    color: '#3b82f6',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
