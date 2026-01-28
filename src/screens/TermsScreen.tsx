import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';

interface TermsScreenProps {
  onNavigateBack?: () => void;
}

export function TermsScreen({ onNavigateBack }: TermsScreenProps) {
  const scrollToSection = (sectionId: string) => {
    // On web, we can use anchor links
    if (Platform.OS === 'web') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        {/* Back button */}
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Sign In</Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <Text style={styles.mainTitle}>Bozzy Terms of Service</Text>
        <Text style={styles.effectiveDate}>Effective Date: Upon Acceptance</Text>
        <Text style={styles.effectiveDate}>Last Updated: January 9, 2026</Text>

        {/* Introduction */}
        <Text style={styles.paragraph}>
          These Bozzy Terms of Service ("Terms") are a legal agreement between you ("you" or "User") and Bozzy ("Bozzy," "we," "us," or "our") governing your access to and use of:
        </Text>
        <Text style={styles.paragraph}>
          The Bozzy web application, mobile application(s), and related tools for tracking income, gigs, payers, expenses, mileage, and tax estimates (collectively, the "Service"); and
        </Text>
        <Text style={styles.paragraph}>
          Any websites we operate, including the website/URL where you access the Service (the "Website").
        </Text>
        <Text style={styles.paragraph}>
          Bozzy is designed primarily for musicians and other gig-based workers in the United States to help organize income & expenses and generate informational summaries and exports for tax preparation. Bozzy does not hold client funds, process payments, or provide tax, legal, or accounting advice.
        </Text>
        <Text style={styles.paragraph}>
          By accessing or using the Service or Website, you acknowledge that you have read, understand, and agree to be bound by these Terms.
        </Text>
        <Text style={styles.importantText}>
          If you do not agree to these Terms, do not use Bozzy.
        </Text>
        <Text style={styles.importantText}>
          Important: These Terms include a binding arbitration provision and class action waiver (see Section 13).
        </Text>
        <Text style={styles.paragraph}>
          We may update these Terms from time to time. When we do, we'll change the "Last Updated" date above. Updated Terms apply on a going-forward basis. Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
        </Text>

        {/* Table of Contents */}
        <View style={styles.tocContainer}>
          <Text style={styles.tocTitle}>Table of Contents</Text>
          <TouchableOpacity onPress={() => scrollToSection('section1')}>
            <Text style={styles.tocItem}>1. Eligibility & Scope</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section2')}>
            <Text style={styles.tocItem}>2. Account Registration & Security</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section3')}>
            <Text style={styles.tocItem}>3. Our Services & Proprietary Rights</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section4')}>
            <Text style={styles.tocItem}>4. User Data, Content & Feedback</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section5')}>
            <Text style={styles.tocItem}>5. Estimates, No Tax / Legal / Accounting Advice</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section6')}>
            <Text style={styles.tocItem}>6. License, Acceptable Use & Termination</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section7')}>
            <Text style={styles.tocItem}>7. Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section8')}>
            <Text style={styles.tocItem}>8. Third-Party Services & Integrations</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section9')}>
            <Text style={styles.tocItem}>9. Subscriptions, Billing, Cancellation & Data Retention</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section10')}>
            <Text style={styles.tocItem}>10. Disclaimers & Limitation of Liability</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section11')}>
            <Text style={styles.tocItem}>11. Indemnification</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section12')}>
            <Text style={styles.tocItem}>12. Modifications to the Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section13')}>
            <Text style={styles.tocItem}>13. Mandatory Arbitration & Class Action Waiver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section14')}>
            <Text style={styles.tocItem}>14. Governing Law</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section15')}>
            <Text style={styles.tocItem}>15. General</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section16')}>
            <Text style={styles.tocItem}>16. Questions</Text>
          </TouchableOpacity>
        </View>

        {/* Section 1 */}
        <View nativeID="section1" style={styles.section}>
          <Text style={styles.sectionTitle}>1. Eligibility & Scope</Text>
          <Text style={styles.paragraph}>
            You must be at least 18 years old and able to form a binding contract to use the Service.
          </Text>
          <Text style={styles.paragraph}>
            You may use the Service only in compliance with these Terms and all applicable laws.
          </Text>
          <Text style={styles.paragraph}>
            If Bozzy has previously suspended or terminated your account, you are not permitted to create another account or use the Service.
          </Text>
          <Text style={styles.paragraph}>We describe users as:</Text>
          <Text style={styles.listItem}>• Site Visitors – people who visit our marketing pages.</Text>
          <Text style={styles.listItem}>• Free Users – users on a free or trial plan (if offered).</Text>
          <Text style={styles.listItem}>• Subscribers – users or organizations on a paid plan.</Text>
          <Text style={styles.paragraph}>
            Collectively, we refer to all of the above as "Users."
          </Text>
        </View>

        {/* Section 2 */}
        <View nativeID="section2" style={styles.section}>
          <Text style={styles.sectionTitle}>2. Account Registration & Security</Text>
          
          <Text style={styles.subsectionTitle}>2.1 Registration</Text>
          <Text style={styles.paragraph}>
            To use most features, you must create a Bozzy account with a valid email and password (or supported auth method). You agree to:
          </Text>
          <Text style={styles.listItem}>• Provide accurate, current, complete information.</Text>
          <Text style={styles.listItem}>• Keep your information up to date.</Text>
          <Text style={styles.paragraph}>
            Each account is unique to a single user. Do not share login credentials.
          </Text>

          <Text style={styles.subsectionTitle}>2.2 Responsibility for Your Account</Text>
          <Text style={styles.paragraph}>You are responsible for:</Text>
          <Text style={styles.listItem}>• All activity that occurs under your account, whether authorized or not.</Text>
          <Text style={styles.listItem}>• Maintaining the confidentiality of your password and login.</Text>
          <Text style={styles.paragraph}>
            If you suspect unauthorized access, email us promptly at support@bozzygigs.com. We may require information to verify your identity before restoring or modifying access.
          </Text>
          <Text style={styles.paragraph}>
            Bozzy is not liable for losses arising from unauthorized use of your account. You may be liable for losses Bozzy or others incur due to such use.
          </Text>
        </View>

        {/* Section 3 */}
        <View nativeID="section3" style={styles.section}>
          <Text style={styles.sectionTitle}>3. Our Services & Proprietary Rights</Text>
          <Text style={styles.paragraph}>Bozzy provides tools that help you:</Text>
          <Text style={styles.listItem}>• Track gigs, payers/clients, income, tips, per diems, expenses, and mileage.</Text>
          <Text style={styles.listItem}>• View dashboards and summaries.</Text>
          <Text style={styles.listItem}>• Generate CSV or similar exports suitable for sharing with a tax professional or importing into supported tax products.</Text>
          <Text style={styles.paragraph}>
            The Service, Website, software, designs, text, graphics, logos, trademarks, and all related intellectual property ("Bozzy Content") are owned or licensed by Bozzy and protected by applicable laws.
          </Text>
          <Text style={styles.paragraph}>
            Except for the limited license in Section 6, you do not acquire any ownership rights in the Service or Bozzy Content. You agree not to:
          </Text>
          <Text style={styles.listItem}>• Copy, modify, distribute, reverse engineer, or create derivative works of the Service;</Text>
          <Text style={styles.listItem}>• Remove or alter copyright, trademark, or proprietary notices.</Text>
        </View>

        {/* Section 4 */}
        <View nativeID="section4" style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Data, Content & Feedback</Text>
          
          <Text style={styles.subsectionTitle}>4.1 User Data</Text>
          <Text style={styles.paragraph}>
            You may submit information about your gigs, payers, income, expenses, mileage, and other financial/activity data (collectively, "User Data"). As between you and Bozzy:
          </Text>
          <Text style={styles.listItem}>• You retain ownership of your User Data.</Text>
          <Text style={styles.paragraph}>
            You grant Bozzy a non-exclusive, worldwide, royalty-free license to host, store, process, display, and use User Data solely to:
          </Text>
          <Text style={styles.listItem}>• Provide, maintain, secure, and improve the Service;</Text>
          <Text style={styles.listItem}>• Generate your reports and exports;</Text>
          <Text style={styles.listItem}>• Troubleshoot issues and provide support;</Text>
          <Text style={styles.listItem}>• Comply with legal obligations.</Text>
          <Text style={styles.paragraph}>
            You are responsible for the accuracy of your User Data.
          </Text>

          <Text style={styles.subsectionTitle}>4.2 Feedback</Text>
          <Text style={styles.paragraph}>
            If you provide ideas, suggestions, or feedback ("Feedback"), you grant Bozzy a perpetual, irrevocable, sublicensable, worldwide, royalty-free license to use that Feedback for any purpose without obligation or compensation.
          </Text>

          <Text style={styles.subsectionTitle}>4.3 Responsibility</Text>
          <Text style={styles.paragraph}>You represent and warrant that:</Text>
          <Text style={styles.listItem}>• You have all rights necessary to submit User Data and Feedback.</Text>
          <Text style={styles.listItem}>• Your submissions do not infringe or violate any third-party rights or laws.</Text>
          <Text style={styles.listItem}>• You understand that dashboards, summaries, and exports depend on the accuracy of your inputs.</Text>
        </View>

        {/* Section 5 */}
        <View nativeID="section5" style={styles.section}>
          <Text style={styles.sectionTitle}>5. Estimates, No Tax / Legal / Accounting Advice</Text>
          <Text style={styles.paragraph}>Bozzy may display estimated:</Text>
          <Text style={styles.listItem}>• Net income after expenses,</Text>
          <Text style={styles.listItem}>• Suggested tax set-aside amounts,</Text>
          <Text style={styles.listItem}>• Effective tax rates or similar metrics.</Text>
          <Text style={styles.paragraph}>
            These are automated calculations based on the information you enter and generalized assumptions. They:
          </Text>
          <Text style={styles.listItem}>• Do not account for all variables (e.g., full tax brackets, deductions, credits, local taxes, changing laws, your entire financial situation).</Text>
          <Text style={styles.listItem}>• Do not constitute tax, legal, accounting, or financial advice.</Text>
          <Text style={styles.listItem}>• Are not a substitute for working with a CPA, tax professional, or attorney.</Text>
          <Text style={styles.paragraph}>You are solely responsible for:</Text>
          <Text style={styles.listItem}>• Verifying all numbers,</Text>
          <Text style={styles.listItem}>• Complying with federal, state, and local tax rules,</Text>
          <Text style={styles.listItem}>• Any decisions you make using information from Bozzy.</Text>
          <Text style={styles.paragraph}>
            Bozzy does not guarantee that any export file will be compatible with, accepted by, or sufficient for any third-party software, tax authority, or professional.
          </Text>
        </View>

        {/* Section 6 */}
        <View nativeID="section6" style={styles.section}>
          <Text style={styles.sectionTitle}>6. License, Acceptable Use & Termination</Text>
          
          <Text style={styles.subsectionTitle}>6.1 Your License</Text>
          <Text style={styles.paragraph}>
            Subject to these Terms, Bozzy grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal or internal business purposes.
          </Text>

          <Text style={styles.subsectionTitle}>6.2 Acceptable Use</Text>
          <Text style={styles.paragraph}>You agree not to:</Text>
          <Text style={styles.listItem}>• Access non-public parts of the Service or infrastructure.</Text>
          <Text style={styles.listItem}>• Bypass or interfere with security features.</Text>
          <Text style={styles.listItem}>• Use bots or automated means that overload or abuse the Service.</Text>
          <Text style={styles.listItem}>• Upload malicious code or attempt to disrupt or attack the Service.</Text>
          <Text style={styles.listItem}>• Use the Service for unlawful, fraudulent, defamatory, harassing, hateful, or infringing activity.</Text>
          <Text style={styles.listItem}>• Share other people's sensitive personal data without proper consent.</Text>
          <Text style={styles.listItem}>• Misrepresent your identity or affiliation.</Text>
          <Text style={styles.paragraph}>
            We may suspend or terminate accounts, remove content, or take other appropriate action if we believe you've violated these Terms, threatened the integrity of the Service, or engaged in unlawful behavior.
          </Text>
        </View>

        {/* Section 7 */}
        <View nativeID="section7" style={styles.section}>
          <Text style={styles.sectionTitle}>7. Privacy</Text>
          <Text style={styles.paragraph}>
            Your use of Bozzy is subject to our Privacy Policy, describing how we collect, use, and protect your information. By using the Service, you consent to our data practices as described there.
          </Text>
        </View>

        {/* Section 8 */}
        <View nativeID="section8" style={styles.section}>
          <Text style={styles.sectionTitle}>8. Third-Party Services & Integrations</Text>
          <Text style={styles.paragraph}>
            Bozzy may integrate with or rely on third-party services (for example: hosting providers, analytics tools, authentication, file storage, payment platforms for future features, etc.).
          </Text>
          <Text style={styles.paragraph}>
            Those services are provided by third parties under their own terms and privacy policies.
          </Text>
          <Text style={styles.paragraph}>
            Bozzy is not responsible for the content, policies, or failures of third-party services.
          </Text>
          <Text style={styles.paragraph}>
            Any future payment functionality will be provided through regulated third-party processors; Bozzy itself does not hold customer funds.
          </Text>
        </View>

        {/* Section 9 */}
        <View nativeID="section9" style={styles.section}>
          <Text style={styles.sectionTitle}>9. Subscriptions, Billing, Cancellation & Data Retention</Text>
          <Text style={styles.subsectionTitle}>9.1 Subscriptions & Pricing</Text>
          <Text style={styles.paragraph}>
            Bozzy offers the following plans:
          </Text>
          <Text style={styles.listItem}>• Free Plan: Up to 20 gigs and up to 20 expenses per account.</Text>
          <Text style={styles.listItem}>• Pro Monthly: $5/month for unlimited gigs and expenses.</Text>
          <Text style={styles.listItem}>• Pro Annual: $50/year for unlimited gigs and expenses.</Text>
          <Text style={styles.paragraph}>
            Plan details, features, and billing terms are shown at signup or within the app and are incorporated into these Terms.
          </Text>

          <Text style={styles.subsectionTitle}>9.2 Renewals & Cancellation</Text>
          <Text style={styles.paragraph}>
            Subscriptions renew automatically at the end of each billing period unless canceled.
          </Text>
          <Text style={styles.paragraph}>
            You can cancel from within your account (or by contacting support as specified in the app).
          </Text>
          <Text style={styles.paragraph}>
            Cancellation stops future charges but does not entitle you to refunds for the current period, except where required by law.
          </Text>
          <Text style={styles.paragraph}>
            Access continues until the end of the current paid term.
          </Text>

          <Text style={styles.subsectionTitle}>9.3 Data Retention</Text>
          <Text style={styles.paragraph}>Upon cancellation or expiration:</Text>
          <Text style={styles.listItem}>• We may keep your account in a limited/disabled state for a retention period of 90 days to allow exports.</Text>
          <Text style={styles.listItem}>• After that period, we may permanently delete your data from active systems, subject to legal retention obligations.</Text>
          <Text style={styles.listItem}>• You are responsible for exporting and backing up your records.</Text>
        </View>

        {/* Section 10 */}
        <View nativeID="section10" style={styles.section}>
          <Text style={styles.sectionTitle}>10. Disclaimers & Limitation of Liability</Text>
          
          <Text style={styles.subsectionTitle}>10.1 "As-Is"</Text>
          <Text style={styles.paragraph}>
            The Service and all content are provided "AS IS" and "AS AVAILABLE" without warranties of any kind, whether express, implied, or statutory, including but not limited to warranties of:
          </Text>
          <Text style={styles.listItem}>• Accuracy,</Text>
          <Text style={styles.listItem}>• Merchantability,</Text>
          <Text style={styles.listItem}>• Fitness for a particular purpose,</Text>
          <Text style={styles.listItem}>• Non-infringement,</Text>
          <Text style={styles.listItem}>• Availability or reliability.</Text>
          <Text style={styles.paragraph}>We do not warrant that:</Text>
          <Text style={styles.listItem}>• The Service will be uninterrupted, secure, or error-free;</Text>
          <Text style={styles.listItem}>• Defects will be corrected;</Text>
          <Text style={styles.listItem}>• Estimates or calculations will be accurate or suitable for your situation.</Text>

          <Text style={styles.subsectionTitle}>10.2 Limitation of Liability</Text>
          <Text style={styles.paragraph}>To the maximum extent permitted by law:</Text>
          <Text style={styles.paragraph}>
            Bozzy and its owners, employees, and affiliates will not be liable for any indirect, incidental, consequential, special, or punitive damages, or loss of profits, revenue, data, or goodwill, arising out of or related to your use of (or inability to use) the Service.
          </Text>
          <Text style={styles.paragraph}>
            Our total aggregate liability for any claim relating to the Service will not exceed the greater of:
          </Text>
          <Text style={styles.listItem}>• The amount you paid to Bozzy for the Service in the 3 months preceding the event giving rise to the claim; or</Text>
          <Text style={styles.listItem}>• $100 if you are on a free plan.</Text>
          <Text style={styles.paragraph}>
            Some jurisdictions don't allow certain exclusions/limitations, so parts of this section may not apply to you.
          </Text>
        </View>

        {/* Section 11 */}
        <View nativeID="section11" style={styles.section}>
          <Text style={styles.sectionTitle}>11. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify and hold harmless Bozzy and its owners, representatives, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising out of or related to:
          </Text>
          <Text style={styles.listItem}>• Your use of the Service,</Text>
          <Text style={styles.listItem}>• Your User Data,</Text>
          <Text style={styles.listItem}>• Your violation of these Terms or applicable law,</Text>
          <Text style={styles.listItem}>• Your infringement or violation of any third-party rights.</Text>
          <Text style={styles.paragraph}>
            We may assume exclusive defense and control of any matter subject to indemnification, and you agree to cooperate with us.
          </Text>
        </View>

        {/* Section 12 */}
        <View nativeID="section12" style={styles.section}>
          <Text style={styles.sectionTitle}>12. Modifications to the Service</Text>
          <Text style={styles.paragraph}>
            We may add, modify, or discontinue features or the Service (in whole or in part) at any time, temporarily or permanently. Where reasonably possible, we'll provide notice of material changes.
          </Text>
          <Text style={styles.paragraph}>
            We are not liable for any modification, suspension, or discontinuation of the Service.
          </Text>
        </View>

        {/* Section 13 */}
        <View nativeID="section13" style={styles.section}>
          <Text style={styles.sectionTitle}>13. Mandatory Arbitration & Class Action Waiver</Text>
          <Text style={styles.importantText}>
            Please read carefully. This affects your legal rights.
          </Text>
          <Text style={styles.paragraph}>To help resolve issues efficiently:</Text>
          <Text style={styles.paragraph}>
            You agree to first contact us at support@bozzygigs.com so we can try to resolve any dispute informally.
          </Text>
          <Text style={styles.paragraph}>
            If we cannot resolve it informally, any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Service will be resolved by binding arbitration (not in court), except that:
          </Text>
          <Text style={styles.listItem}>• You or Bozzy may bring an individual action in small claims court; and</Text>
          <Text style={styles.listItem}>• You or Bozzy may seek injunctive relief in court for intellectual property or misuse issues.</Text>
          <Text style={styles.paragraph}>Arbitration will:</Text>
          <Text style={styles.listItem}>• Be conducted by a recognized arbitration provider (e.g., JAMS or AAA) under its applicable rules;</Text>
          <Text style={styles.listItem}>• Take place by video/phone or in a reasonably convenient location in the United States;</Text>
          <Text style={styles.listItem}>• Be conducted on an individual basis only.</Text>
          <Text style={styles.subsectionTitle}>No Class Actions.</Text>
          <Text style={styles.paragraph}>
            You and Bozzy each waive any right to bring claims as a plaintiff or class member in any purported class, collective, consolidated, or representative action.
          </Text>
          <Text style={styles.paragraph}>
            If the class action waiver is found unenforceable as to a particular claim, that claim must proceed in court, not arbitration. This section survives termination of these Terms.
          </Text>
          <Text style={styles.paragraph}>
            (For the actual production version, have your attorney fine-tune provider, venue, and consumer-law specifics.)
          </Text>
        </View>

        {/* Section 14 */}
        <View nativeID="section14" style={styles.section}>
          <Text style={styles.sectionTitle}>14. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of the State of Tennessee, without regard to conflict-of-law rules, except where overridden by applicable consumer protection law.
          </Text>
          <Text style={styles.paragraph}>
            Subject to the arbitration clause, any permitted court proceedings shall be brought in state or federal courts located in Tennessee, and you consent to their jurisdiction.
          </Text>
        </View>

        {/* Section 15 */}
        <View nativeID="section15" style={styles.section}>
          <Text style={styles.sectionTitle}>15. General</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Entire Agreement.</Text> These Terms (plus any referenced policies) are the entire agreement between you and Bozzy regarding the Service.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>No Waiver.</Text> Failure to enforce a provision is not a waiver.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Severability.</Text> If any provision is found invalid or unenforceable, the rest remain in effect.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Assignment.</Text> You may not assign these Terms. Bozzy may assign them in connection with a merger, acquisition, or sale of assets.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>No Agency.</Text> Nothing creates a partnership, joint venture, or employment relationship.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Survival.</Text> Provisions that by nature should survive (e.g., limitations, arbitration, IP, indemnity) will survive termination.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Notices.</Text> We may send notices via email or in-app. You can contact us at: support@bozzygigs.com.
          </Text>
        </View>

        {/* Section 16 */}
        <View nativeID="section16" style={styles.section}>
          <Text style={styles.sectionTitle}>16. Questions</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms, contact us at:
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:support@bozzygigs.com?subject=Bozzy Terms of Service')}>
            <Text style={styles.emailLink}>support@bozzygigs.com</Text>
          </TouchableOpacity>
          <Text style={styles.paragraph}>
            Subject line: "Bozzy Terms of Service"
          </Text>
        </View>

        {/* Footer spacing */}
        <View style={styles.footer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingVertical: 40,
  },
  content: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 24,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  effectiveDate: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  importantText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 16,
  },
  tocContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    marginVertical: 32,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tocTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  tocItem: {
    fontSize: 14,
    lineHeight: 28,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 16,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '600',
  },
  emailLink: {
    fontSize: 15,
    color: '#2563eb',
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  footer: {
    height: 40,
  },
});
