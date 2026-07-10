import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export interface AdjustBucketPercentageModalProps {
  isVisible: boolean;
  onClose: () => void;
  bucketName: string;
  /** A string renders as emoji/text, a ReactNode (e.g. an Ionicons element) renders as-is */
  bucketEmoji: string | React.ReactNode;
  currentPercentage: number;
  suggestedPercentage: number;
  onSave: (newPercentage: number) => void;
  annualIncome?: number;
}

export function AdjustBucketPercentageModal({
  isVisible,
  onClose,
  bucketName,
  bucketEmoji,
  currentPercentage,
  suggestedPercentage,
  onSave,
  annualIncome = 0,
}: AdjustBucketPercentageModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [percentage, setPercentage] = useState(currentPercentage);

  useEffect(() => {
    if (isVisible) {
      setPercentage(currentPercentage);
    }
  }, [isVisible, currentPercentage]);

  const decrement = () => setPercentage((p) => Math.max(0, p - 1));
  const increment = () => setPercentage((p) => Math.min(50, p + 1));

  const yearlyAmount = annualIncome * (percentage / 100);
  const monthlyAmount = yearlyAmount / 12;
  const diffFromCurrent = percentage - currentPercentage;
  const additionalPerYear = annualIncome * (Math.abs(diffFromCurrent) / 100);

  const hasChange = percentage !== currentPercentage;

  const barFillPct = Math.min((percentage / 50) * 100, 100);

  const contentStyle = [
    styles.content,
    isDark && styles.contentDark,
    Platform.OS !== 'web' && styles.contentMobile,
  ];

  return (
    <Modal
      visible={isVisible}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      transparent
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS !== 'web'}
    >
      <TouchableOpacity
        style={[styles.overlay, Platform.OS !== 'web' && styles.overlayMobile]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={Platform.OS !== 'web' ? styles.sheetWrapper : undefined}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={contentStyle}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {typeof bucketEmoji === 'string' ? (
                  <Text style={styles.headerIcon}>{bucketEmoji}</Text>
                ) : bucketEmoji}
                <Text style={[styles.headerTitle, isDark && styles.textLight]}>
                  Adjust {bucketName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.closeText, isDark && styles.closeTextDark]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Impact description */}
            {annualIncome > 0 && hasChange && (
              <Text style={[styles.description, isDark && styles.textMuted]}>
                {diffFromCurrent > 0 ? 'Increasing' : 'Decreasing'} from {currentPercentage}%
                {' '}to {percentage}% on your current income would mean{' '}
                <Text style={[styles.impactHighlight, { color: '#3b82f6' }]}>
                  {fmtCurrency(additionalPerYear)}{' '}
                  {diffFromCurrent > 0 ? 'more' : 'less'}
                </Text>
                {' '}per year toward {bucketName.toLowerCase()}.
              </Text>
            )}

            {/* Current / adjuster / suggested row */}
            <View style={styles.percentageRow}>
              <View style={styles.labelPair}>
                <Text style={[styles.smallLabel, isDark && styles.textMuted]}>Current</Text>
                <Text style={[styles.currentPct, isDark && styles.textMuted]}>
                  {currentPercentage}%
                </Text>
              </View>

              <View style={styles.adjuster}>
                <TouchableOpacity
                  style={[styles.adjBtn, isDark && styles.adjBtnDark]}
                  onPress={decrement}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={[styles.adjBtnText, isDark && styles.textLight]}>−</Text>
                </TouchableOpacity>
                <View style={[styles.pctDisplay, isDark && styles.pctDisplayDark]}>
                  <Text style={[styles.pctValue, isDark && styles.textLight]}>{percentage}%</Text>
                </View>
                <TouchableOpacity
                  style={[styles.adjBtn, isDark && styles.adjBtnDark]}
                  onPress={increment}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={[styles.adjBtnText, isDark && styles.textLight]}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.labelPair}>
                <Text style={[styles.smallLabel, isDark && styles.textMuted]}>Suggested</Text>
                <TouchableOpacity onPress={() => setPercentage(suggestedPercentage)}>
                  <Text style={styles.suggestedPct}>{suggestedPercentage}%</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Visual fill bar */}
            <View style={[styles.bar, isDark && styles.barDark]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${barFillPct}%` as any },
                ]}
              />
            </View>

            {/* Dollar impact */}
            {annualIncome > 0 && (
              <View style={[styles.impactBox, isDark && styles.impactBoxDark]}>
                <Text style={[styles.impactLabel, isDark && styles.textMuted]}>
                  On your current income this means:
                </Text>
                <Text style={[styles.impactValues, isDark && styles.textLight]}>
                  {fmtCurrency(monthlyAmount)}/mo · ~{fmtCurrency(yearlyAmount)}/yr
                </Text>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaButton, !hasChange && styles.ctaButtonDisabled]}
              onPress={() => onSave(percentage)}
              disabled={!hasChange}
            >
              <Text style={styles.ctaText}>Update to {percentage}%</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ web: { backdropFilter: 'blur(4px)' } as any }),
  },
  overlayMobile: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  sheetWrapper: {
    width: '100%',
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '92%',
    maxWidth: 420,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 20px 40px rgba(0,0,0,0.15)' } as any,
    }),
  },
  contentMobile: {
    width: '100%',
    maxWidth: undefined as any,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 34,
  },
  contentDark: {
    backgroundColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  closeText: {
    fontSize: 18,
    color: '#6b7280',
    paddingHorizontal: 4,
  },
  closeTextDark: {
    color: '#9ca3af',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 18,
  },
  impactHighlight: {
    fontWeight: '700',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  labelPair: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  smallLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  currentPct: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
  },
  suggestedPct: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  adjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  adjBtnDark: {
    backgroundColor: '#374151',
  },
  adjBtnText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 24,
  },
  pctDisplay: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  pctDisplayDark: {
    backgroundColor: '#1e3a5f',
  },
  pctValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 14,
  },
  barDark: {
    backgroundColor: '#374151',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  impactBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    gap: 4,
  },
  impactBoxDark: {
    backgroundColor: '#1e3a5f',
  },
  impactLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  impactValues: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  ctaButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  ctaButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  textLight: {
    color: '#f9fafb',
  },
  textMuted: {
    color: '#9ca3af',
  },
});
