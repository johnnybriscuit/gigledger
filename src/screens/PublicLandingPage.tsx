import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

interface PublicLandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

/**
 * Public marketing landing page - mobile-first, no AppShell
 * This is the first impression for new users
 */
export function PublicLandingPage({ onGetStarted, onSignIn }: PublicLandingPageProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={[styles.hero, isMobile && styles.heroMobile]}>
        <View style={[styles.heroContent, isMobile && styles.heroContentMobile]}>
          <Text style={[styles.logo, isMobile && styles.logoMobile]}>💼 GigLedger</Text>
          
          <Text style={[styles.headline, isMobile && styles.headlineMobile]}>
            Track Your Gig Income.{'\n'}Maximize Your Tax Savings.
          </Text>
          
          <Text style={[styles.subheadline, isMobile && styles.subheadlineMobile]}>
            The all-in-one platform for freelancers, contractors, and gig workers to manage income, expenses, and taxes with confidence.
          </Text>
          
          <View style={[styles.ctaButtons, isMobile && styles.ctaButtonsMobile]}>
            <TouchableOpacity 
              style={[styles.primaryButton, isMobile && styles.primaryButtonMobile]} 
              onPress={onGetStarted}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started Free</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.secondaryButton, isMobile && styles.secondaryButtonMobile]} 
              onPress={onSignIn}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.trustBadge}>✓ Free forever • No credit card required</Text>
        </View>
      </View>

      {/* How It Works Section */}
      <View style={[styles.section, isMobile && styles.sectionMobile]}>
        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
          How It Works
        </Text>
        
        <View style={[styles.stepsContainer, isMobile && styles.stepsContainerMobile]}>
          <StepCard
            number="1"
            title="Sign Up Free"
            description="Create your account in seconds. No credit card required."
            isMobile={isMobile}
          />
          <StepCard
            number="2"
            title="Track Your Work"
            description="Log gigs, expenses, and mileage as you go. Quick and effortless."
            isMobile={isMobile}
          />
          <StepCard
            number="3"
            title="Stay Tax-Ready"
            description="See real-time tax estimates and export reports at tax time."
            isMobile={isMobile}
          />
        </View>
      </View>

      {/* Features Section */}
      <View style={[styles.section, styles.featuresSection, isMobile && styles.sectionMobile]}>
        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
          Everything You Need
        </Text>
        
        <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
          <FeatureCard
            icon="📊"
            title="Income Tracking"
            description="Log gigs and track payments with beautiful dashboards."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="💰"
            title="Expense Management"
            description="Capture receipts and maximize your deductions automatically."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="🧮"
            title="Tax Calculations"
            description="Real-time estimates for federal, state, and self-employment taxes."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="🚗"
            title="Mileage Tracking"
            description="IRS-compliant logs. Every mile counts toward deductions."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="📄"
            title="Export Reports"
            description="Generate Schedule C and quarterly reports for your accountant."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="🔒"
            title="Secure & Private"
            description="Bank-level encryption. Your data stays yours. Always."
            isMobile={isMobile}
          />
        </View>
      </View>

      {/* Pricing Teaser */}
      <View style={[styles.section, isMobile && styles.sectionMobile]}>
        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
          Simple Pricing
        </Text>
        
        <View style={[styles.pricingContainer, isMobile && styles.pricingContainerMobile]}>
          <View style={[styles.pricingCard, isMobile && styles.pricingCardMobile]}>
            <Text style={styles.pricingLabel}>Free Forever</Text>
            <Text style={styles.pricingAmount}>$0</Text>
            <Text style={styles.pricingDescription}>
              Perfect for getting started{'\n'}25 gigs • 50 expenses • Basic features
            </Text>
          </View>
          
          <View style={[styles.pricingCard, styles.pricingCardPro, isMobile && styles.pricingCardMobile]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
            <Text style={styles.pricingLabel}>Pro</Text>
            <Text style={styles.pricingAmount}>$9.99<Text style={styles.pricingPeriod}>/mo</Text></Text>
            <Text style={styles.pricingDescription}>
              For serious freelancers{'\n'}Unlimited • Advanced features • Priority support
            </Text>
          </View>
        </View>
      </View>

      {/* Final CTA */}
      <View style={[styles.ctaSection, isMobile && styles.ctaSectionMobile]}>
        <Text style={[styles.ctaTitle, isMobile && styles.ctaTitleMobile]}>
          Ready to Take Control?
        </Text>
        <Text style={[styles.ctaSubtitle, isMobile && styles.ctaSubtitleMobile]}>
          Join thousands of gig workers who trust GigLedger.
        </Text>
        <TouchableOpacity 
          style={[styles.primaryButton, styles.ctaButton, isMobile && styles.ctaButtonMobile]} 
          onPress={onGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started Free</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={[styles.footer, isMobile && styles.footerMobile]}>
        <Text style={styles.footerText}>© 2025 GigLedger. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  isMobile: boolean;
}

function StepCard({ number, title, description, isMobile }: StepCardProps) {
  return (
    <View style={[styles.stepCard, isMobile && styles.stepCardMobile]}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  isMobile: boolean;
}

function FeatureCard({ icon, title, description, isMobile }: FeatureCardProps) {
  return (
    <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Hero Section - Mobile-first
  hero: {
    backgroundColor: '#0066FF',
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 500,
  },
  heroMobile: {
    paddingVertical: 48,
    paddingHorizontal: 20,
    minHeight: 'auto',
  },
  heroContent: {
    maxWidth: 800,
    width: '100%',
    alignItems: 'center',
  },
  heroContentMobile: {
    maxWidth: '100%',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 32,
  },
  logoMobile: {
    fontSize: 24,
    marginBottom: 24,
  },
  headline: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 56,
  },
  headlineMobile: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 16,
  },
  subheadline: {
    fontSize: 18,
    color: '#E6F0FF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
    maxWidth: 600,
  },
  subheadlineMobile: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaButtonsMobile: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonMobile: {
    width: '100%',
    minWidth: 0,
  },
  primaryButtonText: {
    color: '#0066FF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    minWidth: 160,
    alignItems: 'center',
  },
  secondaryButtonMobile: {
    width: '100%',
    minWidth: 0,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  trustBadge: {
    color: '#E6F0FF',
    fontSize: 14,
    textAlign: 'center',
  },

  // Section Styles
  section: {
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sectionMobile: {
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 48,
  },
  sectionTitleMobile: {
    fontSize: 28,
    marginBottom: 32,
  },

  // How It Works
  stepsContainer: {
    flexDirection: 'row',
    maxWidth: 1000,
    gap: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stepsContainerMobile: {
    flexDirection: 'column',
    width: '100%',
    gap: 32,
  },
  stepCard: {
    alignItems: 'center',
    flex: 1,
    minWidth: 250,
    maxWidth: 300,
  },
  stepCardMobile: {
    maxWidth: '100%',
    minWidth: 0,
  },
  stepNumber: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepNumberText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    textAlign: 'center',
  },

  // Features Section
  featuresSection: {
    backgroundColor: '#f8f9fa',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 1000,
    gap: 24,
    justifyContent: 'center',
  },
  featuresGridMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featureCardMobile: {
    width: '100%',
    padding: 20,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 21,
  },

  // Pricing
  pricingContainer: {
    flexDirection: 'row',
    gap: 24,
    maxWidth: 700,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pricingContainerMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    position: 'relative',
  },
  pricingCardMobile: {
    maxWidth: '100%',
    minWidth: 0,
  },
  pricingCardPro: {
    borderWidth: 2,
    borderColor: '#0066FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#0066FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  pricingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  pricingAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0066FF',
    marginBottom: 12,
  },
  pricingPeriod: {
    fontSize: 16,
    color: '#666666',
  },
  pricingDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 21,
  },

  // CTA Section
  ctaSection: {
    backgroundColor: '#0066FF',
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaSectionMobile: {
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  ctaTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaTitleMobile: {
    fontSize: 28,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#E6F0FF',
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 500,
  },
  ctaSubtitleMobile: {
    fontSize: 15,
  },
  ctaButton: {
    minWidth: 200,
  },
  ctaButtonMobile: {
    width: '100%',
    maxWidth: 320,
  },

  // Footer
  footer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerMobile: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#999999',
    fontSize: 13,
  },
});
