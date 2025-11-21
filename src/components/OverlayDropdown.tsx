/**
 * OverlayDropdown Component
 * True modal overlay for autocomplete dropdowns
 * Renders above all content with opaque background
 */

import React, { useEffect } from 'react';
import { Modal, View, Pressable, Platform, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../ui';

export type DropdownItem = {
  id: string;
  label: string;
  subtitle?: string;
};

type OverlayDropdownProps = {
  visible: boolean;
  top: number;
  left: number;
  width: number;
  onClose: () => void;
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  loading?: boolean;
  emptyMessage?: string;
  activeIndex?: number;
};

export default function OverlayDropdown({
  visible,
  top,
  left,
  width,
  onClose,
  items,
  onSelect,
  loading = false,
  emptyMessage = 'No results found',
  activeIndex = -1,
}: OverlayDropdownProps) {
  // Lock scroll on web when visible
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const prevOverflow = (document.body.style as any).overflow;
      (document.body.style as any).overflow = 'hidden';
      return () => {
        (document.body.style as any).overflow = prevOverflow;
      };
    }
  }, [visible]);

  // Handle ESC key on web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Full-screen backdrop - blocks clicks and closes on press */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={styles.backdrop} />
      </Pressable>

      {/* Dropdown container anchored to input position */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.dropdown,
            {
              top,
              left,
              width,
            },
          ]}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    index === activeIndex && styles.rowActive,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.label}>{item.label}</Text>
                  {item.subtitle ? (
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  ) : null}
                </Pressable>
              )}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    maxHeight: 320,
    backgroundColor: '#ffffff', // FULLY OPAQUE
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
    // Strong shadow for elevation
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 16,
      },
      web: {
        // @ts-ignore
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  list: {
    flex: 1,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  rowActive: {
    backgroundColor: '#eef2ff',
  },
  rowPressed: {
    backgroundColor: '#e0e7ff',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
