import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';

interface SupportScreenProps {
  onNavigateBack?: () => void;
}

export function SupportScreen({ onNavigateBack }: SupportScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        {/* Back button */}
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Sign In</Text>
          </TouchableOpacity>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Bozzy Support</Text>
          <Text style={styles.heroSubtitle}>We're here to help. Find answers below or reach out directly.</Text>
        </View>

        {/* Contact card */}
        <View style={styles.contactCard}>
          <View style={styles.contactLeft}>
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactSubtitle}>Questions, bugs, or feedback — we'd love to hear from you.</Text>
          </View>
          <TouchableOpacity 
            style={styles.contactBtn}
            onPress={() => Linking.openURL('mailto:support@bozzygigs.com')}
            activeOpacity={0.8}
          >
            <Text style={styles.contactBtnText}>Email Us</Text>
          </TouchableOpacity>
        </View>

        {/* Quick links */}
        <Text style={styles.sectionTitle}>Resources</Text>
        <View style={styles.quickGrid}>
          <QuickCard
            icon="📄"
            title="Terms of Service"
            description="Read our terms and usage policies"
            href="/terms"
          />
          <QuickCard
            icon="🔒"
            title="Privacy Policy"
            description="How we handle and protect your data"
            href="/privacy"
          />
          <QuickCard
            icon="✉️"
            title="Email Support"
            description="support@bozzygigs.com"
            href="mailto:support@bozzygigs.com"
          />
          <QuickCard
            icon="🔑"
            title="Sign In"
            description="Go back to your Bozzy account"
            href="/signin"
          />
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          <FAQItem
            question="How do I add a gig or expense?"
            answer={`From the Dashboard, tap the "+ Add Gig" or "Add Expense" buttons at the top of the screen. You can log income from a performance, session, or any other music-related work, and track deductible expenses like gear, travel, or software.`}
          />
          <FAQItem
            question="How does Bozzy calculate my tax estimate?"
            answer={`Bozzy estimates your self-employment tax based on your net income (gross income minus deductible expenses). The tax summary shows federal, state, and SE tax estimates. These are informational only — Bozzy does not provide tax, legal, or accounting advice. Always consult a tax professional for your specific situation.`}
          />
          <FAQItem
            question="How do I export my data?"
            answer={`Tap the "Export" button on the Dashboard to download your income and expense data as a CSV or PDF. You can filter by date range before exporting. This is great for sharing with your accountant or for your own records.`}
          />
          <FAQItem
            question="How do I manage or cancel my subscription?"
            answer={`Go to the Subscription screen from the sidebar menu. From there you can upgrade, switch between monthly and yearly billing, or manage your subscription. To cancel, tap "Manage Subscription" which will take you to the Stripe billing portal where you can cancel at any time.`}
          />
          <FAQItem
            question="What is the difference between the free and Pro plan?"
            answer={`The free plan gives you access to basic gig and expense tracking. Bozzy Pro unlocks unlimited entries, mileage tracking, invoice generation, tax breakdowns, CSV and PDF exports, and contact management. Pro is available monthly ($7.99/mo) or yearly ($79.99/yr — 2 months free).`}
          />
          <FAQItem
            question="I forgot my password. How do I sign in?"
            answer={`You can sign in using a Magic Link — just enter your email and we'll send you a one-click sign-in link. No password needed. If you signed up with Google, use the "Continue with Google" button on the sign in screen.`}
          />
          <FAQItem
            question="Is my financial data safe?"
            answer={`Yes. Bozzy does not store payment information — all billing is handled securely by Stripe. Your income and expense data is stored securely and never sold to third parties. See our Privacy Policy for full details on how your data is handled.`}
          />
          <FAQItem
            question="I found a bug or something isn't working. What should I do?"
            answer={`Please email us at support@bozzygigs.com with a description of the issue, what device and OS you're using, and any screenshots if possible. We take bug reports seriously and aim to respond within 1–2 business days.`}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Bozzy is designed for musicians and gig-based workers in the United States.{'\n'}
            For legal or tax questions, please consult a qualified professional.{'\n\n'}
            <Text 
              style={styles.footerLink}
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.location.href = '/terms';
                }
              }}
            >
              Terms of Service
            </Text>
            {' · '}
            <Text 
              style={styles.footerLink}
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.location.href = '/privacy';
                }
              }}
            >
              Privacy Policy
            </Text>
            {' · '}
            <Text 
              style={styles.footerLink}
              onPress={() => Linking.openURL('mailto:support@bozzygigs.com')}
            >
              support@bozzygigs.com
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

interface QuickCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
}

function QuickCard({ icon, title, description, href }: QuickCardProps) {
  const handlePress = () => {
    if (href.startsWith('mailto:')) {
      Linking.openURL(href);
    } else if (Platform.OS === 'web') {
      window.location.href = href;
    }
  };

  return (
    <TouchableOpacity 
      style={styles.quickCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickDesc}>{description}</Text>
    </TouchableOpacity>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity 
        style={styles.faqQuestion}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Text style={[styles.faqChevron, isOpen && styles.faqChevronOpen]}>▼</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  contentContainer: {
    paddingBottom: 80,
  },
  content: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#5856d6',
    fontWeight: '500',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 48,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1d1d1f',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 17,
    color: '#6e6e73',
    lineHeight: 25.5,
  },

  // Contact card
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    marginBottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#e5e5e7',
    gap: 20,
  },
  contactLeft: {
    flex: 1,
    minWidth: 200,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 15,
    color: '#6e6e73',
  },
  contactBtn: {
    backgroundColor: '#5856d6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  contactBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Section title
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e7',
  },

  // Quick links grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 48,
  },
  quickCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e5e7',
    borderRadius: 12,
    padding: 20,
    flex: 1,
    minWidth: 200,
    maxWidth: '48%',
  },
  quickIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  quickDesc: {
    fontSize: 13,
    color: '#6e6e73',
    lineHeight: 18.2,
  },

  // FAQ
  faqList: {
    marginBottom: 48,
  },
  faqItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e7',
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    flex: 1,
  },
  faqChevron: {
    fontSize: 12,
    color: '#6e6e73',
    flexShrink: 0,
  },
  faqChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  faqAnswerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f2',
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  faqAnswer: {
    fontSize: 15,
    color: '#4a4a4f',
    lineHeight: 24.75,
  },

  // Footer note
  footerNote: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e7',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6e6e73',
    lineHeight: 20.8,
  },
  footerLink: {
    color: '#5856d6',
  },
});
