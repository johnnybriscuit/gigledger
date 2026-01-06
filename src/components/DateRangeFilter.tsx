import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import type { DateRange } from '../hooks/useDashboardData';
import { useResponsive } from '../hooks/useResponsive';

interface DateRangeFilterProps {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
}

const FILTER_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'ytd', label: 'YTD' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'lastYear', label: 'Last Year' },
  // { value: 'custom', label: 'Custom' }, // TODO: Implement custom date picker
];

export function DateRangeFilter({ selected, onSelect }: DateRangeFilterProps) {
  const { isMobileWeb } = useResponsive();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedOption = FILTER_OPTIONS.find(opt => opt.value === selected);

  const handleSelect = (value: DateRange) => {
    onSelect(value);
    setDropdownOpen(false);
  };

  // Both mobile and desktop: Dropdown selector
  return (
    <>
      <View style={[styles.container, !isMobileWeb && styles.containerDesktop]}>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            isMobileWeb ? styles.dropdownButtonMobile : styles.dropdownButtonDesktop,
          ]}
          onPress={() => setDropdownOpen(true)}
        >
          <Text style={styles.dropdownIcon}>📅</Text>
          <Text style={styles.dropdownText}>{selectedOption?.label || 'Select Range'}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View 
            style={[
              styles.modalContent,
              !isMobileWeb && styles.modalContentDesktop,
            ]}
            onStartShouldSetResponder={() => true}
          >
            {isMobileWeb && (
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date Range</Text>
              </View>
            )}
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  selected === option.value && styles.modalOptionActive,
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selected === option.value && styles.modalOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {selected === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  containerDesktop: {
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  // Dropdown button styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonMobile: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  dropdownButtonDesktop: {
    width: 220,
    alignSelf: 'flex-start',
  },
  dropdownIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalContentDesktop: {
    maxWidth: 280,
    borderRadius: 12,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionActive: {
    backgroundColor: '#eff6ff',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  modalOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '700',
  },
});
