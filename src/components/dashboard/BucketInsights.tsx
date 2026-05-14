/**
 * Bucket Insights - Shows smart insights and progress for buckets
 * Encourages users with progress updates and helpful tips
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';

export function BucketInsights() {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();

  if (buckets.length === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const insights: Array<{ icon: string; message: string; type: 'success' | 'info' | 'tip' }> = [];

  // Emergency fund progress
  const emergencyBucket = buckets.find(b => b.bucket_type === 'emergency_fund');
  if (emergencyBucket?.goal_amount) {
    const balance = ytdTotals.find(t => t.bucket_id === emergencyBucket.id)?.total || 0;
    const progress = (balance / emergencyBucket.goal_amount) * 100;
    
    if (progress >= 100) {
      insights.push({
        icon: '🎉',
        message: `Emergency fund goal reached! You have ${formatCurrency(balance)} saved.`,
        type: 'success',
      });
    } else if (progress >= 75) {
      insights.push({
        icon: '🔥',
        message: `${progress.toFixed(0)}% to your emergency fund goal! Almost there!`,
        type: 'success',
      });
    } else if (progress >= 50) {
      insights.push({
        icon: '💪',
        message: `Halfway to your emergency fund goal! ${formatCurrency(balance)} saved so far.`,
        type: 'info',
      });
    } else if (progress >= 25) {
      insights.push({
        icon: '🌱',
        message: `${progress.toFixed(0)}% to your emergency fund goal. Keep it up!`,
        type: 'info',
      });
    }
  }

  // Debt payoff timeline
  const debtBucket = buckets.find(b => b.bucket_type === 'debt');
  if (debtBucket?.goal_amount && debtBucket.goal_amount > 0) {
    const monthlyContribution = ytdTotals.find(t => t.bucket_id === debtBucket.id)?.total || 0;
    if (monthlyContribution > 0) {
      const monthsToPayoff = Math.ceil(debtBucket.goal_amount / (monthlyContribution / 12));
      if (monthsToPayoff <= 12) {
        insights.push({
          icon: '🎯',
          message: `At this rate, debt paid off in ${monthsToPayoff} months!`,
          type: 'success',
        });
      } else {
        const years = Math.floor(monthsToPayoff / 12);
        const months = monthsToPayoff % 12;
        insights.push({
          icon: '📊',
          message: `Debt payoff timeline: ${years}y ${months}m at current rate`,
          type: 'info',
        });
      }
    }
  }

  // Retirement savings milestone
  const retirementBucket = buckets.find(b => b.bucket_type === 'retirement');
  if (retirementBucket) {
    const balance = ytdTotals.find(t => t.bucket_id === retirementBucket.id)?.total || 0;
    if (balance >= 10000) {
      insights.push({
        icon: '🚀',
        message: `${formatCurrency(balance)} in retirement savings! Future you is grateful.`,
        type: 'success',
      });
    } else if (balance >= 5000) {
      insights.push({
        icon: '📈',
        message: `${formatCurrency(balance)} saved for retirement. Building wealth!`,
        type: 'info',
      });
    } else if (balance >= 1000) {
      insights.push({
        icon: '✨',
        message: `First ${formatCurrency(balance)} in retirement! Great start.`,
        type: 'info',
      });
    }
  }

  // Smart tips based on bucket setup
  if (buckets.length >= 5) {
    insights.push({
      icon: '💡',
      message: 'Pro tip: Review your bucket percentages quarterly as income changes.',
      type: 'tip',
    });
  }

  // Tax savings milestone
  const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
  const stateTax = buckets.find(b => b.bucket_type === 'state_tax');
  if (federalTax || stateTax) {
    const federalBalance = ytdTotals.find(t => t.bucket_id === federalTax?.id)?.total || 0;
    const stateBalance = ytdTotals.find(t => t.bucket_id === stateTax?.id)?.total || 0;
    const totalTax = federalBalance + stateBalance;
    
    if (totalTax >= 5000) {
      insights.push({
        icon: '🛡️',
        message: `${formatCurrency(totalTax)} set aside for taxes. No surprises in April!`,
        type: 'success',
      });
    }
  }

  // Don't show if no insights
  if (insights.length === 0) {
    return null;
  }

  // Show max 2 insights
  const displayInsights = insights.slice(0, 2);

  return (
    <View style={styles.container}>
      {displayInsights.map((insight, index) => (
        <View
          key={index}
          style={[
            styles.insightCard,
            {
              backgroundColor: insight.type === 'success'
                ? colors.success.muted
                : insight.type === 'tip'
                ? colors.warning.muted
                : colors.brand.muted,
              borderColor: insight.type === 'success'
                ? colors.success.DEFAULT
                : insight.type === 'tip'
                ? colors.warning.DEFAULT
                : colors.brand.DEFAULT,
            },
          ]}
        >
          <Text style={styles.icon}>{insight.icon}</Text>
          <Text style={[styles.message, { color: colors.text.DEFAULT }]}>
            {insight.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
