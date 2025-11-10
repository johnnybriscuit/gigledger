/**
 * Subscription Management Screen
 * Allows users to subscribe, upgrade, or manage their subscription
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Constants from 'expo-constants';
import {
  useSubscription,
  useCreateCheckoutSession,
  useCreatePortalSession,
} from '../hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Get Stripe Price IDs from app.json
const STRIPE_MONTHLY_PRICE_ID = Constants.expoConfig?.extra?.stripeMonthlyPriceId || 'price_1SREuh1zc5DHhlVtxhHYiIwG';
const STRIPE_YEARLY_PRICE_ID = Constants.expoConfig?.extra?.stripeYearlyPriceId || 'price_1SQZzb1zc5DHhlVtIejNSBvx';

const MONTHLY_PRICE = 4.99;
const YEARLY_PRICE = 49.99;

export function SubscriptionScreen() {
  const { data: subscription, isLoading } = useSubscription();
  const createCheckout = useCreateCheckoutSession();
  const createPortal = useCreatePortalSession();

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isPaidPlan = subscription?.tier === 'monthly' || subscription?.tier === 'yearly';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription</Text>
        {hasActiveSubscription && isPaidPlan && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {subscription.tier === 'monthly' ? 'Monthly' : 'Yearly'} Plan
            </Text>
          </View>
        )}
      </View>

      {hasActiveSubscription && isPaidPlan ? (
        <View style={styles.currentPlanContainer}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={styles.planCard}>
            <Text style={styles.planName}>
              {subscription.tier === 'monthly' ? 'Monthly' : 'Yearly'} Subscription
            </Text>
            <Text style={styles.planPrice}>
              ${subscription.tier === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE}
              {subscription.tier === 'monthly' ? '/month' : '/year'}
            </Text>
            {subscription.current_period_end && (
              <Text style={styles.renewalText}>
                {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Show upgrade option for monthly subscribers */}
          {subscription.tier === 'monthly' && !subscription.cancel_at_period_end && (
            <View style={styles.upgradeContainer}>
              <View style={styles.upgradeBadge}>
                <Text style={styles.upgradeBadgeText}>💰 Save 16%</Text>
              </View>
              <Text style={styles.upgradeTitle}>Upgrade to Yearly</Text>
              <Text style={styles.upgradeDescription}>
                Pay ${YEARLY_PRICE}/year instead of ${(MONTHLY_PRICE * 12).toFixed(2)}/year
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => handleSubscribe('yearly')}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.upgradeButtonText}>Upgrade to Yearly Plan</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageSubscription}
            disabled={createPortal.isPending}
          >
            {createPortal.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.manageHint}>
            Update payment method, cancel subscription, or view invoices
          </Text>
        </View>
      ) : (
        <View style={styles.plansContainer}>
          {/* Active Plan Banner */}
          {currentPlan !== 'free' && (
            <View style={styles.activePlanBanner}>
              <Text style={styles.activePlanText}>
                ✓ You're on the {currentPlan === 'pro_monthly' ? 'Monthly' : 'Yearly'} Pro plan
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Unlock premium features and support GigLedger development
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
              <Text style={styles.planOptionTitle}>Monthly</Text>
              <Text style={styles.planOptionPrice}>${MONTHLY_PRICE}/mo</Text>
            </View>
            <Text style={styles.planDescription}>Billed monthly • Cancel anytime</Text>
            
            {/* CTA inside selected card */}
            {selectedPlan === 'monthly' && (
              <View style={styles.ctaContainer}>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={() => handleSubscribe('monthly')}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>
                      Subscribe to Monthly – ${MONTHLY_PRICE}/mo
                    </Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.ctaDisclaimer}>
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
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Save 16%</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={styles.planOptionTitle}>Yearly</Text>
              <Text style={styles.planOptionPrice}>${YEARLY_PRICE}/yr</Text>
            </View>
            <Text style={styles.planDescription}>
              ${(YEARLY_PRICE / 12).toFixed(2)}/mo • Billed annually
            </Text>
            
            {/* CTA inside selected card */}
            {selectedPlan === 'yearly' && (
              <View style={styles.ctaContainer}>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={() => handleSubscribe('yearly')}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>
                      Subscribe to Yearly – ${YEARLY_PRICE}/yr
                    </Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.ctaDisclaimer}>
                  Secure payment powered by Stripe. Cancel anytime.
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Features List - More compact */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Premium Features</Text>
            <View style={styles.featuresGrid}>
              {[
                'Unlimited gigs and expenses',
                'Advanced tax calculations',
                'Export to CSV and PDF',
                'Priority support',
                'Early access to new features',
                'Ad-free experience',
              ].map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
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
    backgroundColor: '#fff',
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
    padding: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentPlanContainer: {
    padding: 20,
  },
  plansContainer: {
    padding: 20,
    paddingTop: 0,
  },
  activePlanBanner: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  activePlanText: {
    fontSize: 14,
    color: '#065f46',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 8,
  },
  renewalText: {
    fontSize: 14,
    color: '#6b7280',
  },
  upgradeContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  upgradeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  upgradeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  planOption: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    position: 'relative',
  },
  planOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingBottom: 16,
  },
  ctaContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  planBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  planOptionPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  featuresContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  featuresGrid: {
    // Container for features list
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  featureIcon: {
    fontSize: 13,
    color: '#10b981',
    marginRight: 8,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ctaDisclaimer: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 3,
  },
  manageButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manageHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
