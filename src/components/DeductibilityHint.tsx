import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DeductibilityHintProps {
  category: string;
}

const DEDUCTIBILITY_HINTS: Record<string, { hint: string; details: string }> = {
  'Meals & Entertainment': {
    hint: 'Usually 50% deductible for business meals',
    details: 'Add an internal flag for 50% deductibility calculation (for display purposes only, not official tax filing). Prompt user to note who attended and business purpose in Notes field.',
  },
  'Travel': {
    hint: 'Fully deductible if overnight for business',
    details: 'Encourage adding destination and business purpose in Notes. Mileage to/from shows is tracked separately in Mileage tab.',
  },
  'Lodging': {
    hint: 'Deductible for overnight business trips',
    details: 'Add business purpose and trip dates in Notes for tax documentation.',
  },
  'Equipment/Gear': {
    hint: 'Large purchases may need to be depreciated',
    details: 'Items over $2,500 might be considered assets and depreciated over time, not fully deducted in one year. Consult a tax professional for items over this threshold.',
  },
  'Supplies': {
    hint: 'Fully deductible if used for business',
    details: 'Strings, drumsticks, reeds, cables, small accessories are typically 100% deductible.',
  },
  'Software/Subscriptions': {
    hint: 'Deductible if used for business purposes',
    details: 'If used for both personal and business, only deduct the business percentage.',
  },
  'Marketing/Promotion': {
    hint: 'Advertising and promotion costs are deductible',
    details: 'Website hosting, social media ads, promotional materials, business cards, etc.',
  },
  'Professional Fees': {
    hint: 'Agent fees, booking fees, union dues are deductible',
    details: 'Session musician fees paid to others should be tracked as contractor payments.',
  },
  'Education/Training': {
    hint: 'Deductible if it improves your current skills',
    details: 'Must improve skills for your current work, not qualify you for a new career. Music lessons to improve as a performer = deductible.',
  },
  'Rent/Studio': {
    hint: 'Deductible if space is used for business',
    details: 'Home studio? Only deduct the business-use percentage of your space.',
  },
  'Other': {
    hint: 'Keep detailed notes for tax documentation',
    details: 'Describe the expense and why it\'s business-related in the Notes field.',
  },
};

export function DeductibilityHint({ category }: DeductibilityHintProps) {
  const [expanded, setExpanded] = useState(false);
  const hintData = DEDUCTIBILITY_HINTS[category];

  if (!hintData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.hintRow}>
        <Text style={styles.icon}>ℹ️</Text>
        <Text style={styles.hintText}>{hintData.hint}</Text>
      </View>
      
      {hintData.details && (
        <>
          <TouchableOpacity 
            onPress={() => setExpanded(!expanded)}
            style={styles.learnMoreButton}
          >
            <Text style={styles.learnMoreText}>
              {expanded ? '▼ Show less' : '▶ Learn more'}
            </Text>
          </TouchableOpacity>
          
          {expanded && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsText}>{hintData.details}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  icon: {
    fontSize: 16,
    marginTop: 1,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
    lineHeight: 18,
  },
  learnMoreButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  detailsText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
});
