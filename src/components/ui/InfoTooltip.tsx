import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { colors } from '../../styles/theme';

interface InfoTooltipProps {
  text: string;
  title?: string;
}

export function InfoTooltip({ text, title = 'About This Number' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        activeOpacity={0.7}
        accessibilityLabel="More information"
        accessibilityRole="button"
      >
        <Text style={styles.icon}>ⓘ</Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.card} onStartShouldSetResponder={() => true}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{title}</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Close"
                accessibilityRole="button"
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <Text style={styles.cardText}>{text}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 13,
    color: colors.text.subtle,
    lineHeight: 16,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    width: '100%',
    maxWidth: 360,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 },
      android: { elevation: 12 },
      web: { boxShadow: '0 8px 32px rgba(15,23,42,0.18)' } as any,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    flex: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    lineHeight: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.muted,
    marginHorizontal: 20,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text.muted,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
