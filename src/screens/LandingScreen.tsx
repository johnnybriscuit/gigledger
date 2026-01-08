import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';

interface LandingScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function LandingScreen({ onGetStarted, onSignIn }: LandingScreenProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={[styles.hero, isMobile && styles.heroMobile]}>
        <View style={styles.heroContent}>
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
            >
              <Text style={styles.primaryButtonText}>Get Started Free</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryButton, isMobile && styles.secondaryButtonMobile]} 
              onPress={onSignIn}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.freeText}>✓ Free forever • No credit card required</Text>
        </View>
      </View>

      {/* Features Section */}
      <View style={[styles.section, styles.featuresSection]}>
        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
          Everything You Need to Succeed
        </Text>
        <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
          <FeatureCard
            icon="📊"
            title="Income Tracking"
            description="Log gigs, track payments, and see your earnings at a glance with beautiful dashboards."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="💰"
            title="Expense Management"
            description="Capture receipts, categorize expenses, and maximize your deductions automatically."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="🧮"
            title="Tax Calculations"
            description="Real-time tax estimates for federal, state, and self-employment taxes. Know what you owe."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="🚗"
            title="Mileage Tracking"
            description="Track business miles with IRS-compliant logs. Every mile counts toward your deductions."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="📄"
            title="Export Reports"
            description="Generate Schedule C, quarterly reports, and export data for your accountant or tax software."
            isMobile={isMobile}
          />
          <FeatureCard
            icon="🔒"
            title="Secure & Private"
            description="Bank-level encryption, secure authentication, and your data stays yours. Always."
            isMobile={isMobile}
          />
        </View>
      </View>

      {/* How It Works Section */}
      <View style={[styles.section, styles.howItWorksSection]}>
        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
          How It Works
        </Text>
        <View style={[styles.stepsContainer, isMobile && styles.stepsContainerMobile]}>
          <StepCard
            number="1"
            title="Sign Up Free"
            description="Create your account in seconds. No credit card required to get started."
            isMobile={isMobile}
          />
          <StepCard
            number="2"
            title="Track Your Work"
            description="Log gigs, expenses, and mileage as you go. Quick entry forms make it effortless."
            isMobile={isMobile}
          />
          <StepCard
            number="3"
            title="Stay Tax-Ready"
            description="See real-time tax estimates, export reports, and file with confidence at tax time."
            isMobile={isMobile}
          />
        </View>
      </View>

      {/* Pricing Section */}
      <View style={[styles.section, styles.pricingSection]}>
        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
          Simple, Transparent Pricing
        </Text>
        <View style={[styles.pricingGrid, isMobile && styles.pricingGridMobile]}>
          <PricingCard
            title="Free"
            price="$0"
            period="forever"
            features={[
              'Up to 25 gigs per year',
              'Up to 50 expenses per year',
              'Basic tax calculations',
              'Mileage tracking',
              'Export to CSV',
            ]}
            buttonText="Get Started Free"
            onPress={onGetStarted}
            isMobile={isMobile}
          />
          <PricingCard
            title="Pro"
            price="$9.99"
            period="per month"
            features={[
              'Unlimited gigs & expenses',
              'Advanced tax calculations',
              'Schedule C export',
              'Quarterly tax estimates',
              'Priority support',
              'Multi-state tax support',
            ]}
            buttonText="Start Free Trial"
            onPress={onGetStarted}
            highlighted
            isMobile={isMobile}
          />
        </View>
      </View>

      {/* CTA Section */}
      <View style={[styles.section, styles.ctaSection]}>
        <Text style={[styles.ctaTitle, isMobile && styles.ctaTitleMobile]}>
          Ready to Take Control of Your Finances?
        </Text>
        <Text style={[styles.ctaSubtitle, isMobile && styles.ctaSubtitleMobile]}>
          Join thousands of gig workers who trust GigLedger to manage their income and taxes.
        </Text>
        <TouchableOpacity 
          style={[styles.primaryButton, styles.ctaButton, isMobile && styles.ctaButtonMobile]} 
          onPress={onGetStarted}
        >
          <Text style={styles.primaryButtonText}>Get Started Free</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 GigLedger. All rights reserved.</Text>
        <View style={styles.footerLinks}>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerDivider}>•</Text>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </View>
      </View>
    </ScrollView>
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

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  onPress: () => void;
  highlighted?: boolean;
  isMobile: boolean;
}

function PricingCard({ 
  title, 
  price, 
  period, 
  features, 
  buttonText, 
  onPress, 
  highlighted,
  isMobile 
}: PricingCardProps) {
  return (
    <View style={[
      styles.pricingCard, 
      highlighted && styles.pricingCardHighlighted,
      isMobile && styles.pricingCardMobile
    ]}>
      {highlighted && <View style={styles.popularBadge}><Text style={styles.popularText}>MOST POPULAR</Text></View>}
      <Text style={styles.pricingTitle}>{title}</Text>
      <View style={styles.pricingPrice}>
        <Text style={styles.priceAmount}>{price}</Text>
        <Text style={styles.pricePeriod}>/{period}</Text>
      </View>
      <View style={styles.pricingFeatures}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity 
        style={[
          highlighted ? styles.primaryButton : styles.secondaryButton,
          styles.pricingButton
        ]} 
        onPress={onPress}
      >
        <Text style={highlighted ? styles.primaryButtonText : styles.secondaryButtonText}>
          {buttonText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flexGrow: 1,
  },
  
  // Hero Section
  hero: {
    backgroundColor: '#0066FF',
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  heroMobile: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  heroContent: {
    maxWidth: 900,
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 24,
  },
  logoMobile: {
    fontSize: 24,
    marginBottom: 16,
  },
  headline: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 64,
  },
  headlineMobile: {
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 16,
  },
  subheadline: {
    fontSize: 20,
    color: '#E6F0FF',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
    maxWidth: 700,
  },
  subheadlineMobile: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
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
    minWidth: 180,
    alignItems: 'center',
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
    minWidth: 180,
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
  freeText: {
    color: '#E6F0FF',
    fontSize: 14,
  },

  // Section Styles
  section: {
    paddingVertical: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 60,
  },
  sectionTitleMobile: {
    fontSize: 28,
    marginBottom: 40,
  },

  // Features Section
  featuresSection: {
    backgroundColor: '#f8f9fa',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 1200,
    gap: 32,
    justifyContent: 'center',
  },
  featuresGridMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    width: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureCardMobile: {
    width: '100%',
    padding: 24,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },

  // How It Works Section
  howItWorksSection: {
    backgroundColor: '#ffffff',
  },
  stepsContainer: {
    flexDirection: 'row',
    maxWidth: 1200,
    gap: 48,
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
    maxWidth: 350,
  },
  stepCardMobile: {
    maxWidth: '100%',
  },
  stepNumber: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepNumberText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    textAlign: 'center',
  },

  // Pricing Section
  pricingSection: {
    backgroundColor: '#f8f9fa',
  },
  pricingGrid: {
    flexDirection: 'row',
    maxWidth: 1000,
    gap: 32,
    justifyContent: 'center',
  },
  pricingGridMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    flex: 1,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  pricingCardMobile: {
    maxWidth: '100%',
    padding: 32,
  },
  pricingCardHighlighted: {
    borderWidth: 3,
    borderColor: '#0066FF',
    transform: [{ scale: 1.05 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  pricingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 32,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0066FF',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 4,
  },
  pricingFeatures: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkmark: {
    color: '#0066FF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  pricingButton: {
    width: '100%',
  },

  // CTA Section
  ctaSection: {
    backgroundColor: '#0066FF',
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaTitleMobile: {
    fontSize: 28,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#E6F0FF',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 600,
  },
  ctaSubtitleMobile: {
    fontSize: 16,
  },
  ctaButton: {
    minWidth: 200,
  },
  ctaButtonMobile: {
    width: '100%',
  },

  // Footer
  footer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 40,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  footerLink: {
    color: '#999999',
    fontSize: 14,
  },
  footerDivider: {
    color: '#666666',
  },
});
