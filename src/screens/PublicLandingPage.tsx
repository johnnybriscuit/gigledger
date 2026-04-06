import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, DownloadSimple, Receipt } from 'phosphor-react-native';
import { getThemePalette, radiusNum, spacingNum } from '../styles/theme';
import { trackHomepageCtaClicked } from '../lib/analytics';

interface PublicLandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToSupport?: () => void;
}

const HERO_STEPS = [
  {
    title: 'Create your account',
    description: 'Use Google, email, or a magic link.',
  },
  {
    title: 'Add your first gig',
    description: 'Start with payer, date, and amount.',
  },
  {
    title: 'Stay tax-ready',
    description: 'Add mileage, expenses, and exports anytime.',
  },
] as const;

const HERO_PROOF_CARDS = [
  {
    Icon: CalendarCheck,
    iconColor: '#2563EB',
    iconBackground: '#DBEAFE',
    label: 'Fast first entry',
    value: 'Log your first gig in minutes',
  },
  {
    Icon: Receipt,
    iconColor: '#0F766E',
    iconBackground: '#CCFBF1',
    label: 'Tax-aware tracking',
    value: 'See what to set aside as you work',
  },
  {
    Icon: DownloadSimple,
    iconColor: '#475569',
    iconBackground: '#E2E8F0',
    label: 'CPA-ready exports',
    value: 'Export clean records at tax time',
  },
] as const;

const landingPalette = getThemePalette('light');

/**
 * Public marketing landing page - Dropbox-style, mobile-first, no AppShell
 * This is the first impression for new users
 */
export function PublicLandingPage({ onGetStarted, onSignIn, onNavigateToTerms, onNavigateToPrivacy, onNavigateToSupport }: PublicLandingPageProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isNarrowMobile = width < 560;
  const isStackedHero = width < 1024;
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
      <LandingHeader
        maxWidth={maxWidth}
        isMobile={isMobile}
        isNarrowMobile={isNarrowMobile}
        navBarTopPadding={navBarTopPadding}
        onLogin={() => handleLoginCta('nav_login')}
        onCreateAccount={() => handleSignupCta('nav_primary')}
      />

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topSection, isMobile && styles.topSectionMobile]}>
          <View style={[styles.hero, isMobile && styles.heroMobile]}>
            <View style={[styles.heroContent, { maxWidth }, isMobile && styles.heroContentMobile]}>
              <View style={[styles.heroLayout, isStackedHero && styles.heroLayoutStacked]}>
                <View style={[styles.heroTextColumn, isStackedHero && styles.heroTextColumnStacked]}>
                  <Text style={styles.eyebrow}>
                    Built for musicians. Flexible for any gig worker.
                  </Text>
                  <Text style={[styles.headline, isStackedHero && styles.headlineStacked, isMobile && styles.headlineMobile]}>
                    Track your gigs. Know what to set aside for taxes.
                  </Text>

                  <Text style={[styles.subheadline, isStackedHero && styles.subheadlineStacked, isMobile && styles.subheadlineMobile]}>
                    Bozzy helps performers, freelancers, and self-employed workers log income, stay organized, and avoid tax-season chaos.
                  </Text>

                  <View style={[styles.heroCtaButtons, isMobile && styles.heroCtaButtonsMobile]}>
                    <TouchableOpacity 
                      style={[styles.primaryButton, styles.heroPrimaryButton, isMobile && styles.primaryButtonMobile]} 
                      onPress={() => handleSignupCta('hero_primary')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryButtonText}>Create free account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.heroSecondaryButton, isMobile && styles.heroSecondaryButtonMobile]} 
                      onPress={() => handleLoginCta('hero_secondary')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.heroSecondaryButtonText}>Log in</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.trustBadge}>
                    No credit card required. Create your account, add your first gig, and stay organized from day one.
                  </Text>
                </View>

                <HeroStepsCard isMobile={isMobile} isStackedHero={isStackedHero} />
              </View>

              <View style={[styles.proofStrip, isMobile && styles.proofStripMobile]}>
                {HERO_PROOF_CARDS.map((card) => (
                  <HeroProofCard
                    key={card.label}
                    Icon={card.Icon}
                    iconColor={card.iconColor}
                    iconBackground={card.iconBackground}
                    label={card.label}
                    value={card.value}
                    isMobile={isMobile}
                  />
                ))}
              </View>
            </View>
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

interface LandingHeaderProps {
  maxWidth: number;
  isMobile: boolean;
  isNarrowMobile: boolean;
  navBarTopPadding: number;
  onLogin: () => void;
  onCreateAccount: () => void;
}

function LandingHeader({ maxWidth, isMobile, isNarrowMobile, navBarTopPadding, onLogin, onCreateAccount }: LandingHeaderProps) {
  const createAccountLabel = isNarrowMobile ? 'Sign up' : 'Create free account';

  return (
    <View style={[styles.navBar, isMobile && styles.navBarMobile, isNarrowMobile && styles.navBarNarrowMobile, { paddingTop: (isMobile ? spacingNum[3] : spacingNum[4]) + navBarTopPadding }]}>
      <View style={[styles.navContent, { maxWidth }, isMobile && styles.navContentMobile, isNarrowMobile && styles.navContentNarrowMobile]}>
        <View style={[styles.navBrand, isNarrowMobile && styles.navBrandNarrowMobile]}>
          <Image
            source={require('../../assets/logo-mark-64.png')}
            style={[styles.navLogoMark, isMobile && styles.navLogoMarkMobile, isNarrowMobile && styles.navLogoMarkNarrowMobile]}
            resizeMode="contain"
          />
          {!isNarrowMobile && (
            <Text style={[styles.navLogoText, isMobile && styles.navLogoTextMobile, isNarrowMobile && styles.navLogoTextNarrowMobile]} numberOfLines={1}>
              Bozzy
            </Text>
          )}
        </View>

        <View style={[styles.navButtons, isMobile && styles.navButtonsMobile, isNarrowMobile && styles.navButtonsNarrowMobile]}>
          <TouchableOpacity onPress={onLogin} activeOpacity={0.7} style={[styles.navLoginButton, isNarrowMobile && styles.navLoginButtonNarrowMobile]}>
            <Text style={[styles.navLinkText, isMobile && styles.navLinkTextMobile, isNarrowMobile && styles.navLinkTextNarrowMobile]}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navPrimaryButton, isMobile && styles.navPrimaryButtonMobile, isNarrowMobile && styles.navPrimaryButtonNarrowMobile]}
            onPress={onCreateAccount}
            activeOpacity={0.8}
          >
            <Text style={[styles.navPrimaryButtonText, isNarrowMobile && styles.navPrimaryButtonTextNarrowMobile]} numberOfLines={1}>{createAccountLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface HeroStepsCardProps {
  isMobile: boolean;
  isStackedHero: boolean;
}

function HeroStepsCard({ isMobile, isStackedHero }: HeroStepsCardProps) {
  return (
    <View style={[styles.heroPanel, isStackedHero && styles.heroPanelStacked, isMobile && styles.heroPanelMobile]}>
      <Text style={[styles.heroPanelTitle, isMobile && styles.heroPanelTitleMobile]}>Get started in 3 simple steps</Text>

      <View style={styles.heroPanelSteps}>
        {HERO_STEPS.map((step, index) => (
          <View key={step.title} style={[styles.heroPanelStep, index > 0 && styles.heroPanelStepBorder]}>
            <View style={styles.heroPanelStepNumberWrap}>
              <Text style={styles.heroPanelStepNumber}>{index + 1}</Text>
            </View>
            <View style={styles.heroPanelStepContent}>
              <Text style={styles.heroPanelStepTitle}>{step.title}</Text>
              <Text style={styles.heroPanelStepText}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
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

interface HeroProofCardProps {
  Icon: React.ElementType;
  iconColor: string;
  iconBackground: string;
  label: string;
  value: string;
  isMobile: boolean;
}

function HeroProofCard({ Icon, iconColor, iconBackground, label, value, isMobile }: HeroProofCardProps) {
  return (
    <View style={[styles.proofCard, isMobile && styles.proofCardMobile]}>
      <View style={[styles.proofCardIconWrap, { backgroundColor: iconBackground }]}>
        <Icon size={18} weight="bold" color={iconColor} />
      </View>
      <Text style={styles.proofCardLabel}>{label}</Text>
      <Text style={styles.proofCardValue}>{value}</Text>
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
    backgroundColor: landingPalette.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: landingPalette.border.muted,
    paddingBottom: spacingNum[4],
    paddingHorizontal: spacingNum[6],
  },
  navBarMobile: {
    paddingBottom: spacingNum[3],
    paddingHorizontal: spacingNum[4],
  },
  navBarNarrowMobile: {
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'center',
    gap: spacingNum[4],
  },
  navContentMobile: {
    maxWidth: '100%',
  },
  navContentNarrowMobile: {
    gap: 8,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  navBrandNarrowMobile: {
    minWidth: 0,
    marginRight: 4,
  },
  navLogoMark: {
    width: 26,
    height: 26,
    marginRight: 10,
  },
  navLogoMarkMobile: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  navLogoMarkNarrowMobile: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  navLogoText: {
    fontSize: 22,
    fontWeight: '700',
    color: landingPalette.text.DEFAULT,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  navLogoTextMobile: {
    fontSize: 19,
    lineHeight: 22,
  },
  navLogoTextNarrowMobile: {
    fontSize: 15,
    lineHeight: 18,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNum[3],
    flexShrink: 0,
  },
  navButtonsMobile: {
    gap: spacingNum[2],
  },
  navButtonsNarrowMobile: {
    gap: 6,
    minWidth: 0,
    flexShrink: 1,
  },
  navLoginButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  navLoginButtonNarrowMobile: {
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: landingPalette.text.muted,
  },
  navLinkTextMobile: {
    fontSize: 14,
  },
  navLinkTextNarrowMobile: {
    fontSize: 10,
  },
  navPrimaryButton: {
    backgroundColor: landingPalette.brand.DEFAULT,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radiusNum.full,
    minHeight: 40,
    justifyContent: 'center',
    flexShrink: 1,
  },
  navPrimaryButtonMobile: {
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  navPrimaryButtonNarrowMobile: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 32,
    minWidth: 0,
  },
  navPrimaryButtonText: {
    color: landingPalette.brand.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  navPrimaryButtonTextNarrowMobile: {
    fontSize: 10,
  },

  topSection: {
    backgroundColor: landingPalette.surface.canvas,
  },
  topSectionMobile: {
    backgroundColor: landingPalette.surface.canvas,
  },

  // Hero Section
  hero: {
    paddingTop: spacingNum[20],
    paddingBottom: spacingNum[20],
    paddingHorizontal: spacingNum[6],
    alignItems: 'center',
  },
  heroMobile: {
    paddingTop: spacingNum[16],
    paddingBottom: spacingNum[16],
    paddingHorizontal: spacingNum[4],
  },
  heroContent: {
    width: '100%',
    alignItems: 'stretch',
  },
  heroContentMobile: {
    maxWidth: '100%',
  },
  heroLayout: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacingNum[12],
  },
  heroLayoutStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacingNum[6],
  },
  heroTextColumn: {
    flex: 1,
    alignItems: 'flex-start',
    maxWidth: 640,
    paddingRight: spacingNum[6],
  },
  heroTextColumnStacked: {
    width: '100%',
    maxWidth: '100%',
    paddingRight: 0,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: landingPalette.text.subtle,
    letterSpacing: 0.2,
    marginBottom: spacingNum[3],
    textAlign: 'left',
  },
  headline: {
    fontSize: 56,
    fontWeight: '800',
    color: landingPalette.text.DEFAULT,
    textAlign: 'left',
    marginBottom: spacingNum[5],
    lineHeight: 64,
    letterSpacing: -1,
    maxWidth: 620,
  },
  headlineStacked: {
    fontSize: 48,
    lineHeight: 56,
    maxWidth: 720,
  },
  headlineMobile: {
    fontSize: 38,
    lineHeight: 46,
  },
  subheadline: {
    fontSize: 20,
    color: landingPalette.text.muted,
    textAlign: 'left',
    marginBottom: spacingNum[7],
    lineHeight: 30,
    maxWidth: 560,
  },
  subheadlineStacked: {
    maxWidth: 680,
  },
  subheadlineMobile: {
    fontSize: 18,
    lineHeight: 29,
  },
  heroCtaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNum[4],
    marginBottom: spacingNum[4],
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  heroCtaButtonsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    gap: spacingNum[3],
    maxWidth: 400,
  },
  primaryButton: {
    backgroundColor: landingPalette.brand.DEFAULT,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  heroPrimaryButton: {
    minHeight: 56,
  },
  primaryButtonMobile: {
    width: '100%',
    minWidth: 0,
  },
  primaryButtonText: {
    color: landingPalette.brand.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  heroSecondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 120,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSecondaryButtonMobile: {
    width: '100%',
    minWidth: 0,
  },
  heroSecondaryButtonText: {
    color: landingPalette.text.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  trustBadge: {
    color: landingPalette.text.subtle,
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 22,
    maxWidth: 560,
  },
  heroPanel: {
    flex: 0.82,
    width: '100%',
    maxWidth: 410,
    backgroundColor: landingPalette.surface.DEFAULT,
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: landingPalette.border.muted,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
  },
  heroPanelStacked: {
    maxWidth: 640,
  },
  heroPanelMobile: {
    width: '100%',
    padding: 20,
  },
  heroPanelTitle: {
    color: landingPalette.text.DEFAULT,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: spacingNum[4],
  },
  heroPanelTitleMobile: {
    fontSize: 24,
    lineHeight: 31,
  },
  heroPanelSteps: {
    gap: 0,
  },
  heroPanelStep: {
    flexDirection: 'row',
    gap: spacingNum[4],
    alignItems: 'flex-start',
    paddingVertical: spacingNum[4],
  },
  heroPanelStepBorder: {
    borderTopWidth: 1,
    borderTopColor: landingPalette.border.muted,
  },
  heroPanelStepNumberWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: landingPalette.brand.muted,
  },
  heroPanelStepNumber: {
    color: landingPalette.brand.DEFAULT,
    fontSize: 14,
    fontWeight: '700',
  },
  heroPanelStepContent: {
    flex: 1,
  },
  heroPanelStepTitle: {
    color: landingPalette.text.DEFAULT,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroPanelStepText: {
    color: landingPalette.text.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  proofStrip: {
    marginTop: spacingNum[10],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNum[4],
  },
  proofStripMobile: {
    marginTop: spacingNum[6],
    flexDirection: 'column',
  },
  proofCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: landingPalette.surface.DEFAULT,
    borderWidth: 1,
    borderColor: landingPalette.border.muted,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  proofCardMobile: {
    width: '100%',
    minWidth: 0,
  },
  proofCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingNum[3],
  },
  proofCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: landingPalette.text.DEFAULT,
    marginBottom: 6,
  },
  proofCardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: landingPalette.text.muted,
    lineHeight: 22,
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
