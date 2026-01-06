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
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = FILTER_OPTIONS.find(opt => opt.value === selected);

  const handleSelect = (value: DateRange) => {
    onSelect(value);
    setModalVisible(false);
  };

  // Mobile: Dropdown with modal
  if (isMobileWeb) {
    return (
      <>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.dropdownIcon}>📅</Text>
            <Text style={styles.dropdownText}>{selectedOption?.label || 'Select Range'}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date Range</Text>
              </View>
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

  // Desktop: Button row (existing implementation)
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterButton,
              selected === option.value && styles.filterButtonActive,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.filterText,
                selected === option.value && styles.filterTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  // Mobile dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 12,
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
