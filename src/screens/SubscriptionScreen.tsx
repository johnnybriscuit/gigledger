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
import { useResponsive } from '../hooks/useResponsive';

// Get Stripe Price IDs from environment variables
// IMPORTANT: These must be set in Vercel environment variables for production
// Use _PROD suffix for production, fallback to non-suffixed for backward compatibility
const STRIPE_MONTHLY_PRICE_ID = 
  process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD || 
  process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 
  Constants.expoConfig?.extra?.stripeMonthlyPriceId;
const STRIPE_YEARLY_PRICE_ID = 
  process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD || 
  process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID || 
  Constants.expoConfig?.extra?.stripeYearlyPriceId;

const STRIPE_CONFIGURED = !!(STRIPE_MONTHLY_PRICE_ID && STRIPE_YEARLY_PRICE_ID);
if (!STRIPE_CONFIGURED) {
  console.warn('[Subscription] Stripe Price IDs not configured. Set EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD and EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD.');
}

const MONTHLY_PRICE = 7.99;
const YEARLY_PRICE = 79.99;
const YEARLY_SAVINGS = (MONTHLY_PRICE * 12 - YEARLY_PRICE).toFixed(2);

export function SubscriptionScreen() {
  const { isMobile } = useResponsive();
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
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

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

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    try {
      console.log('[SubscriptionScreen] Starting checkout session creation...');
      const priceId = plan === 'monthly' ? STRIPE_MONTHLY_PRICE_ID : STRIPE_YEARLY_PRICE_ID;
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
      );
      
      const result = await Promise.race([
        createCheckout.mutateAsync({ priceId, tier: plan }),
        timeoutPromise
      ]) as { url: string };
      
      console.log('[SubscriptionScreen] Checkout session created, opening URL:', result.url);
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (error: any) {
      console.error('[SubscriptionScreen] Checkout error:', error);
      Alert.alert('Error', error.message || 'Failed to start checkout');
    }
  };

  const handleManageSubscription = async () => {
    try {
      console.log('[SubscriptionScreen] Starting portal session creation...');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
      );
      
      const result = await Promise.race([
        createPortal.mutateAsync(),
        timeoutPromise
      ]) as { url: string };
      
      console.log('[SubscriptionScreen] Portal session created, opening URL:', result.url);
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (error: any) {
      console.error('[SubscriptionScreen] Portal error:', error);
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

  // Graceful fallback when Stripe is not configured (dev builds, native preview)
  if (!STRIPE_CONFIGURED) {
    return (
      <ScrollView style={styles.container}>
        <Card variant="muted" style={{ margin: parseInt(spacing[4]), padding: parseInt(spacing[5]) }}>
          <Text semibold style={{ marginBottom: 8 }}>
            {__DEV__ ? '⚙️ Subscriptions not configured in this build.' : 'Subscriptions unavailable.'}
          </Text>
          <Text muted>
            {__DEV__
              ? 'Set EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD and EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD to enable.'
              : 'Please contact support@bozzygigs.com for assistance.'}
          </Text>
        </Card>
      </ScrollView>
    );
  }

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isPaidPlan = subscription?.tier === 'monthly' || subscription?.tier === 'yearly';

  // Mobile-first design
  if (isMobile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {hasActiveSubscription && isPaidPlan ? (
          /* STATE 2: PRO SUBSCRIBER */
          <>
            {/* Current Plan Card */}
            <View style={styles.currentPlanCard}>
              <Text style={styles.cardLabel}>CURRENT PLAN</Text>
              <Text style={styles.currentPlanName}>
                ⭐ Bozzy Pro — {subscription.tier === 'monthly' ? 'Monthly' : 'Yearly'}
              </Text>
              <View style={styles.currentPlanPriceRow}>
                <Text style={styles.currentPlanPrice}>
                  ${subscription.tier === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE}
                </Text>
                <Text style={styles.currentPlanPer}>
                  /{subscription.tier === 'monthly' ? 'month' : 'year'}
                </Text>
              </View>
              {subscription.current_period_end && (
                <Text style={styles.renewDate}>
                  {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>

            {/* Upgrade to Yearly (only for monthly subscribers) */}
            {subscription.tier === 'monthly' && !subscription.cancel_at_period_end && (
              <>
                <Text style={styles.sectionHeader}>Upgrade & Save</Text>
                <View style={styles.proCard}>
                  <View style={styles.proHeader}>
                    <View style={styles.proTitleContainer}>
                      <Text style={styles.proTitle}>Yearly Plan</Text>
                      <Text style={styles.proSubtitle}>Best value</Text>
                    </View>
                    <View style={styles.proPriceBlock}>
                      <Text style={styles.proPrice}>${YEARLY_PRICE}</Text>
                      <Text style={styles.proPer}>per year</Text>
                    </View>
                  </View>
                  <View style={styles.savingsBanner}>
                    <Text style={styles.savingsText}>💰 Save ${YEARLY_SAVINGS} — 2 months free</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => handleSubscribe('yearly')}
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ctaButtonText}>Switch to Yearly Plan</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.divider} />

            {/* Manage Subscription Button */}
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
              disabled={createPortal.isPending}
            >
              {createPortal.isPending ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.manageButtonText}>Manage Subscription</Text>
              )}
            </TouchableOpacity>

            {/* Sync Button */}
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSyncSubscription}
              disabled={syncSubscription.isPending}
            >
              {syncSubscription.isPending ? (
                <ActivityIndicator color="#8e8e93" />
              ) : (
                <Text style={styles.syncButtonText}>⚙️ Sync Subscription Status</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Update payment method, cancel subscription, or view invoices via the Manage button above.
            </Text>
          </>
        ) : (
          /* STATE 1: FREE USER */
          <>
            {/* Billing Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleOption, selectedPlan === 'monthly' && styles.toggleOptionActive]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={selectedPlan === 'monthly' ? styles.toggleTextActive : styles.toggleText}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, selectedPlan === 'yearly' && styles.toggleOptionActive]}
                onPress={() => setSelectedPlan('yearly')}
              >
                <Text style={selectedPlan === 'yearly' ? styles.toggleTextActive : styles.toggleText}>
                  Yearly
                </Text>
                {selectedPlan === 'yearly' && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>2 months free</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Pro Card */}
            <View style={styles.proCard}>
              <View style={styles.proHeader}>
                <View style={styles.proTitleContainer}>
                  <Text style={styles.proTitle}>⭐ Bozzy Pro</Text>
                  <Text style={styles.proSubtitle}>Everything you need</Text>
                </View>
                <View style={styles.proPriceBlock}>
                  <Text style={styles.proPrice}>
                    ${selectedPlan === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE}
                  </Text>
                  <Text style={styles.proPer}>
                    per {selectedPlan === 'monthly' ? 'month' : 'year'}
                  </Text>
                </View>
              </View>

              {selectedPlan === 'yearly' && (
                <View style={styles.savingsBanner}>
                  <Text style={styles.savingsText}>🎉 Save ${YEARLY_SAVINGS} vs monthly billing</Text>
                </View>
              )}

              <View style={styles.featuresList}>
                {[
                  'Unlimited gigs & expenses',
                  'Mileage tracking',
                  'Invoice generation',
                  'Tax estimates & breakdowns',
                  'CSV & PDF exports',
                  'Contact management',
                ].map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <View style={styles.featureCheck}>
                      <Text style={styles.featureCheckmark}>✓</Text>
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.ctaButtonGreen}
                onPress={() => handleSubscribe(selectedPlan)}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaButtonText}>
                    Upgrade to {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} — $
                    {selectedPlan === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE}
                    {selectedPlan === 'monthly' ? '/mo' : '/yr'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.footerNote}>
              Payment processed securely via Stripe. Cancel anytime from your account settings.
            </Text>
          </>
        )}
      </ScrollView>
    );
  }

  // Web/Desktop fallback - keep existing design
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
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
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  
  // Mobile: Current Plan Card (white card)
  currentPlanCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  currentPlanName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  currentPlanPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: 2,
    gap: 4,
  },
  currentPlanPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: '#007AFF',
  },
  currentPlanPer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8e8e93',
  },
  renewDate: {
    fontSize: 13,
    color: '#8e8e93',
  },
  
  // Mobile: Section Header
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1c1e',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  
  // Mobile: Toggle
  toggleContainer: {
    marginHorizontal: 10,
    marginBottom: 14,
    backgroundColor: '#e5e5ea',
    borderRadius: 12,
    padding: 3,
    flexDirection: 'row',
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    position: 'relative',
  },
  toggleOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8e8e93',
  },
  toggleTextActive: {
    color: '#1c1c1e',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#34c759',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Mobile: Pro Card (dark card)
  proCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 14,
  },
  proHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  proTitleContainer: {
    flex: 1,
  },
  proTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  proSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  proPriceBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
    width: 120,
  },
  proPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  proPer: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  savingsBanner: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34c759',
  },
  
  // Mobile: Features List
  featuresList: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  featureCheck: {
    width: 20,
    height: 20,
    backgroundColor: '#34c759',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckmark: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  featureText: {
    fontSize: 14,
    color: '#e5e5ea',
  },
  
  // Mobile: CTA Buttons
  ctaButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonGreen: {
    width: '100%',
    backgroundColor: '#34c759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  
  // Mobile: Manage/Sync Buttons
  manageButton: {
    marginHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  syncButton: {
    marginHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#8e8e93',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Mobile: Divider
  divider: {
    height: 1,
    backgroundColor: '#e5e5ea',
    marginHorizontal: 10,
    marginBottom: 14,
  },
  
  // Mobile: Footer Note
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8e8e93',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  
  // Web/Desktop styles (unchanged)
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
  featureIcon: {
    fontSize: 13,
    color: colors.success.DEFAULT,
    fontWeight: typography.fontWeight.bold,
  },
  ctaDisclaimer: {
    textAlign: 'center',
  },
});
