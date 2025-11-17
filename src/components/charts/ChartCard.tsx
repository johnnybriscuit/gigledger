/**
 * Reusable chart card wrapper with consistent styling
 * Includes title, subtitle, info tooltip, and download button (web only)
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
              onPress={() => {
                if (Platform.OS === 'web') {
                  alert(info);
                }
              }}
            >
              <Text style={[styles.infoIcon, { color: colors.textMuted }]}>ⓘ</Text>
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
    backgroundColor: '#f3f4f6',
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
});
