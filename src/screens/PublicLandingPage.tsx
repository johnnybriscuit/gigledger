import React, { useState } from 'react';
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
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

/**
 * Public marketing landing page - Dropbox-style, mobile-first, no AppShell
 * This is the first impression for new users
 */
export function PublicLandingPage({ onGetStarted, onSignIn, onNavigateToTerms, onNavigateToPrivacy }: PublicLandingPageProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const maxWidth = 1200;

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, isMobile && styles.navBarMobile]}>
        <View style={[styles.navContent, { maxWidth }, isMobile && styles.navContentMobile]}>
          <Text style={styles.navLogo}>💼 GigLedger</Text>
          <View style={[styles.navButtons, isMobile && styles.navButtonsMobile]}>
            <TouchableOpacity onPress={onSignIn} activeOpacity={0.7}>
              <Text style={styles.navLinkText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navPrimaryButton} 
              onPress={onGetStarted}
              activeOpacity={0.8}
            >
              <Text style={styles.navPrimaryButtonText}>Get started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.hero, isMobile && styles.heroMobile]}>
          <View style={[styles.heroContent, { maxWidth }, isMobile && styles.heroContentMobile]}>
            <Text style={[styles.headline, isMobile && styles.headlineMobile]}>
              Know what you earned.{'\n'}Know what to set aside.
            </Text>
            
            <Text style={[styles.subheadline, isMobile && styles.subheadlineMobile]}>
              Track gigs, expenses, and exports so tax season isn't a scramble.
            </Text>
            
            <View style={[styles.ctaButtons, isMobile && styles.ctaButtonsMobile]}>
              <TouchableOpacity 
                style={[styles.primaryButton, isMobile && styles.primaryButtonMobile]} 
                onPress={onGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Create free account</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, isMobile && styles.secondaryButtonMobile]} 
                onPress={onSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Log in</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.trustBadge}>✓ No credit card required to start</Text>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={[styles.section, isMobile && styles.sectionMobile]}>
          <View style={[styles.sectionContent, { maxWidth }]}>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              Built for gig workers
            </Text>
            
            <View style={[styles.benefitsGrid, isMobile && styles.benefitsGridMobile]}>
              <BenefitCard
                icon="⚡"
                title="Track gigs fast"
                description="Log income in seconds. See what you've earned at a glance."
                isMobile={isMobile}
              />
              <BenefitCard
                icon="💵"
                title="See estimated set-aside"
                description="Know how much to save for taxes. No surprises in April."
                isMobile={isMobile}
              />
              <BenefitCard
                icon="📤"
                title="Export for CPA / TurboTax"
                description="Generate reports your accountant or tax software needs."
                isMobile={isMobile}
              />
              <BenefitCard
                icon="📅"
                title="Stay organized all year"
                description="Track expenses and mileage as you go. Tax-ready anytime."
                isMobile={isMobile}
              />
            </View>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={[styles.section, isMobile && styles.sectionMobile]}>
          <View style={[styles.sectionContent, { maxWidth }]}>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              Simple, transparent pricing
            </Text>
            
            <View style={[styles.pricingGrid, isMobile && styles.pricingGridMobile]}>
              <PricingCard
                title="Free"
                price="$0"
                period="forever"
                features={[
                  'Track gigs & expenses',
                  'Basic dashboard',
                  'Up to 20 gigs',
                  'Up to 20 expenses',
                  'Tax estimates',
                ]}
                ctaText="Get started"
                onPress={onGetStarted}
                isMobile={isMobile}
                isPopular={false}
              />
              <PricingCard
                title="Pro"
                price="$7.99"
                period="per month"
                annualPrice="$79.99/year (2 months free)"
                features={[
                  'Everything in Free',
                  'Unlimited gigs & expenses',
                  'Export to CPA/TurboTax',
                  'Invoice generation',
                  'Advanced tax readiness',
                  'Priority support',
                ]}
                ctaText="Upgrade to Pro"
                onPress={onGetStarted}
                isMobile={isMobile}
                isPopular={true}
              />
            </View>
          </View>
        </View>

        {/* How It Works Section */}
        <View style={[styles.section, styles.howItWorksSection, isMobile && styles.sectionMobile]}>
          <View style={[styles.sectionContent, { maxWidth }]}>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              How it works
            </Text>
            
            <View style={[styles.stepsContainer, isMobile && styles.stepsContainerMobile]}>
              <StepCard
                number="1"
                title="Add gig income"
                description="Log each gig with amount, date, and payer."
                isMobile={isMobile}
              />
              <StepCard
                number="2"
                title="Add expenses/mileage"
                description="Track deductions to lower your tax bill."
                isMobile={isMobile}
              />
              <StepCard
                number="3"
                title="Export when ready"
                description="Download reports for your CPA or tax software."
                isMobile={isMobile}
              />
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={[styles.section, isMobile && styles.sectionMobile]}>
          <View style={[styles.sectionContent, { maxWidth }]}>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              Common questions
            </Text>
            
            <View style={[styles.faqContainer, isMobile && styles.faqContainerMobile]}>
              <FAQItem
                question="What does Pro include?"
                answer="Pro gives you unlimited gigs and expenses, export capabilities for your CPA or tax software, invoice generation, and advanced tax readiness features. Free is limited to 20 gigs and 20 expenses."
                isMobile={isMobile}
              />
              <FAQItem
                question="Can I cancel anytime?"
                answer="Yes. Cancel your Pro subscription anytime with no penalties. Your data stays yours forever, and you can export it before downgrading."
                isMobile={isMobile}
              />
              <FAQItem
                question="Is this tax advice?"
                answer="No. GigLedger provides estimates only. Consult a tax professional for advice specific to your situation."
                isMobile={isMobile}
              />
              <FAQItem
                question="Can I share exports with my CPA?"
                answer="Yes. Pro members can export reports in formats your accountant or tax software needs. Perfect for tax season."
                isMobile={isMobile}
              />
              <FAQItem
                question="What happens if I downgrade?"
                answer="Your data is never deleted. If you downgrade to Free, you'll keep all your data but won't be able to add more than 20 gigs or 20 expenses until you upgrade again."
                isMobile={isMobile}
              />
              <FAQItem
                question="Do you support LLC/S-Corp?"
                answer="Yes. GigLedger works for sole proprietors, LLCs, and S-Corps. Track income and expenses the same way regardless of your business structure."
                isMobile={isMobile}
              />
              <FAQItem
                question="Can I track mileage?"
                answer="Yes. Log business miles with IRS-compliant tracking. We calculate the deduction for you."
                isMobile={isMobile}
              />
            </View>
          </View>
        </View>

        {/* Final CTA */}
        <View style={[styles.ctaSection, isMobile && styles.ctaSectionMobile]}>
          <View style={[styles.sectionContent, { maxWidth }]}>
            <Text style={[styles.ctaTitle, isMobile && styles.ctaTitleMobile]}>
              Ready to feel caught up in 5 minutes?
            </Text>
            <View style={[styles.ctaButtons, isMobile && styles.ctaButtonsMobile]}>
              <TouchableOpacity 
                style={[styles.primaryButton, styles.ctaButton, isMobile && styles.ctaButtonMobile]} 
                onPress={onGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Create free account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSignIn} activeOpacity={0.7}>
                <Text style={styles.ctaLinkText}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, isMobile && styles.footerMobile]}>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={onNavigateToTerms} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={onNavigateToPrivacy} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>© 2025 GigLedger. All rights reserved.</Text>
          <Text style={styles.footerDisclaimer}>Estimates only. Not tax advice.</Text>
        </View>
      </ScrollView>
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

interface BenefitCardProps {
  icon: string;
  title: string;
  description: string;
  isMobile: boolean;
}

function BenefitCard({ icon, title, description, isMobile }: BenefitCardProps) {
  return (
    <View style={[styles.benefitCard, isMobile && styles.benefitCardMobile]}>
      <Text style={styles.benefitIcon}>{icon}</Text>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDescription}>{description}</Text>
    </View>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
  isMobile: boolean;
}

function FAQItem({ question, answer, isMobile }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.faqItem, isMobile && styles.faqItemMobile]}>
      <TouchableOpacity 
        style={styles.faqQuestion}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Text style={styles.faqToggle}>{isOpen ? '−' : '+'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <Text style={styles.faqAnswer}>{answer}</Text>
      )}
    </View>
  );
}

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  annualPrice?: string;
  features: string[];
  ctaText: string;
  onPress: () => void;
  isMobile: boolean;
  isPopular: boolean;
}

function PricingCard({ title, price, period, annualPrice, features, ctaText, onPress, isMobile, isPopular }: PricingCardProps) {
  return (
    <View style={[styles.pricingCard, isMobile && styles.pricingCardMobile, isPopular && styles.pricingCardPopular]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>BEST VALUE</Text>
        </View>
      )}
      <Text style={styles.pricingTitle}>{title}</Text>
      <View style={styles.pricingPriceContainer}>
        <Text style={styles.pricingPrice}>{price}</Text>
        <Text style={styles.pricingPeriod}>{period}</Text>
      </View>
      {annualPrice && (
        <Text style={styles.pricingAnnual}>{annualPrice}</Text>
      )}
      <View style={styles.pricingFeatures}>
        {features.map((feature, index) => (
          <View key={index} style={styles.pricingFeature}>
            <Text style={styles.pricingFeatureCheck}>✓</Text>
            <Text style={styles.pricingFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity 
        style={[styles.pricingButton, isPopular && styles.pricingButtonPopular]} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.pricingButtonText, isPopular && styles.pricingButtonTextPopular]}>{ctaText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Top Nav Bar
  navBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  navBarMobile: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 'auto',
    width: '100%',
  },
  navContentMobile: {
    maxWidth: '100%',
  },
  navLogo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navButtonsMobile: {
    gap: 12,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  navPrimaryButton: {
    backgroundColor: '#0066FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  navPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Hero Section
  hero: {
    backgroundColor: '#f9fafb',
    paddingVertical: 96,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroMobile: {
    paddingVertical: 64,
    paddingHorizontal: 16,
  },
  heroContent: {
    width: '100%',
    alignItems: 'center',
  },
  heroContentMobile: {
    maxWidth: '100%',
  },
  headline: {
    fontSize: 56,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 64,
    letterSpacing: -1,
  },
  headlineMobile: {
    fontSize: 36,
    lineHeight: 42,
    marginBottom: 20,
  },
  subheadline: {
    fontSize: 20,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
    maxWidth: 600,
  },
  subheadlineMobile: {
    fontSize: 18,
    lineHeight: 27,
    marginBottom: 32,
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
    maxWidth: 400,
  },
  primaryButton: {
    backgroundColor: '#0066FF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 200,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0066FF',
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButtonMobile: {
    width: '100%',
    minWidth: 0,
  },
  secondaryButtonText: {
    color: '#0066FF',
    fontSize: 16,
    fontWeight: '600',
  },
  trustBadge: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },

  // Section Styles
  section: {
    paddingVertical: 96,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sectionMobile: {
    paddingVertical: 64,
    paddingHorizontal: 16,
  },
  sectionContent: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 64,
    letterSpacing: -0.5,
  },
  sectionTitleMobile: {
    fontSize: 32,
    marginBottom: 48,
  },

  // Benefits Section
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    justifyContent: 'center',
  },
  benefitsGridMobile: {
    flexDirection: 'column',
    gap: 32,
  },
  benefitCard: {
    flex: 1,
    minWidth: 250,
    maxWidth: 280,
  },
  benefitCardMobile: {
    maxWidth: '100%',
    minWidth: 0,
  },
  benefitIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  benefitTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  benefitDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },

  // How It Works
  howItWorksSection: {
    backgroundColor: '#f9fafb',
  },
  stepsContainer: {
    flexDirection: 'row',
    gap: 48,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stepsContainerMobile: {
    flexDirection: 'column',
    gap: 40,
  },
  stepCard: {
    alignItems: 'center',
    flex: 1,
    minWidth: 250,
    maxWidth: 320,
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
    marginBottom: 20,
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
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    textAlign: 'center',
  },

  // Social Proof Section
  socialProofSection: {
    backgroundColor: '#ffffff',
  },
  socialProofContent: {
    maxWidth: 700,
    marginHorizontal: 'auto',
  },
  socialProofContentMobile: {
    maxWidth: '100%',
  },
  socialProofQuote: {
    fontSize: 28,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 40,
    fontStyle: 'italic',
  },
  socialProofQuoteMobile: {
    fontSize: 22,
    lineHeight: 32,
  },
  socialProofAttribution: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },

  // FAQ Section
  faqContainer: {
    maxWidth: 800,
    marginHorizontal: 'auto',
  },
  faqContainerMobile: {
    maxWidth: '100%',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 24,
  },
  faqItemMobile: {
    paddingVertical: 20,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    paddingRight: 16,
  },
  faqToggle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#6b7280',
    width: 24,
    textAlign: 'center',
  },
  faqAnswer: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginTop: 12,
    paddingRight: 40,
  },

  // CTA Section
  ctaSection: {
    backgroundColor: '#0066FF',
    paddingVertical: 96,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaSectionMobile: {
    paddingVertical: 64,
    paddingHorizontal: 16,
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  ctaTitleMobile: {
    fontSize: 32,
    marginBottom: 28,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
  },
  ctaButtonText: {
    color: '#0066FF',
    fontSize: 16,
    fontWeight: '600',
  },
  ctaButtonMobile: {
    maxWidth: 400,
  },
  ctaLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
  },

  // Footer
  footer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerMobile: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  footerLink: {
    color: '#9ca3af',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footerDivider: {
    color: '#6b7280',
    fontSize: 14,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  footerDisclaimer: {
    color: '#6b7280',
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Pricing Section
  pricingGrid: {
    flexDirection: 'row',
    gap: 32,
    justifyContent: 'center',
    marginBottom: 48,
  },
  pricingGridMobile: {
    flexDirection: 'column',
    gap: 24,
  },
  pricingCard: {
    flex: 1,
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 32,
    position: 'relative',
  },
  pricingCardMobile: {
    maxWidth: '100%',
  },
  pricingCardPopular: {
    borderColor: '#0066FF',
    borderWidth: 3,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  popularBadgeText: {
    backgroundColor: '#0066FF',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    letterSpacing: 0.5,
  },
  pricingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -1,
  },
  pricingPeriod: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  pricingAnnual: {
    fontSize: 14,
    color: '#0066FF',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  pricingFeatures: {
    marginBottom: 32,
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pricingFeatureCheck: {
    fontSize: 18,
    color: '#10b981',
    marginRight: 12,
    fontWeight: '700',
  },
  pricingFeatureText: {
    fontSize: 16,
    color: '#4b5563',
    flex: 1,
    lineHeight: 24,
  },
  pricingButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0066FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  pricingButtonPopular: {
    backgroundColor: '#0066FF',
  },
  pricingButtonText: {
    color: '#0066FF',
    fontSize: 16,
    fontWeight: '600',
  },
  pricingButtonTextPopular: {
    color: '#ffffff',
  },
});
