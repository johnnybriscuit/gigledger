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
                question="Do I need a CPA?"
                answer="No. GigLedger helps you track income and expenses, but you can file yourself or export data for your accountant."
                isMobile={isMobile}
              />
              <FAQItem
                question="Can I use this if I'm an LLC or S-Corp?"
                answer="Yes. GigLedger works for sole proprietors, LLCs, and S-Corps. Track income and expenses the same way."
                isMobile={isMobile}
              />
              <FAQItem
                question="Does this replace QuickBooks?"
                answer="For simple gig tracking, yes. For complex business accounting with invoicing and payroll, QuickBooks is better."
                isMobile={isMobile}
              />
              <FAQItem
                question="Is this tax advice?"
                answer="No. GigLedger provides estimates only. Consult a tax professional for advice specific to your situation."
                isMobile={isMobile}
              />
              <FAQItem
                question="What if I have multiple income sources?"
                answer="Perfect use case. Track all your gigs, side hustles, and 1099 work in one place."
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
});
