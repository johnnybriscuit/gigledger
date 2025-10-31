/**
 * Side panel drawer for drill-through views
 * Web: slides in from right
 * Mobile: full-screen modal
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../lib/charts/colors';

interface SidePanelProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onExport?: () => void;
}

export function SidePanel({
  visible,
  onClose,
  title,
  subtitle,
  children,
  onExport,
}: SidePanelProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      transparent={Platform.OS === 'web'}
      onRequestClose={onClose}
    >
      <View style={[
        styles.overlay,
        Platform.OS === 'web' && styles.webOverlay,
      ]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[
          styles.panel,
          { backgroundColor: colors.cardBg },
          Platform.OS === 'web' && styles.webPanel,
        ]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {onExport && (
                <TouchableOpacity style={styles.exportButton} onPress={onExport}>
                  <Text style={[styles.exportText, { color: colors.text }]}>📊 Export</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    ...Platform.select({
      default: {
        backgroundColor: '#000',
      },
    }),
  },
  webOverlay: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...Platform.select({
      web: {
        flex: 1,
      },
      default: {
        display: 'none',
      },
    }),
  },
  panel: {
    flex: 1,
    ...Platform.select({
      web: {
        width: 500,
        maxWidth: '90%',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  webPanel: {
    flex: undefined,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  exportText: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
