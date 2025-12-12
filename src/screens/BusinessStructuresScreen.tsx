import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface BusinessStructuresScreenProps {
  onNavigateBack?: () => void;
}

export function BusinessStructuresScreen({ onNavigateBack }: BusinessStructuresScreenProps) {
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
        <Text style={styles.subtitle}>A guide for musicians and gig workers</Text>

        {/* Introduction */}
        <Text style={styles.paragraph}>
          Your business structure affects how you're taxed and what paperwork you need to file. Here's what each option means for musicians and gig workers:
        </Text>

        {/* Individual / Sole Proprietor */}
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🎸</Text>
          <Text style={styles.sectionTitle}>Individual / Sole Proprietor</Text>
          
          <Text style={styles.sectionSubtitle}>What it is:</Text>
          <Text style={styles.paragraph}>
            You're operating as yourself—no separate legal entity. This is the default for most freelance musicians.
          </Text>

          <Text style={styles.sectionSubtitle}>Tax treatment:</Text>
          <Text style={styles.paragraph}>
            • Report income on Schedule C (Form 1040){'\n'}
            • Pay self-employment tax (Social Security + Medicare) on net profit{'\n'}
            • Quarterly estimated tax payments typically required{'\n'}
            • Can deduct business expenses (gear, travel, home studio, etc.)
          </Text>

          <Text style={styles.sectionSubtitle}>Best for:</Text>
          <Text style={styles.paragraph}>
            Most gigging musicians, session players, and solo performers. Simple to set up, no extra paperwork beyond your personal tax return.
          </Text>

          <Text style={styles.sectionSubtitle}>GigLedger calculates:</Text>
          <Text style={styles.paragraph}>
            Federal income tax, state tax, and self-employment tax on your gig income.
          </Text>
        </View>

        {/* Single-Member LLC */}
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📝</Text>
          <Text style={styles.sectionTitle}>Single-Member LLC</Text>
          
          <Text style={styles.sectionSubtitle}>What it is:</Text>
          <Text style={styles.paragraph}>
            A Limited Liability Company with one owner. Provides legal separation between you and your business, but for tax purposes, the IRS treats it the same as a sole proprietorship (a "disregarded entity").
          </Text>

          <Text style={styles.sectionSubtitle}>Tax treatment:</Text>
          <Text style={styles.paragraph}>
            • Same as Individual/Sole Proprietor by default{'\n'}
            • Report income on Schedule C{'\n'}
            • Pay self-employment tax on net profit{'\n'}
            • Can elect S-Corp taxation (see below)
          </Text>

          <Text style={styles.sectionSubtitle}>Best for:</Text>
          <Text style={styles.paragraph}>
            Musicians who want liability protection (e.g., you teach lessons, run a studio, or have employees) but don't need S-Corp tax treatment yet.
          </Text>

          <Text style={styles.sectionSubtitle}>GigLedger calculates:</Text>
          <Text style={styles.paragraph}>
            Federal income tax, state tax, and self-employment tax—same as Individual.
          </Text>
        </View>

        {/* LLC taxed as S-Corp */}
        <View style={styles.section}>
          <View style={styles.proHeader}>
            <Text style={styles.sectionIcon}>🏦</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>Pro Only</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>LLC taxed as S-Corp</Text>
          
          <Text style={styles.sectionSubtitle}>What it is:</Text>
          <Text style={styles.paragraph}>
            An LLC that has elected to be taxed as an S-Corporation. You become an employee of your own company and pay yourself a "reasonable salary" via payroll. Any remaining profit can be taken as distributions, which aren't subject to self-employment tax.
          </Text>

          <Text style={styles.sectionSubtitle}>Tax treatment:</Text>
          <Text style={styles.paragraph}>
            • You must run payroll and pay yourself W-2 wages{'\n'}
            • Salary is subject to payroll taxes (Social Security + Medicare){'\n'}
            • Distributions beyond salary avoid self-employment tax{'\n'}
            • File Form 1120-S (S-Corp tax return) annually{'\n'}
            • More complex bookkeeping and compliance requirements
          </Text>

          <Text style={styles.sectionSubtitle}>Best for:</Text>
          <Text style={styles.paragraph}>
            Established musicians with consistent income (typically $60k+ net profit) who can benefit from the self-employment tax savings. Requires working with a CPA or payroll service.
          </Text>

          <Text style={styles.sectionSubtitle}>GigLedger tracks:</Text>
          <Text style={styles.paragraph}>
            Your gig income and expenses for record-keeping, but does NOT calculate self-employment tax or payroll taxes. You'll handle payroll separately with your accountant or payroll provider.
          </Text>

          <Text style={styles.importantNote}>
            ℹ️ S-Corp mode requires GigLedger Pro. In this mode, GigLedger tracks your income and expenses but does not calculate payroll or distribution taxes. Consult your tax professional for S-Corp compliance.
          </Text>
        </View>

        {/* Multi-Member LLC / Partnership */}
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>👥</Text>
          <Text style={styles.sectionTitle}>Multi-Member LLC / Partnership</Text>
          
          <Text style={styles.sectionSubtitle}>What it is:</Text>
          <Text style={styles.paragraph}>
            An LLC with two or more owners, or a formal partnership. The IRS treats this as a partnership for tax purposes.
          </Text>

          <Text style={styles.sectionSubtitle}>Tax treatment:</Text>
          <Text style={styles.paragraph}>
            • File Form 1065 (Partnership Return) annually{'\n'}
            • Each partner receives a K-1 showing their share of income/loss{'\n'}
            • Partners report their K-1 income on their personal returns{'\n'}
            • Each partner pays self-employment tax on their share{'\n'}
            • Partnership doesn't pay tax itself (pass-through entity)
          </Text>

          <Text style={styles.sectionSubtitle}>Best for:</Text>
          <Text style={styles.paragraph}>
            Bands, co-owned studios, or music businesses with multiple owners who share profits and decision-making.
          </Text>

          <Text style={styles.sectionSubtitle}>GigLedger tracks:</Text>
          <Text style={styles.paragraph}>
            The partnership's income and expenses for record-keeping. Self-employment tax is NOT calculated because each partner's tax situation depends on their K-1 allocation and other income sources.
          </Text>

          <Text style={styles.importantNote}>
            ℹ️ For partnerships, GigLedger tracks income and expenses only. You'll need to work with your CPA to prepare Form 1065 and allocate income among partners.
          </Text>
        </View>

        {/* Choosing the Right Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Which Structure Should You Choose?</Text>
          
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Start simple:</Text> Most musicians should begin as Individual/Sole Proprietor. It's the easiest to manage and requires no extra legal setup.
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Consider an LLC when:</Text> You want liability protection (teaching students, running a studio, hiring contractors) or plan to grow your music business.
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Explore S-Corp when:</Text> Your net profit consistently exceeds $60k–$80k annually and you're ready for more complex bookkeeping and payroll. The self-employment tax savings can be significant, but so are the compliance costs.
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Use Partnership/Multi-Member LLC when:</Text> You're co-owning a business with bandmates or partners and need to formally split income and expenses.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            <Text style={styles.bold}>Important:</Text> GigLedger provides estimates only and does not offer tax or legal advice. Business structure decisions have significant legal and tax implications. Always consult with a qualified CPA, tax advisor, or attorney before making changes to your business structure.
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
});
