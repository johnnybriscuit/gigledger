import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';

interface PrivacyScreenProps {
  onNavigateBack?: () => void;
}

export function PrivacyScreen({ onNavigateBack }: PrivacyScreenProps) {
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
        <Text style={styles.mainTitle}>GigLedger Privacy Policy</Text>
        <Text style={styles.effectiveDate}>Effective Date: Upon Acceptance</Text>
        <Text style={styles.effectiveDate}>Last Updated: January 9, 2026</Text>

        {/* Introduction */}
        <Text style={styles.paragraph}>
          GigLedger ("GigLedger," "we," "us," or "our") provides tools that help musicians and other gig-based workers track income, gigs, expenses, mileage, and related financial activity via our web and mobile applications (the "Service") and any websites we operate (the "Website").
        </Text>
        <Text style={styles.paragraph}>
          This Privacy Policy ("Policy") explains how we collect, use, disclose, and protect information in connection with the Service and Website, and the choices you have.
        </Text>
        <Text style={styles.paragraph}>
          By using the Service or Website, you agree to this Policy.
        </Text>
        <Text style={styles.importantText}>
          If you do not agree, please do not use GigLedger.
        </Text>
        <Text style={styles.paragraph}>
          If you have questions, contact us at gigledgers@gmail.com.
        </Text>

        {/* Table of Contents */}
        <View style={styles.tocContainer}>
          <Text style={styles.tocTitle}>Table of Contents</Text>
          <TouchableOpacity onPress={() => scrollToSection('section1')}>
            <Text style={styles.tocItem}>1. Children's Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section2')}>
            <Text style={styles.tocItem}>2. Types of Users</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section3')}>
            <Text style={styles.tocItem}>3. Information We Collect</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section4')}>
            <Text style={styles.tocItem}>4. How We Use Your Information</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section5')}>
            <Text style={styles.tocItem}>5. How We Share Your Information</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section6')}>
            <Text style={styles.tocItem}>6. Cookies & Similar Technologies</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section7')}>
            <Text style={styles.tocItem}>7. International Data Transfers</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section8')}>
            <Text style={styles.tocItem}>8. Data Retention</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section9')}>
            <Text style={styles.tocItem}>9. Your Rights & Choices</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section10')}>
            <Text style={styles.tocItem}>10. Security</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section11')}>
            <Text style={styles.tocItem}>11. Law Enforcement & Legal Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section12')}>
            <Text style={styles.tocItem}>12. State-Specific Notices</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section13')}>
            <Text style={styles.tocItem}>13. Changes to This Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollToSection('section14')}>
            <Text style={styles.tocItem}>14. Contact Us</Text>
          </TouchableOpacity>
        </View>

        {/* Section 1 */}
        <View nativeID="section1" style={styles.section}>
          <Text style={styles.sectionTitle}>1. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            GigLedger is intended for adults managing their own finances.
          </Text>
          <Text style={styles.paragraph}>
            The Service is not directed to children under 13 (or under 16 where applicable, such as the EEA/UK).
          </Text>
          <Text style={styles.paragraph}>
            We do not knowingly collect personal information from children under these ages.
          </Text>
          <Text style={styles.paragraph}>
            If we learn that we have collected personal information from a child, we will delete it.
          </Text>
          <Text style={styles.paragraph}>
            If you believe a child has provided us information, please contact gigledgers@gmail.com.
          </Text>
        </View>

        {/* Section 2 */}
        <View nativeID="section2" style={styles.section}>
          <Text style={styles.sectionTitle}>2. Types of Users</Text>
          <Text style={styles.paragraph}>This Policy applies to:</Text>
          
          <Text style={styles.subsectionTitle}>Subscribers & Free Users</Text>
          <Text style={styles.paragraph}>
            Individuals using GigLedger to track income/expenses, whether on a free plan or a paid subscription. For these users, GigLedger generally acts as a data controller of account and usage data you provide directly to us.
          </Text>

          <Text style={styles.subsectionTitle}>Site Visitors</Text>
          <Text style={styles.paragraph}>
            Individuals who visit our Website without creating an account. GigLedger acts as a data controller for this browsing data.
          </Text>

          <Text style={styles.paragraph}>
            If GigLedger is ever offered through an organization that manages accounts for its members, our role (controller/processor) will be defined in that separate agreement.
          </Text>
        </View>

        {/* Section 3 */}
        <View nativeID="section3" style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information We Collect</Text>
          <Text style={styles.paragraph}>
            The information we collect depends on how you use GigLedger.
          </Text>

          <Text style={styles.subsectionTitle}>3.1 Information You Provide</Text>
          
          <Text style={styles.bold}>Account Information</Text>
          <Text style={styles.paragraph}>
            Email address, password (hashed), name, and any profile details you choose to provide (e.g., state of residence, filing status, home base for mileage).
          </Text>

          <Text style={styles.bold}>Financial & Activity Data (User Data)</Text>
          <Text style={styles.paragraph}>
            Gigs, payers/clients, venues, dates, locations, amounts earned, payment methods, taxes withheld (if any), expenses, mileage logs, notes, attachments you upload, and any categories/tags you create.
          </Text>

          <Text style={styles.bold}>Communications</Text>
          <Text style={styles.paragraph}>
            Messages you send us (support requests, feedback, surveys, beta programs).
          </Text>

          <Text style={styles.subsectionTitle}>3.2 Information We Collect Automatically</Text>
          <Text style={styles.paragraph}>
            When you use the Service or visit the Website, we may automatically collect:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Device & Log Information</Text> – IP address, browser type, operating system, device identifiers, pages viewed, referring URLs, date/time stamps, and other usage logs.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Usage Data</Text> – Actions within the app (e.g., adding gigs, exporting data, navigation flows) to understand how features are used and improve the experience.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Approximate Location</Text> – Inferred from IP address, or more precise location if you explicitly enable location-based features (e.g., mileage or auto-filling location fields).
          </Text>

          <Text style={styles.subsectionTitle}>3.3 Information From Third Parties</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Authentication / Infrastructure Providers</Text> – e.g., identity, storage, or hosting services that support secure login and data storage (such as Supabase or similar providers).
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Payment Processors (if/when applicable)</Text> – Limited billing information and status (we do not store full payment card numbers on our own servers).
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Other Integrations</Text> – If you choose to connect third-party tools in the future (e.g., calendar, accounting, or tax software), we'll receive the data you authorize.
          </Text>
          <Text style={styles.paragraph}>
            We do not buy marketing lists or data brokers' profiles about you.
          </Text>
        </View>

        {/* Section 4 */}
        <View nativeID="section4" style={styles.section}>
          <Text style={styles.sectionTitle}>4. How We Use Your Information</Text>
          <Text style={styles.paragraph}>We use your information to:</Text>

          <Text style={styles.subsectionTitle}>Provide & Maintain the Service</Text>
          <Text style={styles.listItem}>• Create and manage your account.</Text>
          <Text style={styles.listItem}>• Store your gigs, expenses, mileage, and related financial records.</Text>
          <Text style={styles.listItem}>• Generate summaries, dashboards, and exports (e.g., CSV) for your own use.</Text>

          <Text style={styles.subsectionTitle}>Improve the Experience</Text>
          <Text style={styles.listItem}>• Understand how users interact with features.</Text>
          <Text style={styles.listItem}>• Fix bugs, enhance performance, and develop new functionality.</Text>
          <Text style={styles.listItem}>• Personalize certain views (e.g., recent payers, default date ranges).</Text>

          <Text style={styles.subsectionTitle}>Security & Abuse Prevention</Text>
          <Text style={styles.listItem}>• Detect, prevent, and respond to fraud, abuse, security incidents, or violations of our Terms.</Text>

          <Text style={styles.subsectionTitle}>Communications</Text>
          <Text style={styles.listItem}>• Send transactional messages (account changes, security alerts, feature updates).</Text>
          <Text style={styles.listItem}>• Send optional product tips or announcements (you can opt out of non-essential marketing emails).</Text>

          <Text style={styles.subsectionTitle}>Analytics & Aggregated Insights</Text>
          <Text style={styles.listItem}>• Analyze anonymized or aggregated usage patterns (e.g., feature adoption).</Text>
          <Text style={styles.listItem}>• Improve how we serve musicians and gig workers overall.</Text>
          <Text style={styles.paragraph}>
            Any aggregated data will not identify you personally.
          </Text>

          <Text style={styles.subsectionTitle}>Legal & Compliance</Text>
          <Text style={styles.listItem}>• Comply with applicable law, legal process, and enforce our Terms of Service.</Text>
          <Text style={styles.listItem}>• Respond to lawful requests by public authorities where required.</Text>
          <Text style={styles.paragraph}>
            We do not use your data for automated decision-making that produces legal or similarly significant effects about you.
          </Text>
        </View>

        {/* Section 5 */}
        <View nativeID="section5" style={styles.section}>
          <Text style={styles.sectionTitle}>5. How We Share Your Information</Text>
          <Text style={styles.importantText}>
            We do not sell your personal information.
          </Text>
          <Text style={styles.paragraph}>
            We may share information in these limited circumstances:
          </Text>

          <Text style={styles.subsectionTitle}>Service Providers</Text>
          <Text style={styles.paragraph}>
            Hosting, database, authentication, analytics, email delivery, customer support, logging, and security vendors.
          </Text>
          <Text style={styles.paragraph}>
            They may only process data on our behalf and under contracts that require confidentiality and appropriate safeguards.
          </Text>

          <Text style={styles.subsectionTitle}>Integrations You Enable</Text>
          <Text style={styles.paragraph}>
            If you choose to export or sync GigLedger data to other tools (e.g., tax software, spreadsheet, accounting software), we'll share data as needed to complete that action, under your direction.
          </Text>

          <Text style={styles.subsectionTitle}>Business Transfers</Text>
          <Text style={styles.paragraph}>
            In connection with a merger, acquisition, financing, or sale of assets, your information may be transferred with appropriate safeguards and notice where required.
          </Text>

          <Text style={styles.subsectionTitle}>Legal Requirements & Protection</Text>
          <Text style={styles.listItem}>• To comply with law, regulation, subpoena, or valid legal request.</Text>
          <Text style={styles.listItem}>• To protect GigLedger, our users, or the public from harm or fraudulent/illegal activity.</Text>

          <Text style={styles.subsectionTitle}>Aggregated & De-Identified Data</Text>
          <Text style={styles.paragraph}>
            We may share insights or statistics that do not identify individuals (e.g., "X% of users track mileage"), for research, marketing, or service improvement.
          </Text>
          <Text style={styles.paragraph}>
            We do not allow third parties to use your personal information for their own independent marketing without your consent.
          </Text>
        </View>

        {/* Section 6 */}
        <View nativeID="section6" style={styles.section}>
          <Text style={styles.sectionTitle}>6. Cookies & Similar Technologies</Text>
          <Text style={styles.paragraph}>
            We use cookies and similar technologies on the Website and, where applicable, within the web app to:
          </Text>
          <Text style={styles.listItem}>• Keep you signed in and maintain sessions.</Text>
          <Text style={styles.listItem}>• Remember preferences.</Text>
          <Text style={styles.listItem}>• Analyze usage and performance.</Text>
          <Text style={styles.listItem}>• Enhance security.</Text>
          <Text style={styles.paragraph}>
            You can manage cookies via your browser settings and (where implemented) our cookie preferences banner. Disabling certain cookies may affect Service functionality.
          </Text>
        </View>

        {/* Section 7 */}
        <View nativeID="section7" style={styles.section}>
          <Text style={styles.sectionTitle}>7. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            GigLedger is operated from the United States. If you access the Service from outside the U.S., your information may be transferred to and processed in the U.S. or other countries where our service providers operate.
          </Text>
          <Text style={styles.paragraph}>
            Where required by law (e.g., for EEA/UK/Swiss users, if applicable), we will rely on appropriate safeguards such as Standard Contractual Clauses for cross-border transfers.
          </Text>
        </View>

        {/* Section 8 */}
        <View nativeID="section8" style={styles.section}>
          <Text style={styles.sectionTitle}>8. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain personal information for as long as reasonably necessary to:
          </Text>
          <Text style={styles.listItem}>• Provide the Service to you;</Text>
          <Text style={styles.listItem}>• Support your account settings and exports;</Text>
          <Text style={styles.listItem}>• Comply with legal, accounting, or reporting obligations;</Text>
          <Text style={styles.listItem}>• Resolve disputes and enforce agreements.</Text>
          <Text style={styles.paragraph}>
            When you close your account or request deletion:
          </Text>
          <Text style={styles.listItem}>• We will delete or anonymize your personal information within a reasonable period, except where we are legally required (or have compelling legitimate interests) to retain certain records (e.g., logs for security, legal compliance).</Text>
          <Text style={styles.listItem}>• We may keep backups for a limited time before they cycle out.</Text>
          <Text style={styles.listItem}>• You are responsible for exporting any records you wish to keep before deletion.</Text>
        </View>

        {/* Section 9 */}
        <View nativeID="section9" style={styles.section}>
          <Text style={styles.sectionTitle}>9. Your Rights & Choices</Text>
          <Text style={styles.paragraph}>
            Depending on your location and applicable law, you may have the right to:
          </Text>
          <Text style={styles.listItem}>• Access the personal information we hold about you;</Text>
          <Text style={styles.listItem}>• Correct inaccurate or incomplete information;</Text>
          <Text style={styles.listItem}>• Request deletion of your information (subject to legal exceptions);</Text>
          <Text style={styles.listItem}>• Object to or restrict certain processing;</Text>
          <Text style={styles.listItem}>• Request a copy of your data in a portable format;</Text>
          <Text style={styles.listItem}>• Opt out of non-essential marketing communications.</Text>
          <Text style={styles.paragraph}>
            You can exercise many of these controls directly in your account settings (e.g., updating profile info, exports, email preferences). For other requests, contact us at gigledgers@gmail.com. We may verify your identity before acting on your request.
          </Text>
          <Text style={styles.paragraph}>
            We will not discriminate against you for exercising your privacy rights.
          </Text>
        </View>

        {/* Section 10 */}
        <View nativeID="section10" style={styles.section}>
          <Text style={styles.sectionTitle}>10. Security</Text>
          <Text style={styles.paragraph}>
            We use technical and organizational measures designed to protect your information, such as:
          </Text>
          <Text style={styles.listItem}>• Encrypted connections (HTTPS) for data in transit;</Text>
          <Text style={styles.listItem}>• Reputable hosting and database providers;</Text>
          <Text style={styles.listItem}>• Access controls and role-based permissions;</Text>
          <Text style={styles.listItem}>• Logging and monitoring for suspicious activity.</Text>
          <Text style={styles.paragraph}>
            However, no system is 100% secure. If you believe your account or data has been compromised, please contact us immediately at gigledgers@gmail.com.
          </Text>
        </View>

        {/* Section 11 */}
        <View nativeID="section11" style={styles.section}>
          <Text style={styles.sectionTitle}>11. Law Enforcement & Legal Requests</Text>
          <Text style={styles.paragraph}>
            We may disclose information if reasonably necessary to:
          </Text>
          <Text style={styles.listItem}>• Comply with applicable law, regulation, legal process, or governmental request;</Text>
          <Text style={styles.listItem}>• Enforce our Terms of Service;</Text>
          <Text style={styles.listItem}>• Protect the rights, property, or safety of GigLedger, our users, or others.</Text>
          <Text style={styles.paragraph}>
            Where legally permitted and feasible, we will notify you before disclosing your information in response to legal process.
          </Text>
        </View>

        {/* Section 12 */}
        <View nativeID="section12" style={styles.section}>
          <Text style={styles.sectionTitle}>12. State-Specific Notices (e.g., California / Nevada)</Text>
          
          <Text style={styles.subsectionTitle}>California Residents (CCPA/CPRA)</Text>
          <Text style={styles.paragraph}>
            If applicable law grants you specific rights (e.g., access, deletion, information about categories of information collected and disclosed), you may exercise them by contacting gigledgers@gmail.com. GigLedger does not sell personal information as defined under California law.
          </Text>

          <Text style={styles.subsectionTitle}>Nevada Residents</Text>
          <Text style={styles.paragraph}>
            We do not sell "covered information" as defined under Nevada law. If you have questions, contact us.
          </Text>

          <Text style={styles.paragraph}>
            If additional state-specific rules apply in the future, we will update this section accordingly.
          </Text>
        </View>

        {/* Section 13 */}
        <View nativeID="section13" style={styles.section}>
          <Text style={styles.sectionTitle}>13. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Policy from time to time.
          </Text>
          <Text style={styles.paragraph}>
            Material changes will be posted on the Website or in the app, and the "Last Updated" date will be revised.
          </Text>
          <Text style={styles.paragraph}>
            Where required by law, we will provide additional notice and/or obtain consent.
          </Text>
          <Text style={styles.paragraph}>
            Please review this Policy periodically. Your continued use of GigLedger after changes become effective means you accept the updated Policy.
          </Text>
        </View>

        {/* Section 14 */}
        <View nativeID="section14" style={styles.section}>
          <Text style={styles.sectionTitle}>14. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Policy or our data practices, please contact:
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>GigLedger</Text>
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:gigledgers@gmail.com?subject=GigLedger Privacy Policy')}>
            <Text style={styles.emailLink}>Email: gigledgers@gmail.com</Text>
          </TouchableOpacity>
          <Text style={styles.paragraph}>
            (Additional contact details can be added once finalized.)
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
    fontSize: 15,
    lineHeight: 24,
    color: '#111827',
    marginBottom: 8,
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
