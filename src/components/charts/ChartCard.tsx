/**
 * Reusable chart card wrapper with consistent styling
 * Includes title, subtitle, info tooltip, and download button (web only)
 */

import React, { ReactNode, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../lib/charts/colors';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  info?: string;
  children: ReactNode;
  onDownload?: () => void;
  minHeight?: number;
}

export function ChartCard({
  title,
  subtitle,
  info,
  children,
  onDownload,
  minHeight = 300,
}: ChartCardProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, minHeight }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          )}
        </View>

        <View style={styles.actions}>
          {info && (
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowInfo(true)}
            >
              <Text style={styles.infoIcon}>ℹ️</Text>
            </TouchableOpacity>
          )}

          {Platform.OS === 'web' && onDownload && (
            <TouchableOpacity style={styles.downloadButton} onPress={onDownload}>
              <Text style={[styles.downloadIcon, { color: colors.textMuted }]}>⬇</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chart Content */}
      <View style={styles.content}>{children}</View>

      {/* Info Modal */}
      {info && (
        <Modal
          visible={showInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfo(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowInfo(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalText}>{info}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowInfo(false)}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  infoButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e0e7ff', // Light blue-gray to match bottom cards
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 18,
    opacity: 0.8,
  },
  downloadButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIcon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
