/**
 * Native filter bottom sheet
 *
 * Shared presentation shell for mobile filter menus (client, date range, etc.)
 * so we don't hand-roll anchored popover positioning per filter on native —
 * a bottom sheet sidesteps trigger-measurement/safe-area math entirely and is
 * the more native iOS pattern for this kind of filter.
 */

import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function FilterBottomSheet({ visible, onClose, title, children }: FilterBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  // The static `colors` export falls back to the light palette on native
  // (see AppShell's cssVar usage) — use the dynamic palette so this sheet
  // matches the dark cards used throughout the rest of the dashboard.
  const colors = getThemePalette(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps inside the sheet so they don't fall through to the backdrop */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface.elevated }]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
          <Text style={[styles.title, { color: colors.text.DEFAULT, borderBottomColor: colors.border.muted }]}>
            {title}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
});
