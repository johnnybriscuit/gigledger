import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, radius, typography } from '../styles/theme';
import { BucketBalancesSection } from '../components/dashboard/BucketBalancesSection';
import { BucketInsights } from '../components/dashboard/BucketInsights';
import { TaxPaymentReminder } from '../components/dashboard/TaxPaymentReminder';
import { useAllocationBuckets } from '../hooks/useAllocationBuckets';
import { supabase } from '../lib/supabase';

interface MyMoneyScreenProps {
  onManageBuckets: () => void;
  onNavigateToRateGuide?: () => void;
}

const getTaxReminderKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  let quarter: string;
  if (month < 3) quarter = 'Q1';
  else if (month < 5) quarter = 'Q2';
  else if (month < 8) quarter = 'Q3';
  else quarter = 'Q4';
  return `tax_reminder_dismissed_${quarter}_${year}`;
};

export function MyMoneyScreen({ onManageBuckets, onNavigateToRateGuide }: MyMoneyScreenProps) {
  const [taxReminderDismissed, setTaxReminderDismissed] = useState(false);
  const { buckets, isLoading } = useAllocationBuckets();

  useEffect(() => {
    const key = getTaxReminderKey();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('financial_tips_dismissed')
        .select('id')
        .eq('user_id', user.id)
        .eq('tip_key', key)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setTaxReminderDismissed(true);
        });
    });
  }, []);

  const handleTaxReminderDismiss = async () => {
    const key = getTaxReminderKey();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('financial_tips_dismissed')
        .upsert({ user_id: user.id, tip_key: key }, { ignoreDuplicates: true });
    }
    setTaxReminderDismissed(true);
  };

  const hasBuckets = buckets.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Money</Text>
        <View style={styles.headerActions}>
          {onNavigateToRateGuide && (
            <TouchableOpacity style={styles.rateGuideButton} onPress={onNavigateToRateGuide}>
              <Text style={styles.rateGuideButtonText}>Rate guide →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.manageButton} onPress={onManageBuckets}>
            <Text style={styles.manageButtonText}>Manage buckets</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!taxReminderDismissed && (
          <TaxPaymentReminder onDismiss={handleTaxReminderDismiss} />
        )}

        {!isLoading && !hasBuckets ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>
              You haven't set up your money plan yet.
            </Text>
            <Text style={styles.emptySubtitle}>
              Set up buckets to automatically split each payment into taxes, savings, and spending.
            </Text>
            <TouchableOpacity style={styles.setupButton} onPress={onManageBuckets}>
              <Text style={styles.setupButtonText}>Set up buckets</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <BucketBalancesSection onManageBuckets={onManageBuckets} />
            <BucketInsights />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: parseInt(spacing[4]),
    paddingVertical: parseInt(spacing[4]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  title: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.DEFAULT,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateGuideButton: {
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: parseInt(spacing[2]),
    borderRadius: parseInt(radius.md),
  },
  rateGuideButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.brand.DEFAULT,
  },
  manageButton: {
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: parseInt(spacing[2]),
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.DEFAULT,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: parseInt(spacing[4]),
    paddingBottom: 48,
  },
  emptyState: {
    paddingVertical: 56,
    alignItems: 'center',
    paddingHorizontal: parseInt(spacing[6]),
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  setupButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: parseInt(spacing[3]),
    paddingHorizontal: parseInt(spacing[6]),
    borderRadius: parseInt(radius.md),
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
