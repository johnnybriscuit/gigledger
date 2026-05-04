/**
 * TaxBadge Component
 * Shows tax treatment indicator for gigs (W-2, 1099, Mixed)
 * with appropriate styling and tooltips
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { getNextQuarterlyDueDate, formatTaxDate } from '../../utils/taxDates';

interface TaxBadgeProps {
  taxTreatment: string | null | undefined;
  effectiveRate: number; // As decimal (e.g., 0.141 for 14.1%)
  gigAmount: number; // Net income for the gig
  onMixedPress?: () => void; // Callback when mixed badge is pressed
}

export function TaxBadge({ 
  taxTreatment, 
  effectiveRate, 
  gigAmount,
  onMixedPress,
}: TaxBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Normalize tax treatment
  const treatment = taxTreatment?.toLowerCase() || null;

  // Determine badge type
  const isW2 = treatment === 'w2' || treatment === 'w-2' || treatment === 'payroll';
  const is1099 = treatment === '1099' || 
                 treatment === 'contractor' || 
                 treatment === 'contractor_1099' ||
                 treatment === '1099/contractor';
  const isMixed = treatment === 'other' || treatment === 'mixed';

  // Calculate set aside amount and percentage
  const setAsideRate = effectiveRate || 0.141; // Default to 14.1% if not available
  const setAsideAmount = gigAmount * setAsideRate;
  const setAsidePercent = Math.round(setAsideRate * 1000) / 10; // Round to 1 decimal

  // Get next quarterly due date
  const nextDueDate = getNextQuarterlyDueDate();
  const formattedDueDate = formatTaxDate(nextDueDate);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Tooltip content
  let tooltipText = '';
  if (is1099) {
    tooltipText = `This is freelance/gig income. Set aside ${setAsidePercent}% (~${formatCurrency(setAsideAmount)}) from this payment for estimated taxes. Your next quarterly payment is due ${formattedDueDate}.`;
  } else if (isW2) {
    tooltipText = 'Your employer withholds taxes on this income automatically. No estimated tax payment needed for this gig.';
  } else if (isMixed) {
    tooltipText = 'Update this payer\'s tax treatment in Contacts for accurate tax estimates.';
  }

  // Handle press
  const handlePress = () => {
    if (isMixed && onMixedPress) {
      onMixedPress();
    } else {
      setShowTooltip(!showTooltip);
    }
  };

  const handleLongPress = () => {
    setShowTooltip(!showTooltip);
  };

  // Render badge based on type
  if (isW2) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        style={styles.container}
      >
        <View style={[styles.badge, styles.badgeW2]}>
          <Text style={[styles.badgeText, styles.badgeTextW2]}>
            W-2 · Taxes withheld
          </Text>
        </View>
        {showTooltip && (
          <View style={[styles.tooltip, styles.tooltipW2]}>
            <Text style={styles.tooltipText}>{tooltipText}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (is1099) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        style={styles.container}
      >
        <View style={[styles.badge, styles.badge1099]}>
          <Text style={[styles.badgeText, styles.badgeText1099]}>
            1099 · Set aside {setAsidePercent}%
          </Text>
        </View>
        <Text style={styles.amountText}>~{formatCurrency(setAsideAmount)}</Text>
        {showTooltip && (
          <View style={[styles.tooltip, styles.tooltip1099]}>
            <Text style={styles.tooltipText}>{tooltipText}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (isMixed) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        style={styles.container}
      >
        <View style={[styles.badge, styles.badgeMixed]}>
          <Text style={[styles.badgeText, styles.badgeTextMixed]}>
            Mixed · Update tax type
          </Text>
        </View>
        {showTooltip && (
          <View style={[styles.tooltip, styles.tooltipMixed]}>
            <Text style={styles.tooltipText}>{tooltipText}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Default: treat as 1099 (no payer or null tax_treatment)
  return (
    <View style={styles.container}>
      <Text style={styles.defaultText}>
        set aside <Text style={styles.defaultAmount}>{formatCurrency(setAsideAmount)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeW2: {
    backgroundColor: '#E0E7FF',
  },
  badge1099: {
    backgroundColor: '#FEF3C7',
  },
  badgeMixed: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  badgeTextW2: {
    color: '#3730A3',
  },
  badgeText1099: {
    color: '#92400E',
  },
  badgeTextMixed: {
    color: '#6B7280',
  },
  amountText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  defaultText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  defaultAmount: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#6B7280',
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    minWidth: 200,
    maxWidth: 300,
  },
  tooltipW2: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tooltip1099: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tooltipMixed: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
  },
});
