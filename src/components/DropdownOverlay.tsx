/**
 * DropdownOverlay Component
 * Modal-based dropdown that overlays content with proper positioning
 * Uses measureInWindow for cross-platform anchoring
 */

import React, { ReactNode } from 'react';
import { Modal, View, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import type { AnchorLayout } from '../hooks/useAnchorLayout';

type DropdownOverlayProps = {
  visible: boolean;
  anchor: AnchorLayout;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: number;
};

export default function DropdownOverlay({
  visible,
  anchor,
  onClose,
  children,
  maxHeight = 320,
}: DropdownOverlayProps) {
  if (!visible) return null;

  const windowHeight = Dimensions.get('window').height;
  const spaceBelow = windowHeight - (anchor.y + anchor.height);
  const spaceAbove = anchor.y;

  // Flip logic: if not enough space below, show above
  const showAbove = spaceBelow < maxHeight && spaceAbove > spaceBelow;

  const menuStyle = {
    position: 'absolute' as const,
    top: showAbove ? anchor.y - maxHeight - 6 : anchor.y + anchor.height + 6,
    left: anchor.x,
    width: anchor.width,
    maxHeight,
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      {/* Full-screen backdrop - blocks all clicks */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={styles.backdrop} />
      </Pressable>

      {/* Dropdown menu anchored to input */}
      <View
        style={[styles.menu, menuStyle]}
        // @ts-ignore - web-only props
        accessibilityRole={Platform.OS === 'web' ? 'menu' : undefined}
      >
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    backgroundColor: '#ffffff', // FULLY OPAQUE
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    // Shadow/elevation
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 12,
      },
      web: {
        // @ts-ignore
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
});
