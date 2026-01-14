/**
 * Paywall Modal Component
 * Shows upgrade prompts at "moment of pain" when users hit Free plan limits
 * 
 * Phase 1: Monetization Plumbing
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, radius, typography } from '../styles/theme';

export type PaywallReason = 'invoice_limit' | 'export_limit' | 'gig_limit' | 'expense_limit';

interface PaywallModalProps {
  visible: boolean;
  reason: PaywallReason;
  onClose: () => void;
  onUpgrade: () => void;
  remainingCount?: number;
}

const PAYWALL_CONTENT: Record<PaywallReason, { title: string; body: string }> = {
  invoice_limit: {
    title: "You've reached the Free plan invoice limit",
    body: "Free includes up to 3 invoices. Upgrade to Pro for unlimited invoices (plus exports and unlimited tracking). Cancel anytime.",
  },
  export_limit: {
    title: "Exports are a Pro feature",
    body: "Upgrade to Pro to export your data to TurboTax, CPAs, and other formats. Plus get unlimited invoices and tracking. Cancel anytime.",
  },
  gig_limit: {
    title: "You've reached the Free plan gig limit",
    body: "Free includes up to 20 gigs. Upgrade to Pro for unlimited gigs, expenses, invoices, and exports. Cancel anytime.",
  },
  expense_limit: {
    title: "You've reached the Free plan expense limit",
    body: "Free includes up to 20 expenses. Upgrade to Pro for unlimited expenses, gigs, invoices, and exports. Cancel anytime.",
  },
};

export function PaywallModal({ visible, reason, onClose, onUpgrade, remainingCount }: PaywallModalProps) {
  const content = PAYWALL_CONTENT[reason];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🚀</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{content.title}</Text>

            {/* Body */}
            <Text style={styles.body}>{content.body}</Text>

            {/* Pro Features List */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Pro includes:</Text>
              {[
                'Unlimited gigs & expenses',
                'Unlimited invoices',
                'Export to CPA/TurboTax',
                'Advanced tax readiness',
                'Priority support',
              ].map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles.pricingContainer}>
              <Text style={styles.pricingText}>
                Starting at <Text style={styles.pricingAmount}>$7.99/month</Text>
              </Text>
              <Text style={styles.pricingSubtext}>or $79.99/year (save 2 months)</Text>
            </View>

            {/* CTA Buttons */}
            <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Not now</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: parseInt(spacing[4]),
  },
  modal: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: parseInt(radius.lg),
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    maxHeight: '100%',
  },
  content: {
    padding: parseInt(spacing[6]),
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: parseInt(spacing[4]),
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.DEFAULT,
    textAlign: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  body: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: parseInt(spacing[5]),
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: colors.surface.muted,
    borderRadius: parseInt(radius.md),
    padding: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[4]),
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[2]),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: parseInt(spacing[2]),
  },
  featureIcon: {
    fontSize: 14,
    color: colors.success.DEFAULT,
    fontWeight: typography.fontWeight.bold,
    marginRight: parseInt(spacing[2]),
  },
  featureText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  pricingContainer: {
    marginBottom: parseInt(spacing[5]),
    alignItems: 'center',
  },
  pricingText: {
    fontSize: 16,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[1]),
  },
  pricingAmount: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.DEFAULT,
  },
  pricingSubtext: {
    fontSize: 13,
    color: colors.text.muted,
  },
  upgradeButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: parseInt(spacing[3]),
    paddingHorizontal: parseInt(spacing[6]),
    borderRadius: parseInt(radius.md),
    width: '100%',
    marginBottom: parseInt(spacing[2]),
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    color: '#fff',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: parseInt(spacing[2]),
    paddingHorizontal: parseInt(spacing[4]),
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
