/**
 * Subscription Management Screen
 * Allows users to subscribe, upgrade, or manage their subscription
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import {
  useSubscription,
  useCreateCheckoutSession,
  useCreatePortalSession,
} from '../hooks/useSubscription';
import { useSyncSubscription } from '../hooks/useSyncSubscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { H1, H2, H3, Text, Button, Card, Badge } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';

// Get Stripe Price IDs from environment variables
// IMPORTANT: These must be set in Vercel environment variables for production
const STRIPE_MONTHLY_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || Constants.expoConfig?.extra?.stripeMonthlyPriceId;
const STRIPE_YEARLY_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID || Constants.expoConfig?.extra?.stripeYearlyPriceId;

if (!STRIPE_MONTHLY_PRICE_ID || !STRIPE_YEARLY_PRICE_ID) {
  console.error('❌ Stripe Price IDs not configured. Set EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID and EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID environment variables.');
}

const MONTHLY_PRICE = 7.99;
const YEARLY_PRICE = 79.99;

export function SubscriptionScreen() {
  const { data: subscription, isLoading, refetch } = useSubscription();
  const createCheckout = useCreateCheckoutSession();
  const createPortal = useCreatePortalSession();
  const syncSubscription = useSyncSubscription();
  const queryClient = useQueryClient();

  // Fetch user's plan
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const currentPlan = profile?.plan || 'free';
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(
    currentPlan === 'pro_yearly' ? 'yearly' : 'monthly'
  );

  // Refresh subscription data when screen is focused (e.g., returning from Stripe checkout)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleFocus = () => {
        console.log('[SubscriptionScreen] Window focused - refreshing subscription data');
        refetch();
        // Also invalidate entitlements to ensure fresh plan data
        queryClient.invalidateQueries({ queryKey: ['entitlements'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      };
      
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [refetch, queryClient]);

  const handleSubscribe = async (tier: 'monthly' | 'yearly') => {
    try {
      const priceId = tier === 'monthly' ? STRIPE_MONTHLY_PRICE_ID : STRIPE_YEARLY_PRICE_ID;
      const result = await createCheckout.mutateAsync({ priceId, tier });
      
      if (result.url) {
        // Open Stripe Checkout in browser
        await Linking.openURL(result.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start checkout');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await createPortal.mutateAsync();
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open subscription management');
    }
  };

  const handleSyncSubscription = async () => {
    try {
      const result = await syncSubscription.mutateAsync();
      Alert.alert(
        'Success',
        result.message || `Subscription synced! Plan: ${result.plan}`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sync subscription');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isPaidPlan = subscription?.tier === 'monthly' || subscription?.tier === 'yearly';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <H1>Subscription</H1>
        {hasActiveSubscription && isPaidPlan && (
          <Badge variant="neutral" size="sm">
            {subscription.tier === 'monthly' ? 'Monthly' : 'Yearly'} Plan
          </Badge>
        )}
      </View>

      {hasActiveSubscription && isPaidPlan ? (
        <View style={styles.currentPlanContainer}>
          <H2>Current Plan</H2>
          <Card variant="elevated" style={styles.planCard}>
            <H3>
              {subscription.tier === 'monthly' ? 'Monthly' : 'Yearly'} Subscription
            </H3>
            <Text style={styles.planPrice}>
              ${subscription.tier === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE}
              {subscription.tier === 'monthly' ? '/month' : '/year'}
            </Text>
            {subscription.current_period_end && (
              <Text muted>
                {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </Text>
            )}
          </Card>

          {/* Show upgrade option for monthly subscribers */}
          {subscription.tier === 'monthly' && !subscription.cancel_at_period_end && (
            <Card variant="elevated" style={styles.upgradeContainer}>
              <Badge variant="success" size="sm" style={styles.upgradeBadge}>
                💰 Best value — 2 months free
              </Badge>
              <H3>Upgrade to Yearly</H3>
              <Text muted style={styles.upgradeDescription}>
                Pay ${YEARLY_PRICE}/year instead of ${(MONTHLY_PRICE * 12)}/year
              </Text>
              <Button
                variant="success"
                onPress={() => handleSubscribe('yearly')}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  'Upgrade to Yearly Plan'
                )}
              </Button>
            </Card>
          )}

          <Button
            variant="primary"
            onPress={handleManageSubscription}
            disabled={createPortal.isPending}
            style={styles.manageButton}
          >
            {createPortal.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              'Manage Subscription'
            )}
          </Button>

          <Button
            variant="secondary"
            onPress={handleSyncSubscription}
            disabled={syncSubscription.isPending}
            style={styles.syncButton}
          >
            {syncSubscription.isPending ? (
              <ActivityIndicator color={colors.brand.DEFAULT} />
            ) : (
              '🔄 Sync Subscription Status'
            )}
          </Button>

          <Text subtle style={{ textAlign: 'center' }}>
            Update payment method, cancel subscription, or view invoices
          </Text>
        </View>
      ) : (
        <View style={styles.plansContainer}>
          {/* Active Plan Banner */}
          {currentPlan !== 'free' && (
            <Card variant="elevated" style={styles.activePlanBanner}>
              <Text semibold style={{ color: colors.success.DEFAULT, textAlign: 'center' }}>
                ✓ You're on the {currentPlan === 'pro_monthly' ? 'Monthly' : 'Yearly'} Pro plan
              </Text>
            </Card>
          )}

          <H2>Choose Your Plan</H2>
          <Text muted style={styles.subtitle}>
            Upgrade to Pro for unlimited tracking and exports
          </Text>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'monthly' && styles.planOptionSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <H3>Monthly</H3>
              <Text style={styles.planOptionPrice}>${MONTHLY_PRICE}/mo</Text>
            </View>
            <Text muted>Billed monthly • Cancel anytime</Text>
            
            {/* CTA inside selected card */}
            {selectedPlan === 'monthly' && (
              <View style={styles.ctaContainer}>
                <Button
                  variant="primary"
                  onPress={() => handleSubscribe('monthly')}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    `Subscribe to Monthly – $${MONTHLY_PRICE}/mo`
                  )}
                </Button>
                <Text subtle style={styles.ctaDisclaimer}>
                  Secure payment powered by Stripe. Cancel anytime.
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'yearly' && styles.planOptionSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.7}
          >
            <Badge variant="success" size="sm" style={styles.planBadge}>
              Best value — 2 months free
            </Badge>
            <View style={styles.planHeader}>
              <H3>Yearly</H3>
              <Text style={styles.planOptionPrice}>${YEARLY_PRICE}/yr</Text>
            </View>
            <Text muted>
              ${(YEARLY_PRICE / 12).toFixed(2)}/mo • Billed annually
            </Text>
            
            {/* CTA inside selected card */}
            {selectedPlan === 'yearly' && (
              <View style={styles.ctaContainer}>
                <Button
                  variant="primary"
                  onPress={() => handleSubscribe('yearly')}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    `Subscribe to Yearly – $${YEARLY_PRICE}/yr`
                  )}
                </Button>
                <Text subtle style={styles.ctaDisclaimer}>
                  Secure payment powered by Stripe. Cancel anytime.
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Features List - More compact */}
          <View style={styles.featuresContainer}>
            <Text semibold>Premium Features</Text>
            <View style={styles.featuresGrid}>
              {[
                'Unlimited gigs & expenses',
                'Export to CPA/TurboTax',
                'Invoice generation',
                'Advanced tax readiness',
                'Priority support',
                'Cancel anytime',
              ].map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>✓</Text>
                  <Text subtle>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: parseInt(spacing[5]),
    paddingBottom: parseInt(spacing[3]),
  },
  currentPlanContainer: {
    padding: parseInt(spacing[5]),
  },
  plansContainer: {
    padding: parseInt(spacing[5]),
    paddingTop: 0,
  },
  activePlanBanner: {
    marginBottom: parseInt(spacing[4]),
  },
  subtitle: {
    marginBottom: parseInt(spacing[3]),
  },
  planCard: {
    marginBottom: parseInt(spacing[4]),
    gap: parseInt(spacing[2]),
  },
  planPrice: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.DEFAULT,
  },
  upgradeContainer: {
    marginTop: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[4]),
    gap: parseInt(spacing[3]),
  },
  upgradeBadge: {
    alignSelf: 'flex-start',
    marginBottom: parseInt(spacing[2]),
  },
  upgradeDescription: {
    marginBottom: parseInt(spacing[3]),
  },
  planOption: {
    backgroundColor: colors.surface.muted,
    borderRadius: parseInt(radius.md),
    padding: parseInt(spacing[4]),
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    marginBottom: parseInt(spacing[2]),
    position: 'relative',
  },
  planOptionSelected: {
    borderColor: colors.brand.DEFAULT,
    backgroundColor: colors.brand.muted,
    paddingBottom: parseInt(spacing[4]),
  },
  ctaContainer: {
    marginTop: parseInt(spacing[3]),
    paddingTop: parseInt(spacing[3]),
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    gap: parseInt(spacing[2]),
  },
  planBadge: {
    position: 'absolute',
    top: -8,
    right: parseInt(spacing[3]),
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[1]),
  },
  planOptionPrice: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.DEFAULT,
  },
  featuresContainer: {
    marginTop: parseInt(spacing[3]),
    marginBottom: parseInt(spacing[4]),
    gap: parseInt(spacing[2]),
  },
  featuresGrid: {
    gap: parseInt(spacing[1]),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  featureIcon: {
    fontSize: 13,
    color: colors.success.DEFAULT,
    fontWeight: typography.fontWeight.bold,
  },
  ctaDisclaimer: {
    textAlign: 'center',
  },
  manageButton: {
    marginBottom: parseInt(spacing[2]),
  },
  syncButton: {
    marginBottom: parseInt(spacing[2]),
  },
});
