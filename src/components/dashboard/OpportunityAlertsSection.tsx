import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useOpportunityTips, type OpportunityTip } from '../../hooks/useOpportunityTips';
import { colors, spacing, radius, typography } from '../../styles/theme';

interface OpportunityAlertsSectionProps {
  onAddExpense?: () => void;
  onNavigateToRateGuide?: () => void;
}

const CATEGORY_STYLES: Record<
  OpportunityTip['category'],
  { label: string; bg: string; text: string }
> = {
  tax: { label: 'Tax', bg: '#fffbeb', text: '#d97706' },
  retirement: { label: 'Retirement', bg: '#eff6ff', text: '#2563eb' },
  deduction: { label: 'Deduction', bg: '#f0fdf4', text: '#16a34a' },
  compliance: { label: 'Compliance', bg: '#f9fafb', text: '#6b7280' },
};

function TipCard({
  tip,
  onAddExpense,
  onDismiss,
}: {
  tip: OpportunityTip;
  onAddExpense?: () => void;
  onDismiss: () => void;
}) {
  const cat = CATEGORY_STYLES[tip.category];

  const handleCta = () => {
    if (tip.ctaAction === 'external_link' && tip.ctaUrl) {
      Linking.openURL(tip.ctaUrl);
    } else if (tip.ctaAction === 'add_expense') {
      onAddExpense?.();
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>

      <View style={[styles.badge, { backgroundColor: cat.bg }]}>
        <Text style={[styles.badgeText, { color: cat.text }]}>{cat.label}</Text>
      </View>

      <Text style={styles.tipTitle}>{tip.title}</Text>
      <Text style={styles.tipBody}>{tip.body}</Text>

      <TouchableOpacity style={styles.ctaButton} onPress={handleCta}>
        <Text style={styles.ctaButtonText}>{tip.ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function OpportunityAlertsSection({
  onAddExpense,
}: OpportunityAlertsSectionProps) {
  const { activeTips, dismissTip, isLoading } = useOpportunityTips();

  if (isLoading || activeTips.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Opportunities</Text>
      {activeTips.map(tip => (
        <TipCard
          key={tip.key}
          tip={tip}
          onAddExpense={onAddExpense}
          onDismiss={() => dismissTip(tip.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: parseInt(spacing[4]),
    gap: 12,
  },
  sectionTitle: {
    fontSize: parseInt(typography.fontSize.h3?.size ?? '16'),
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.DEFAULT,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.md),
    padding: 14,
    gap: 8,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  dismissText: {
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    paddingRight: 20,
    lineHeight: 20,
  },
  tipBody: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 18,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: parseInt(radius.sm),
    marginTop: 2,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
