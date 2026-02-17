/**
 * Desktop-only anchored date range popover
 * Opens beneath the trigger button, not center-screen
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import type { DateRange } from '../hooks/useDashboardData';
import { CustomDateRangePicker } from './CustomDateRangePicker';

interface RangePopoverProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onCustomRangeChange?: (start: Date, end: Date) => void;
  options: Array<{ value: DateRange; label: string }>;
  customStart?: Date;
  customEnd?: Date;
}

export function RangePopover({ value, onChange, onCustomRangeChange, options, customStart, customEnd }: RangePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<any>(null);

  const selectedOption = options.find(opt => opt.value === value);
  
  const getDisplayLabel = () => {
    if (value === 'custom' && customStart && customEnd) {
      const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${formatDate(customStart)} - ${formatDate(customEnd)}`;
    }
    return selectedOption?.label || 'Select Range';
  };

  const handleOpen = () => {
    if (Platform.OS === 'web' && triggerRef.current) {
      // Get DOM node position
      const node = triggerRef.current;
      if (node && node.getBoundingClientRect) {
        const rect = node.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8, // 8px offset below button
          left: rect.left,
          width: rect.width,
        });
      }
    }
    setIsOpen(true);
  };

  const handleSelect = (range: DateRange) => {
    if (range === 'custom') {
      setIsOpen(false);
      setShowCustomPicker(true);
    } else {
      onChange(range);
      setIsOpen(false);
    }
  };

  const handleCustomRangeSelect = (start: Date, end: Date) => {
    if (onCustomRangeChange) {
      onCustomRangeChange(start, end);
    }
    setShowCustomPicker(false);
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerIcon}>📅</Text>
        <Text style={styles.triggerText}>{getDisplayLabel()}</Text>
        <Text style={styles.triggerArrow}>▼</Text>
      </TouchableOpacity>

      {isOpen && (
        <Modal
          visible={isOpen}
          transparent
          animationType="none"
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setIsOpen(false)}
          >
            <View
              style={[
                styles.popover,
                {
                  position: 'absolute',
                  top: position.top,
                  left: position.left,
                  minWidth: position.width,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.popoverHeader}>
                <Text style={styles.popoverTitle}>Select Range</Text>
              </View>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    value === option.value && styles.optionActive,
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.radioOuter}>
                    {value === option.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      value === option.value && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Custom option */}
              <TouchableOpacity
                style={[
                  styles.option,
                  value === 'custom' && styles.optionActive,
                ]}
                onPress={() => handleSelect('custom')}
              >
                <View style={styles.radioOuter}>
                  {value === 'custom' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    value === 'custom' && styles.optionTextActive,
                  ]}
                >
                  Custom Range...
                </Text>
                {value === 'custom' && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Custom Date Range Picker Modal */}
      {showCustomPicker && (
        <Modal
          visible={showCustomPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCustomPicker(false)}
        >
          <View style={styles.customPickerBackdrop}>
            <Pressable
              style={styles.customPickerBackdropPressable}
              onPress={() => setShowCustomPicker(false)}
            />
            <View style={styles.customPickerContainer}>
              <CustomDateRangePicker
                onSelectRange={handleCustomRangeSelect}
                onClose={() => setShowCustomPicker(false)}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  triggerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  triggerArrow: {
    fontSize: 10,
    color: '#6b7280',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  popover: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  popoverHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  popoverTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  optionActive: {
    backgroundColor: '#eff6ff',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  optionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '700',
    marginLeft: 8,
  },
  customPickerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPickerBackdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  customPickerContainer: {
    zIndex: 1,
  },
});
