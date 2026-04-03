import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Animated,
  TextInput,
  Pressable,
} from 'react-native';
import type { DateRange } from '../hooks/useDateRange';
import { colors } from '../styles/theme';

interface DateRangeFilterProps {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
  customStart?: Date;
  customEnd?: Date;
  onCustomRangeChange?: (start: Date, end: Date) => void;
}

const now = new Date();
const THIS_YEAR = now.getFullYear();
const LAST_YEAR = THIS_YEAR - 1;

const FILTER_OPTIONS: { value: DateRange; label: string; pillLabel: string }[] = [
  { value: 'ytd',      label: 'YTD',           pillLabel: 'YTD' },
  { value: 'thisYear', label: 'This Year',      pillLabel: String(THIS_YEAR) },
  { value: 'last30',   label: 'Last 30 Days',   pillLabel: '30 Days' },
  { value: 'last90',   label: 'Last 90 Days',   pillLabel: '90 Days' },
  { value: 'lastYear', label: 'Last Year',      pillLabel: String(LAST_YEAR) },
  { value: 'custom',   label: 'Custom Range',   pillLabel: 'Custom' },
];

const T = {
  surface: colors.surface.elevated,
  surfacePanel: colors.surface.DEFAULT,
  surfaceMuted: colors.surface.muted,
  border: colors.border.DEFAULT,
  borderMuted: colors.border.muted,
  textPrimary: colors.text.DEFAULT,
  textMuted: colors.text.subtle,
  textSecondary: colors.text.muted,
  textOnBrand: colors.brand.foreground,
  accent: colors.brand.DEFAULT,
  accentLight: colors.brand.muted,
  overlay: colors.overlay.DEFAULT,
};

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DateRangeFilter({ selected, onSelect, customStart, customEnd, onCustomRangeChange }: DateRangeFilterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartStr, setCustomStartStr] = useState('');
  const [customEndStr, setCustomEndStr] = useState('');
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const triggerRef = useRef<any>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 16 });

  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: dropdownOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [dropdownOpen]);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getPillLabel = (): string => {
    if (selected === 'custom' && customStart && customEnd) {
      return `${formatShortDate(customStart)} – ${formatShortDate(customEnd)}`;
    }
    return FILTER_OPTIONS.find(o => o.value === selected)?.pillLabel || 'YTD';
  };

  const openDropdown = () => {
    if (Platform.OS !== 'web' || !triggerRef.current) {
      setDropdownOpen(true);
      return;
    }
    const node = triggerRef.current;
    if (node?.getBoundingClientRect) {
      const rect = node.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        right: 16,
      });
    }
    setDropdownOpen(true);
  };

  const handleSelect = (value: DateRange) => {
    if (value === 'custom') {
      setDropdownOpen(false);
      if (customStart) setCustomStartStr(customStart.toISOString().split('T')[0]);
      if (customEnd) setCustomEndStr(customEnd.toISOString().split('T')[0]);
      setShowCustomPicker(true);
    } else {
      onSelect(value);
      setDropdownOpen(false);
    }
  };

  const handleApplyCustom = () => {
    if (!customStartStr || !customEndStr) return;
    const start = new Date(customStartStr + 'T00:00:00');
    const end = new Date(customEndStr + 'T23:59:59');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;
    if (onCustomRangeChange) onCustomRangeChange(start, end);
    setShowCustomPicker(false);
  };

  const pill = (
    <TouchableOpacity
      ref={triggerRef}
      style={styles.pill}
      onPress={openDropdown}
      activeOpacity={0.75}
    >
      <Text style={styles.pillIcon}>📅</Text>
      <Text style={styles.pillText}>{getPillLabel()}</Text>
      <Animated.Text style={[styles.pillArrow, { transform: [{ rotate: chevronRotate }] }]}>
        ▼
      </Animated.Text>
    </TouchableOpacity>
  );

  const optionRows = FILTER_OPTIONS.map((option, idx) => {
    const isActive = selected === option.value;
    const isLast = idx === FILTER_OPTIONS.length - 1;
    return (
      <TouchableOpacity
        key={option.value}
        style={[styles.optionRow, !isLast && styles.optionRowBorder, isActive && styles.optionRowActive]}
        onPress={() => handleSelect(option.value)}
        activeOpacity={0.7}
      >
        <View style={styles.optionLeft}>
          <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
            {option.label}
          </Text>
          {option.value === 'custom' && isActive && customStart && customEnd && (
            <Text style={styles.optionSubLabel}>
              {formatShortDate(customStart)} – {formatShortDate(customEnd)}
            </Text>
          )}
        </View>
        {isActive && (
          <View style={styles.checkCircle}>
            <Text style={styles.checkCircleText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  // Native: anchored via Modal positioned below pill using onLayout measurement
  if (Platform.OS !== 'web') {
    return (
      <>
        {pill}
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="none"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setDropdownOpen(false)}>
            <View style={[styles.dropdown, styles.dropdownNative]} onStartShouldSetResponder={() => true}>
              {optionRows}
            </View>
          </Pressable>
        </Modal>

        {/* Native custom date picker */}
        <Modal
          visible={showCustomPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCustomPicker(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowCustomPicker(false)}>
            <View style={styles.customPickerSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.customPickerHandle} />
              <Text style={styles.customPickerTitle}>Custom Range</Text>
              <Text style={styles.customPickerLabel}>Start Date</Text>
              <TextInput
                style={styles.customPickerInput}
                value={customStartStr}
                onChangeText={setCustomStartStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={T.textMuted}
              />
              <Text style={styles.customPickerLabel}>End Date</Text>
              <TextInput
                style={styles.customPickerInput}
                value={customEndStr}
                onChangeText={setCustomEndStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={T.textMuted}
              />
              <TouchableOpacity style={styles.customPickerApply} onPress={handleApplyCustom}>
                <Text style={styles.customPickerApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </>
    );
  }

  // Web: absolutely positioned dropdown anchored below pill
  return (
    <>
      {pill}
      {dropdownOpen && (
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="none"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setDropdownOpen(false)}>
            <View
              style={[styles.dropdown, { position: 'absolute', top: dropdownPos.top, right: dropdownPos.right } as any]}
              onStartShouldSetResponder={() => true}
            >
              {optionRows}
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Web custom date picker */}
      {showCustomPicker && (
        <Modal
          visible={showCustomPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCustomPicker(false)}
        >
          <Pressable style={styles.customPickerBackdrop} onPress={() => setShowCustomPicker(false)}>
            <View style={styles.customPickerCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.customPickerTitle}>Custom Range</Text>
              <Text style={styles.customPickerLabel}>Start Date</Text>
              {/* @ts-ignore web-only */}
              <input
                type="date"
                value={customStartStr}
                onChange={(e: any) => setCustomStartStr(e.target.value)}
                style={{
                  padding: 10,
                  fontSize: 14,
                  borderRadius: 8,
                  border: `1.5px solid ${colors.border.DEFAULT}`,
                  background: colors.surface.muted,
                  color: colors.text.DEFAULT,
                  width: '100%',
                  marginBottom: 12,
                  fontFamily: 'inherit',
                } as any}
              />
              <Text style={styles.customPickerLabel}>End Date</Text>
              {/* @ts-ignore web-only */}
              <input
                type="date"
                value={customEndStr}
                onChange={(e: any) => setCustomEndStr(e.target.value)}
                style={{
                  padding: 10,
                  fontSize: 14,
                  borderRadius: 8,
                  border: `1.5px solid ${colors.border.DEFAULT}`,
                  background: colors.surface.muted,
                  color: colors.text.DEFAULT,
                  width: '100%',
                  marginBottom: 20,
                  fontFamily: 'inherit',
                } as any}
              />
              <TouchableOpacity style={styles.customPickerApply} onPress={handleApplyCustom}>
                <Text style={styles.customPickerApplyText}>Apply Range</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Pill trigger
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  pillIcon: { fontSize: 13 },
  pillText: { fontSize: 13, fontWeight: '600', color: T.textPrimary },
  pillArrow: { fontSize: 9, color: T.textMuted },

  // Backdrop (full-screen tap-to-dismiss)
  backdrop: { flex: 1 },

  // Dropdown card
  dropdown: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    minWidth: 200,
    shadowColor: colors.overlay.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  dropdownNative: {
    position: 'absolute',
    top: 60,
    right: 16,
  },

  // Option rows
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  optionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: T.borderMuted,
  },
  optionRowActive: {
    backgroundColor: T.accentLight,
  },
  optionLeft: { flex: 1 },
  optionLabel: { fontSize: 14, fontWeight: '500', color: T.textPrimary },
  optionLabelActive: { color: T.accent, fontWeight: '700' },
  optionSubLabel: { fontSize: 12, color: T.textMuted, marginTop: 2 },

  // Check circle
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkCircleText: { fontSize: 11, color: T.textOnBrand, fontWeight: '700', lineHeight: 14 },

  // Native custom picker (bottom sheet)
  customPickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surfacePanel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  customPickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Web custom picker (centered card)
  customPickerBackdrop: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customPickerCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: colors.overlay.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },

  // Shared custom picker elements
  customPickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 20,
  },
  customPickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  customPickerInput: {
    backgroundColor: T.surfaceMuted,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: T.textPrimary,
    marginBottom: 16,
  },
  customPickerApply: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  customPickerApplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textOnBrand,
  },
});
