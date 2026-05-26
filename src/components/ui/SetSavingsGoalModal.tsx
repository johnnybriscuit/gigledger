import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export interface SetSavingsGoalModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (goalAmount: number, monthlyExpenses: number) => void;
  currentGoalAmount?: number;
  currentBalance?: number;
  bucketName?: string;
  monthlyPace?: number | null;
}

type GoalOption = '3months' | '6months' | 'custom';

export function SetSavingsGoalModal({
  isVisible,
  onClose,
  onSave,
  currentGoalAmount,
  currentBalance = 0,
  bucketName = 'Emergency Fund',
  monthlyPace,
}: SetSavingsGoalModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [selectedOption, setSelectedOption] = useState<GoalOption>('3months');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (isVisible) {
      if (currentGoalAmount && currentGoalAmount > 0 && !monthlyExpenses) {
        setMonthlyExpenses(String(Math.round(currentGoalAmount / 3)));
      }
    }
  }, [isVisible]);

  const monthlyExpensesNum = parseFloat(monthlyExpenses.replace(/[^0-9.]/g, '')) || 0;
  const threeMonthGoal = monthlyExpensesNum * 3;
  const sixMonthGoal = monthlyExpensesNum * 6;
  const customNum = parseFloat(customAmount.replace(/[^0-9.]/g, '')) || 0;

  const computedGoal =
    selectedOption === '3months'
      ? threeMonthGoal
      : selectedOption === '6months'
      ? sixMonthGoal
      : customNum;

  const progress = computedGoal > 0 ? Math.min(currentBalance / computedGoal, 1) : 0;
  const progressPct = Math.round(progress * 100);

  const paceText = (() => {
    if (monthlyPace === null || monthlyPace === undefined) {
      return "You'll see your pace after your first gig allocation";
    }
    if (monthlyPace <= 0 || computedGoal <= 0) return null;
    const remaining = computedGoal - currentBalance;
    if (remaining <= 0) return '✅ Goal already reached!';
    const months = Math.ceil(remaining / monthlyPace);
    return `At your current pace (${fmt(monthlyPace)}/mo) you'll reach this in ~${months} month${months !== 1 ? 's' : ''}`;
  })();

  const handleSave = () => {
    if (computedGoal <= 0) return;
    onSave(computedGoal, monthlyExpensesNum);
  };

  const handleMonthlyExpensesChange = (text: string) => {
    setMonthlyExpenses(text.replace(/[^0-9]/g, ''));
  };

  const handleCustomAmountChange = (text: string) => {
    setCustomAmount(text.replace(/[^0-9]/g, ''));
  };

  const overlayStyle = [
    styles.overlay,
    Platform.OS !== 'web' && styles.overlayMobile,
  ];

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
      <TouchableOpacity style={overlayStyle} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={Platform.OS !== 'web' ? styles.sheetWrapper : undefined}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={contentStyle}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerIcon}>🛟</Text>
                  <Text style={[styles.headerTitle, isDark && styles.textLight]}>
                    Set your {bucketName} goal
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.closeText, isDark && styles.closeTextDark]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text style={[styles.description, isDark && styles.textMuted]}>
                Your emergency fund protects you when gigs dry up. The goal is 3–6 months of
                living expenses.
              </Text>

              {/* Monthly expenses input */}
              <Text style={[styles.label, isDark && styles.textSecondary]}>
                My monthly expenses are about:
              </Text>
              <View style={[styles.inputRow, isDark && styles.inputRowDark]}>
                <Text style={[styles.inputPrefix, isDark && styles.textLight]}>$</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark] as any}
                  value={monthlyExpenses}
                  onChangeText={handleMonthlyExpensesChange}
                  placeholder="2,000"
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>

              {/* Live calculations */}
              {monthlyExpensesNum > 0 && (
                <View style={[styles.calcBox, isDark && styles.calcBoxDark]}>
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, isDark && styles.textMuted]}>
                      3-month goal:
                    </Text>
                    <Text style={[styles.calcValue, isDark && styles.textLight]}>
                      {fmt(threeMonthGoal)}
                    </Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, isDark && styles.textMuted]}>
                      6-month goal:
                    </Text>
                    <Text style={[styles.calcValue, isDark && styles.textLight]}>
                      {fmt(sixMonthGoal)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Goal selection toggles */}
              <Text style={[styles.label, isDark && styles.textSecondary]}>I want to save:</Text>
              <View style={styles.toggleRow}>
                {(['3months', '6months'] as GoalOption[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.toggleButton,
                      isDark && styles.toggleButtonDark,
                      selectedOption === opt && styles.toggleButtonActive,
                    ]}
                    onPress={() => setSelectedOption(opt)}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        isDark && styles.textMuted,
                        selectedOption === opt && styles.toggleTextActive,
                      ]}
                    >
                      {opt === '3months' ? '3 months' : '6 months'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonWide,
                  isDark && styles.toggleButtonDark,
                  selectedOption === 'custom' && styles.toggleButtonActive,
                ]}
                onPress={() => setSelectedOption('custom')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isDark && styles.textMuted,
                    selectedOption === 'custom' && styles.toggleTextActive,
                  ]}
                >
                  Custom amount
                </Text>
              </TouchableOpacity>

              {selectedOption === 'custom' && (
                <View style={[styles.inputRow, styles.inputRowTop, isDark && styles.inputRowDark]}>
                  <Text style={[styles.inputPrefix, isDark && styles.textLight]}>$</Text>
                  <TextInput
                    style={[styles.input, isDark && styles.inputDark] as any}
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    placeholder="Enter amount"
                    placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                    keyboardType="numeric"
                    returnKeyType="done"
                    autoFocus
                  />
                </View>
              )}

              {/* Progress toward goal */}
              {computedGoal > 0 && (
                <View style={styles.progressSection}>
                  <Text style={[styles.label, isDark && styles.textSecondary]}>
                    You're currently at:
                  </Text>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressAmount}>{fmt(currentBalance)} saved</Text>
                    <Text style={[styles.progressPct, isDark && styles.textMuted]}>
                      {progressPct}%
                    </Text>
                  </View>
                  <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPct}%` as any,
                          backgroundColor: progress >= 1 ? '#16a34a' : '#0d9488',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressGoalText, isDark && styles.textMuted]}>
                    of your {fmt(computedGoal)} goal
                  </Text>
                </View>
              )}

              {/* Pace estimate */}
              {paceText ? (
                <Text style={[styles.paceText, isDark && styles.textMuted]}>{paceText}</Text>
              ) : null}

              {/* Primary CTA */}
              <TouchableOpacity
                style={[styles.ctaButton, computedGoal <= 0 && styles.ctaButtonDisabled]}
                onPress={handleSave}
                disabled={computedGoal <= 0}
              >
                <Text style={styles.ctaText}>Set my goal →</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
    maxWidth: 460,
    alignSelf: 'center',
    maxHeight: '90%' as any,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: {
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      } as any,
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
    marginBottom: 12,
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
    flex: 1,
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
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  inputRowDark: {
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  inputRowTop: {
    marginTop: 8,
  },
  inputPrefix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    paddingVertical: 10,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  inputDark: {
    color: '#f9fafb',
  },
  calcBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    gap: 6,
    marginTop: 8,
  },
  calcBoxDark: {
    backgroundColor: '#111827',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  calcValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  toggleButtonWide: {
    flex: undefined as any,
    alignSelf: 'stretch',
    marginTop: 8,
  },
  toggleButtonDark: {
    borderColor: '#374151',
  },
  toggleButtonActive: {
    borderColor: '#0d9488',
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  toggleTextActive: {
    color: '#0d9488',
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d9488',
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressBarDark: {
    backgroundColor: '#374151',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressGoalText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  paceText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginTop: 10,
    fontStyle: 'italic',
  },
  ctaButton: {
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
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
  textSecondary: {
    color: '#9ca3af',
  },
});
