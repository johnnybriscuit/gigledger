/**
 * Payer/Artist Filter Component
 * Allows filtering dashboard data by specific payer/artist
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
  ScrollView,
} from 'react-native';

interface PayerFilterProps {
  value: string | null;
  onChange: (payerId: string | null) => void;
  payers: Array<{ id: string; name: string }>;
}

export function PayerFilter({ value, onChange, payers }: PayerFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<any>(null);

  const selectedPayer = payers.find(p => p.id === value);

  const handleOpen = () => {
    if (Platform.OS === 'web' && triggerRef.current) {
      const node = triggerRef.current;
      if (node && node.getBoundingClientRect) {
        const rect = node.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        });
      }
    }
    setIsOpen(true);
  };

  const handleSelect = (payerId: string | null) => {
    onChange(payerId);
    setIsOpen(false);
  };

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
        <Text style={styles.triggerIcon}>👤</Text>
        <Text style={styles.triggerText}>
          {selectedPayer?.name || 'All Payers'}
        </Text>
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
                <Text style={styles.popoverTitle}>Filter by Payer</Text>
              </View>
              
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* All Payers option */}
                <TouchableOpacity
                  style={[
                    styles.option,
                    value === null && styles.optionActive,
                  ]}
                  onPress={() => handleSelect(null)}
                >
                  <View style={styles.radioOuter}>
                    {value === null && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      value === null && styles.optionTextActive,
                    ]}
                  >
                    All Payers
                  </Text>
                  {value === null && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>

                {/* Individual payers */}
                {payers.map((payer) => (
                  <TouchableOpacity
                    key={payer.id}
                    style={[
                      styles.option,
                      value === payer.id && styles.optionActive,
                    ]}
                    onPress={() => handleSelect(payer.id)}
                  >
                    <View style={styles.radioOuter}>
                      {value === payer.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        value === payer.id && styles.optionTextActive,
                      ]}
                    >
                      {payer.name}
                    </Text>
                    {value === payer.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 160,
  },
  triggerIcon: {
    fontSize: 16,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  triggerArrow: {
    fontSize: 10,
    color: '#6b7280',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  popover: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 320,
    maxHeight: 400,
    zIndex: 9999,
  },
  popoverHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  optionActive: {
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
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  optionTextActive: {
    fontWeight: '600',
    color: '#1e40af',
  },
  checkmark: {
    fontSize: 16,
    color: '#3b82f6',
  },
});
