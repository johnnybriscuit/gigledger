import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export function DeductionInfoCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)}
        style={styles.header}
        activeOpacity={0.7}
      >
        <Text style={styles.headerIcon}>📘</Text>
        <Text style={styles.headerText}>How Deductions Work — 1 min read</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            A tax deduction reduces your taxable income. If you earned $50,000 and had $10,000 in business expenses, you only pay taxes on $40,000.
          </Text>
          
          <Text style={styles.sectionTitle}>To qualify, an expense must be:</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Ordinary</Text> (common in your line of work)</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Necessary</Text> (helpful for your business)</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Documented</Text> (keep receipts!)</Text>
          </View>
          
          <Text style={styles.sectionTitle}>Common examples for musicians/freelancers:</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>✓ Gear & equipment (guitars, cameras, laptops)</Text>
            <Text style={styles.listItem}>✓ Supplies (strings, film, software subscriptions)</Text>
            <Text style={styles.listItem}>✓ Travel to gigs (mileage, lodging, flights)</Text>
            <Text style={styles.listItem}>✓ Marketing (website, business cards, ads)</Text>
            <Text style={styles.listItem}>✓ Professional fees (agent commissions, union dues)</Text>
            <Text style={styles.listItem}>✓ Education (lessons, workshops to improve your skills)</Text>
          </View>
          
          <Text style={styles.sectionTitle}>Special rules:</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Meals with clients/band:</Text> Usually 50% deductible</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Home studio:</Text> Only the business-use portion</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>Mixed-use items:</Text> Only deduct the business percentage</Text>
          </View>
          
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⚠️ Bozzy helps you track, but always consult a tax professional for your specific situation. This is not tax advice.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5BE3',
  },
  chevron: {
    fontSize: 18,
    color: '#2D5BE3',
    fontWeight: '400',
    flexShrink: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(45,91,227,0.15)',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1A1A1A',
    marginBottom: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 6,
  },
  list: {
    marginBottom: 12,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 2,
  },
  bold: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  disclaimer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#92400e',
  },
});
