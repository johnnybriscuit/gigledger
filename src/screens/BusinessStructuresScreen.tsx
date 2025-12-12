import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { BusinessStructureWizard } from '../components/BusinessStructureWizard';
import { useSubscription } from '../hooks/useSubscription';
import { getResolvedPlan } from '../lib/businessStructure';

interface BusinessStructuresScreenProps {
  onNavigateBack?: () => void;
  onNavigateToSubscription?: () => void;
}

export function BusinessStructuresScreen({ onNavigateBack, onNavigateToSubscription }: BusinessStructuresScreenProps) {
  const { data: subscription } = useSubscription();
  const plan = getResolvedPlan({
    subscriptionTier: subscription?.tier,
    subscriptionStatus: subscription?.status,
  });
  const isProPlan = plan === 'pro';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        {/* Back button */}
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Tax Profile</Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <Text style={styles.mainTitle}>Understanding Business Structures</Text>

        {/* Individual / Sole Proprietor */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎸</Text>
            <View style={styles.recommendedBadge}>
              <Text style={styles.badgeText}>Recommended for most musicians</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Individual / Sole Proprietor</Text>
          
          <Text style={styles.paragraph}>
            Most freelance musicians start here. You get paid personally under your own name, and report everything on Schedule C as a sole proprietor. There's no formal company or LLC required to use this option.
          </Text>

          <Text style={styles.bulletList}>
            • Simplest setup—no LLC or separate business required{'\n'}
            • Self-employment tax applies to your net profit{'\n'}
            • Great for early-career or part-time musicians{'\n'}
            • In GigLedger, we calculate both income tax and self-employment tax estimates for this mode
          </Text>
        </View>

        {/* Single-Member LLC */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📝</Text>
            <View style={styles.infoBadge}>
              <Text style={styles.badgeText}>Liability protection, same taxes</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Single-Member LLC</Text>
          
          <Text style={styles.paragraph}>
            A single-member LLC is a legal shell around your music work. For most people, it does not change your federal taxes by itself—it just adds liability protection and a more formal business structure.
          </Text>

          <Text style={styles.bulletList}>
            • Still taxed the same as an Individual / Sole Proprietor{'\n'}
            • Self-employment tax still applies to net profit{'\n'}
            • Helpful if you want legal separation or sign contracts as a business{'\n'}
            • In GigLedger, we treat this the same as Individual for tax estimates
          </Text>
        </View>

        {/* LLC taxed as S-Corp */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🏦</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>Advanced tax strategy</Text>
            </View>
            <View style={[styles.proBadge, { marginLeft: 8 }]}>
              <Text style={styles.proBadgeText}>Pro feature</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>LLC taxed as S-Corp</Text>
          
          <Text style={styles.paragraph}>
            This is not a different type of LLC—it's a special tax election with the IRS. With the right setup, S-Corp taxation can reduce self-employment taxes, but it also requires payroll, reasonable salary decisions, and professional help.
          </Text>

          <Text style={styles.bulletList}>
            • Self-employment tax does not apply the same way to S-Corp profits{'\n'}
            • Usually only worth it once your music profit is high enough (often around ~$60k+/year, depending on your situation){'\n'}
            • Requires running payroll and doing more advanced bookkeeping outside of GigLedger{'\n'}
            • In GigLedger, S-Corp mode switches to "tax tracking only": we track income and expenses, but do not calculate self-employment tax estimates for you
          </Text>

          {!isProPlan && (
            <View style={styles.upgradeBox}>
              <Text style={styles.upgradeText}>
                🔓 LLC taxed as S-Corp is a GigLedger Pro feature. Upgrade to Pro to turn off self-employment tax estimates and track your S-Corp income more cleanly.
              </Text>
              {onNavigateToSubscription && (
                <TouchableOpacity style={styles.upgradeButton} onPress={onNavigateToSubscription}>
                  <Text style={styles.upgradeButtonText}>View Pro Plans</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Multi-Member LLC / Partnership */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👥</Text>
            <View style={styles.infoBadge}>
              <Text style={styles.badgeText}>Best for band LLCs</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Multi-Member LLC / Partnership</Text>
          
          <Text style={styles.paragraph}>
            This is typically used when a band or group has a formal LLC or partnership with more than one owner. The entity files its own return and splits income between partners.
          </Text>

          <Text style={styles.bulletList}>
            • Taxes are handled at the partnership / entity level{'\n'}
            • Individual partners receive K-1s based on their share of the band{'\n'}
            • Self-employment tax rules can be more nuanced and entity-specific{'\n'}
            • In GigLedger, we focus on tracking total income and expenses—you and your accountant handle partner allocations
          </Text>
        </View>

        {/* Interactive Wizard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not sure which structure fits you?</Text>
          <Text style={styles.wizardSubtitle}>Take this short 4-question checkup.</Text>
          <BusinessStructureWizard />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            <Text style={styles.bold}>Heads up:</Text> GigLedger provides tax estimates only, not tax or legal advice. Business structure decisions are personal and should be made with a qualified CPA or attorney.
          </Text>
        </View>

        {/* Back button at bottom */}
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.bottomBackButton}>
            <Text style={styles.bottomBackButtonText}>← Back to Tax Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  content: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '600',
  },
  importantNote: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#1565C0',
  },
  disclaimer: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E65100',
  },
  bottomBackButton: {
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  bottomBackButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  recommendedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  infoBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bulletList: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  upgradeBox: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  upgradeText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1E40AF',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  wizardSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
});
