import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Linking, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';

// ── Types ──────────────────────────────────────────────────────────────────

type TagType = 'TAX' | 'DEDUCTION';
type CtaAction = 'add_expense' | 'expenses' | 'exports' | 'url';

interface Opportunity {
  id: string;
  tag: TagType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  ctaLabel: string;
  ctaAction: CtaAction;
  ctaUrl?: string;
}

// ── Card data ──────────────────────────────────────────────────────────────

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'hits_act',
    tag: 'TAX',
    icon: 'musical-notes-outline',
    title: 'HITS Act — Recording Cost Deductions',
    body: "Under the Helping Independent Tracks Succeed Act, musicians can deduct 100% of recording costs in the year they occur — instead of spreading them over 15 years.\n\nStudio time, production, mixing, and mastering all qualify. This provision was designed specifically for independent artists like you.",
    ctaLabel: 'Add a recording expense →',
    ctaAction: 'add_expense',
  },
  {
    id: 'home_office',
    tag: 'DEDUCTION',
    icon: 'home-outline',
    title: 'Home Studio / Office Deduction',
    body: "If you use part of your home exclusively for music production, teaching, or administrative work, you can deduct that portion of your rent or mortgage.\n\nThis is one of the most underused deductions for self-employed musicians. Even a dedicated corner of a room can qualify if used exclusively for work.",
    ctaLabel: 'Add a home office expense →',
    ctaAction: 'add_expense',
  },
  {
    id: 'health_insurance',
    tag: 'DEDUCTION',
    icon: 'medkit-outline',
    title: 'Health Insurance — 100% Deductible',
    body: "As a self-employed musician, you can deduct 100% of health insurance premiums you pay for yourself and your family.\n\nThis includes dental and vision insurance. Make sure these premiums are logged as expenses in Bozzy so they're captured in your tax export.",
    ctaLabel: 'Add health insurance expense →',
    ctaAction: 'add_expense',
  },
  {
    id: 'se_tax',
    tag: 'TAX',
    icon: 'briefcase-outline',
    title: 'Deduct Half Your SE Tax',
    body: "Self-employed workers pay 15.3% in self-employment tax. The good news: you can deduct half of that amount from your taxable income.\n\nBozzy calculates this automatically in your tax export. No extra steps needed — just make sure all your gigs are logged.",
    ctaLabel: 'View your tax summary →',
    ctaAction: 'exports',
  },
  {
    id: 'qbi',
    tag: 'TAX',
    icon: 'bar-chart-outline',
    title: '20% Income Deduction (QBI)',
    body: "Under Section 199A, many self-employed musicians qualify to deduct up to 20% of their qualified business income.\n\nAt your current income level this could mean a significant reduction in your tax bill. Ask your accountant if you qualify — most freelancers do.",
    ctaLabel: 'Learn more →',
    ctaAction: 'url',
    ctaUrl: 'https://www.irs.gov/newsroom/qualified-business-income-deduction',
  },
  {
    id: 'sep_ira',
    tag: 'DEDUCTION',
    icon: 'trending-up-outline',
    title: 'SEP-IRA — Reduce Taxes While Saving',
    body: "A Self-Employed Retirement Account (SEP-IRA) lets you contribute up to $69,000 per year (2026) and deduct every dollar from your taxable income.\n\nYou can contribute up until your tax filing deadline including extensions — so there's still time to reduce this year's tax bill even after December 31.",
    ctaLabel: 'Learn about SEP-IRA →',
    ctaAction: 'url',
    ctaUrl: 'https://www.irs.gov/retirement-plans/sep-plan-faqs',
  },
];

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'bozzy_opportunity_dismissed_';
const DESKTOP_INITIAL = 4;
const MOBILE_INITIAL = 2;

// ── Helpers ────────────────────────────────────────────────────────────────

function getStoredDismissed(): Set<string> {
  if (Platform.OS !== 'web') return new Set();
  try {
    return new Set(
      OPPORTUNITIES
        .filter(o => localStorage.getItem(STORAGE_PREFIX + o.id) === 'true')
        .map(o => o.id),
    );
  } catch {
    return new Set();
  }
}

// ── Main component ─────────────────────────────────────────────────────────

interface OpportunitiesSectionProps {
  onNavigateToExpenses?: () => void;
  onAddExpense?: () => void;
  onNavigateToExports?: () => void;
}

export function OpportunitiesSection({
  onNavigateToExpenses,
  onAddExpense,
  onNavigateToExports,
}: OpportunitiesSectionProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { width } = useWindowDimensions();
  const isPhone = width < 768;

  const [dismissed, setDismissed] = useState<Set<string>>(getStoredDismissed);
  const [showAll, setShowAll] = useState(false);

  const visible = useMemo(
    () => OPPORTUNITIES.filter(o => !dismissed.has(o.id)),
    [dismissed],
  );

  const initialCount = isPhone ? MOBILE_INITIAL : DESKTOP_INITIAL;
  const displayed = showAll ? visible : visible.slice(0, initialCount);
  const hasMore = !showAll && visible.length > initialCount;

  if (visible.length === 0) return null;

  const handleDismiss = (id: string) => {
    try {
      if (Platform.OS === 'web') localStorage.setItem(STORAGE_PREFIX + id, 'true');
    } catch { /* ignore storage errors */ }
    setDismissed(prev => new Set([...prev, id]));
  };

  const handleCta = (o: Opportunity) => {
    switch (o.ctaAction) {
      case 'add_expense':
        onAddExpense ? onAddExpense() : onNavigateToExpenses?.();
        break;
      case 'expenses':
        onNavigateToExpenses?.();
        break;
      case 'exports':
        onNavigateToExports?.();
        break;
      case 'url':
        if (o.ctaUrl) Linking.openURL(o.ctaUrl);
        break;
    }
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.surface.DEFAULT, borderColor: colors.border.DEFAULT }]}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="bulb-outline" size={18} color={colors.text.DEFAULT} />
        <Text style={[styles.sectionTitle, { color: colors.text.DEFAULT }]}>
          Tax Opportunities for Musicians
        </Text>
      </View>
      <Text style={[styles.sectionSub, { color: colors.text.subtle }]}>
        Provisions and deductions that apply to your work
      </Text>

      <View style={[styles.grid, !isPhone && styles.gridWide]}>
        {displayed.map(o => (
          <OpportunityCard
            key={o.id}
            opportunity={o}
            colors={colors}
            isPhone={isPhone}
            onDismiss={() => handleDismiss(o.id)}
            onCta={() => handleCta(o)}
          />
        ))}
      </View>

      {hasMore && (
        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(true)}>
          <Text style={[styles.showMoreText, { color: colors.brand.DEFAULT }]}>
            {isPhone ? 'Show more →' : 'Show more opportunities →'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Card sub-component ─────────────────────────────────────────────────────

type ThemeColors = ReturnType<typeof getThemePalette>;

interface CardProps {
  opportunity: Opportunity;
  colors: ThemeColors;
  isPhone: boolean;
  onDismiss: () => void;
  onCta: () => void;
}

function OpportunityCard({ opportunity, colors, isPhone, onDismiss, onCta }: CardProps) {
  const isTax = opportunity.tag === 'TAX';

  return (
    <View
      style={[
        styles.card,
        !isPhone && styles.cardWide,
        { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT },
      ]}
    >
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss"
      >
        <Text style={[styles.dismissIcon, { color: colors.text.subtle }]}>×</Text>
      </TouchableOpacity>

      <View style={styles.tagRow}>
        <View style={[styles.tag, isTax ? styles.tagTax : styles.tagDeduction]}>
          <Text style={[styles.tagText, isTax ? styles.tagTextTax : styles.tagTextDeduction]}>
            {opportunity.tag}
          </Text>
        </View>
        <Ionicons name={opportunity.icon} size={20} color={colors.text.subtle} style={styles.cardEmoji} />
      </View>

      <Text style={[styles.cardTitle, { color: colors.text.DEFAULT }]}>
        {opportunity.title}
      </Text>

      <Text style={[styles.cardBody, { color: colors.text.muted }]}>
        {opportunity.body}
      </Text>

      <TouchableOpacity style={styles.ctaBtn} onPress={onCta} activeOpacity={0.7}>
        <Text style={[styles.ctaText, { color: colors.brand.DEFAULT }]}>
          {opportunity.ctaLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
  },
  cardWide: {
    flex: 1,
    minWidth: '45%',
  },
  dismissBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 1,
  },
  dismissIcon: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginRight: 28,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagTax: {
    backgroundColor: '#FEF3C7',
  },
  tagDeduction: {
    backgroundColor: '#DBEAFE',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tagTextTax: {
    color: '#D97706',
  },
  tagTextDeduction: {
    color: '#2563EB',
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 12,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  showMoreBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
