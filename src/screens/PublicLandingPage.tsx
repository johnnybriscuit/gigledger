import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackHomepageCtaClicked } from '../lib/analytics';

interface PublicLandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToSupport?: () => void;
}

/**
 * Public marketing landing page - Dropbox-style, mobile-first, no AppShell
 * This is the first impression for new users
 */
export function PublicLandingPage({ onGetStarted, onSignIn, onNavigateToTerms, onNavigateToPrivacy, onNavigateToSupport }: PublicLandingPageProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const maxWidth = 1200;
  const insets = useSafeAreaInsets();
  const navBarTopPadding = Platform.OS !== 'web' ? insets.top : 0;

  const handleSignupCta = (
    cta: 'hero_primary' | 'nav_primary' | 'pricing_free' | 'pricing_pro' | 'final_primary'
  ) => {
    trackHomepageCtaClicked({ cta, destination: 'signup' });
    onGetStarted();
  };

  const handleLoginCta = (cta: 'hero_secondary' | 'nav_login' | 'final_login') => {
    trackHomepageCtaClicked({ cta, destination: 'login' });
    onSignIn();
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, isMobile && styles.navBarMobile, { paddingTop: (isMobile ? 12 : 16) + navBarTopPadding }]}>
        <View style={[styles.navContent, { maxWidth }, isMobile && styles.navContentMobile]}>
          <Text style={styles.navLogo}>💼 Bozzy</Text>
          <View style={[styles.navButtons, isMobile && styles.navButtonsMobile]}>
            <TouchableOpacity onPress={() => handleLoginCta('nav_login')} activeOpacity={0.7}>
              <Text style={styles.navLinkText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navPrimaryButton} 
              onPress={() => handleSignupCta('nav_primary')}
              activeOpacity={0.8}
            >
              <Text style={styles.navPrimaryButtonText}>Create free account</Text>
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
            <View style={[styles.heroLayout, isMobile && styles.heroLayoutMobile]}>
              <View style={[styles.heroTextColumn, isMobile && styles.heroTextColumnMobile]}>
                <Text style={[styles.eyebrow, isMobile && styles.heroTextCentered]}>
                  For musicians first. Flexible enough for the rest of your gig work.
                </Text>
                <Text style={[styles.headline, isMobile && styles.headlineMobile]}>
                  Track gigs.{'\n'}Know your tax set-aside.
                </Text>

                <Text style={[styles.subheadline, isMobile && styles.subheadlineMobile]}>
                  Built for performers, freelancers, and self-employed gig workers who need clean income records before tax season turns messy.
                </Text>

                <View style={[styles.ctaButtons, isMobile && styles.ctaButtonsMobile]}>
                  <TouchableOpacity 
                    style={[styles.primaryButton, isMobile && styles.primaryButtonMobile]} 
                    onPress={() => handleSignupCta('hero_primary')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Create free account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.secondaryButton, isMobile && styles.secondaryButtonMobile]} 
                    onPress={() => handleLoginCta('hero_secondary')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>Log in</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.trustBadge, isMobile && styles.heroTextCentered]}>
                  No credit card required. Verify your email, land in the dashboard, and start with your first gig.
                </Text>
              </View>

              <View style={[styles.heroPanel, isMobile && styles.heroPanelMobile]}>
                <Text style={styles.heroPanelEyebrow}>What happens next</Text>
                <Text style={styles.heroPanelTitle}>A cleaner first-run path</Text>

                <View style={styles.heroPanelSteps}>
                  <View style={styles.heroPanelStep}>
                    <Text style={styles.heroPanelStepNumber}>1</Text>
                    <View style={styles.heroPanelStepContent}>
                      <Text style={styles.heroPanelStepTitle}>Create your account</Text>
                      <Text style={styles.heroPanelStepText}>Use Google, password, or a magic link.</Text>
                    </View>
                  </View>

                  <View style={styles.heroPanelStep}>
                    <Text style={styles.heroPanelStepNumber}>2</Text>
                    <View style={styles.heroPanelStepContent}>
                      <Text style={styles.heroPanelStepTitle}>Add the first gig</Text>
                      <Text style={styles.heroPanelStepText}>Amount, date, and payer first. Extra details can wait.</Text>
                    </View>
                  </View>

                  <View style={styles.heroPanelStep}>
                    <Text style={styles.heroPanelStepNumber}>3</Text>
                    <View style={styles.heroPanelStepContent}>
                      <Text style={styles.heroPanelStepTitle}>Stay tax-ready as you go</Text>
                      <Text style={styles.heroPanelStepText}>Layer on mileage, expenses, and exports when you need them.</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.heroPanelFooter}>
                  <Text style={styles.heroPanelFooterText}>Best fit for live-performance income, side gigs, and other self-employed work that needs simple records.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.proofStrip, isMobile && styles.proofStripMobile]}>
          <View style={[styles.sectionContent, { maxWidth }, styles.proofStripContent]}>
            <ProofPill label="Fast first entry" value="Log your first gig in minutes" />
            <ProofPill label="Tax-aware" value="See what to set aside while you work" />
            <ProofPill label="CPA-ready" value="Export organized records when the year ends" />
          </View>
        </View>

        {/* Benefits Section */}
        <View style={[styles.section, isMobile && styles.sectionMobile]}>
          <View style={[styles.sectionContent, { maxWidth }]}>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              What you get after signup
            </Text>
            <Text style={styles.sectionLead}>
              Use one workspace to stay on top of performance income first, then the rest of your self-employed workflow.
            </Text>

            <View style={[styles.valueGrid, isMobile && styles.valueGridMobile]}>
              <ValueCard
                title="A clean gig ledger"
                description="Income, payer, payout status, and optional venue details in one place."
                isMobile={isMobile}
              />
              <ValueCard
                title="Tax set-aside visibility"
                description="Know what to save before tax season sneaks up on you."
                isMobile={isMobile}
              />
              <ValueCard
                title="Records that compound"
                description="Expenses, mileage, and exports build on the same gigs instead of living in separate tools."
                isMobile={isMobile}
              />
            </View>
            
            <View style={[styles.benefitsGrid, isMobile && styles.benefitsGridMobile]}>
              <BenefitCard
                icon="⚡"
                title="Track gigs fast"
                description="Capture the essentials first. Add details only when they matter."
                isMobile={isMobile}
              />
              <BenefitCard
                icon="💵"
                title="See estimated set-aside"
                description="Get guidance while earnings are fresh instead of guessing later."
                isMobile={isMobile}
              />
              <BenefitCard
                icon="📤"
                title="Export for CPA / TurboTax"
                description="Hand off cleaner records at tax time without rebuilding your books."
                isMobile={isMobile}
              />
              <BenefitCard
                icon="📅"
                title="Grow beyond gigs"
                description="Track deductions and billing in the same account as your income."
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
            <Text style={styles.sectionLead}>
              Start free until you outgrow the limits. Upgrade when you need exports, unlimited tracking, or a more complete tax-time handoff.
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
                onPress={() => handleSignupCta('pricing_free')}
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
                ctaText="Start free, upgrade later"
                onPress={() => handleSignupCta('pricing_pro')}
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
                answer="No. Bozzy provides estimates only. Consult a tax professional for advice specific to your situation."
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
                answer="Yes. Bozzy works for sole proprietors, LLCs, and S-Corps. Track income and expenses the same way regardless of your business structure."
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
              Start with one gig. Build the records from there.
            </Text>
            <View style={[styles.ctaButtons, isMobile && styles.ctaButtonsMobile]}>
              <TouchableOpacity 
                style={[styles.primaryButton, styles.ctaButton, isMobile && styles.ctaButtonMobile]} 
                onPress={() => handleSignupCta('final_primary')}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Create free account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleLoginCta('final_login')} activeOpacity={0.7}>
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
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={onNavigateToSupport} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Support</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>© 2025 Bozzy. All rights reserved.</Text>
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

interface ProofPillProps {
  label: string;
  value: string;
}

function ProofPill({ label, value }: ProofPillProps) {
  return (
    <View style={styles.proofPill}>
      <Text style={styles.proofPillLabel}>{label}</Text>
      <Text style={styles.proofPillValue}>{value}</Text>
    </View>
  );
}

interface ValueCardProps {
  title: string;
  description: string;
  isMobile: boolean;
}

function ValueCard({ title, description, isMobile }: ValueCardProps) {
  return (
    <View style={[styles.valueCard, isMobile && styles.valueCardMobile]}>
      <Text style={styles.valueCardTitle}>{title}</Text>
      <Text style={styles.valueCardDescription}>{description}</Text>
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
    width: '100%',
    alignSelf: 'center',
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
  heroLayout: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 32,
  },
  heroLayoutMobile: {
    flexDirection: 'column',
    gap: 24,
  },
  heroTextColumn: {
    flex: 1.1,
    alignItems: 'flex-start',
  },
  heroTextColumnMobile: {
    alignItems: 'center',
  },
  heroTextCentered: {
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0066FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 18,
    textAlign: 'left',
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
    textAlign: 'left',
    marginBottom: 40,
    lineHeight: 30,
    maxWidth: 600,
  },
  subheadlineMobile: {
    fontSize: 18,
    lineHeight: 27,
    marginBottom: 32,
    textAlign: 'center',
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
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 22,
    maxWidth: 760,
  },
  heroPanel: {
    flex: 0.9,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  heroPanelMobile: {
    width: '100%',
    padding: 22,
  },
  heroPanelEyebrow: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  heroPanelTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 20,
  },
  heroPanelSteps: {
    gap: 14,
  },
  heroPanelStep: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  heroPanelStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    color: '#0F172A',
    backgroundColor: '#FBBF24',
    fontSize: 14,
    fontWeight: '800',
  },
  heroPanelStepContent: {
    flex: 1,
  },
  heroPanelStepTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroPanelStepText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
  },
  heroPanelFooter: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.18)',
  },
  heroPanelFooterText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
  },
  proofStrip: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  proofStripMobile: {
    paddingHorizontal: 16,
  },
  proofStripContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  proofPill: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  proofPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  proofPillValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
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
  sectionLead: {
    fontSize: 17,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 760,
    alignSelf: 'center',
    marginBottom: 28,
  },

  // Benefits Section
  valueGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  valueGridMobile: {
    flexDirection: 'column',
  },
  valueCard: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 22,
  },
  valueCardMobile: {
    width: '100%',
  },
  valueCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  valueCardDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
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
    width: '100%',
    alignSelf: 'center',
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
    width: '100%',
    alignSelf: 'center',
  },
  faqContainerMobile: {
    maxWidth: '100%',
    width: '100%',
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
