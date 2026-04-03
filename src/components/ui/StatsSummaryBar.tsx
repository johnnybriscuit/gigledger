import React from 'react';
import { View, Text, StyleSheet, Platform, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '../../styles/theme';

export interface StatsSummaryBarItem {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

interface StatsSummaryBarProps {
  items: StatsSummaryBarItem[];
  style?: ViewStyle;
}

const monoFont = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export function StatsSummaryBar({ items, style }: StatsSummaryBarProps) {
  return (
    <View style={[styles.container, style]}>
      {items.map((item, index) => {
        const valueStyle: TextStyle[] = [styles.value];
        if (item.valueColor) {
          valueStyle.push({ color: item.valueColor });
        }

        return (
          <React.Fragment key={item.label}>
            <View style={styles.stat}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={valueStyle}>{item.value}</Text>
            </View>
            {index < items.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05), 0 8px 24px -18px rgba(15, 23, 42, 0.22)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    fontFamily: monoFont,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.DEFAULT,
  },
});
