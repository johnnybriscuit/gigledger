import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { Text } from '../ui';
import { colors, spacingNum, radiusNum, typography } from '../styles/theme';

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  unlimited: boolean;
}

function UsageMeter({ label, used, limit, unlimited }: UsageMeterProps) {
  if (unlimited) return null;
  
  const percentage = (used / limit) * 100;
  const isHigh = percentage >= 80;
  
  return (
    <View style={styles.meterContainer}>
      <View style={styles.meterHeader}>
        <Text style={[styles.meterLabel, isHigh && styles.meterLabelWarning]}>
          {label}
        </Text>
        <Text style={[styles.meterValue, isHigh && styles.meterValueWarning]}>
          {used}/{limit}
        </Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View 
          style={[
            styles.progressBarFill,
            { width: `${Math.min(percentage, 100)}%` },
            isHigh ? styles.progressBarWarning : styles.progressBarNormal
          ]}
        />
      </View>
    </View>
  );
}

export function UsageWidget() {
  const { userId } = useUser();
  const { data: usage, isLoading, error } = useUsageLimits(userId || undefined);
  
  // Don't show widget if no userId, loading, error, no data, or user is Pro
  if (!userId || isLoading || error || !usage || usage.isPro) return null;
  
  const { limits, resetDate, isLegacyFree } = usage;
  
  const handleUpgradePress = () => {
    if (Platform.OS === 'web') {
      // On web, navigate to subscription page using window location
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'subscription');
      window.history.pushState({}, '', currentUrl.toString());
      // Dispatch a custom event to notify the app of tab change
      window.dispatchEvent(new CustomEvent('tabChange', { detail: 'subscription' }));
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          📊 Your Plan Usage {isLegacyFree && '(Legacy Free)'}
        </Text>
        <TouchableOpacity onPress={handleUpgradePress}>
          <Text style={styles.upgradeLink}>Upgrade →</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.metersContainer}>
        <UsageMeter 
          label="Gigs" 
          used={limits.gigs.used} 
          limit={limits.gigs.limit}
          unlimited={limits.gigs.unlimited}
        />
        
        <UsageMeter 
          label="Expenses" 
          used={limits.expenses.used} 
          limit={limits.expenses.limit}
          unlimited={limits.expenses.unlimited}
        />
        
        {!isLegacyFree && (
          <>
            <UsageMeter 
              label="Invoices" 
              used={limits.invoices.used} 
              limit={limits.invoices.limit}
              unlimited={limits.invoices.unlimited}
            />
            
            <UsageMeter 
              label="Exports" 
              used={limits.exports.used} 
              limit={limits.exports.limit}
              unlimited={limits.exports.unlimited}
            />
          </>
        )}
      </View>
      
      {!isLegacyFree && resetDate && (
        <View style={styles.resetContainer}>
          <Text style={styles.resetText}>
            Resets: {resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.upgradeButton}
        onPress={handleUpgradePress}
      >
        <Text style={styles.upgradeButtonText}>
          Upgrade to Pro - Unlimited Everything
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusNum.lg,
    padding: spacingNum[6],
    marginBottom: spacingNum[6],
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingNum[4],
  },
  title: {
    fontSize: 18,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.DEFAULT,
  },
  upgradeLink: {
    fontSize: 14,
    color: colors.brand.DEFAULT,
    fontWeight: typography.fontWeight.medium as any,
  },
  metersContainer: {
    gap: spacingNum[4],
  },
  meterContainer: {
    marginBottom: spacingNum[3],
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacingNum[2],
  },
  meterLabel: {
    fontSize: 14,
    color: colors.text.muted,
  },
  meterLabelWarning: {
    color: colors.warning.DEFAULT,
    fontWeight: typography.fontWeight.medium as any,
  },
  meterValue: {
    fontSize: 14,
    color: colors.text.subtle,
  },
  meterValueWarning: {
    color: colors.warning.DEFAULT,
    fontWeight: typography.fontWeight.medium as any,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border.muted,
    borderRadius: radiusNum.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radiusNum.full,
  },
  progressBarNormal: {
    backgroundColor: colors.brand.DEFAULT,
  },
  progressBarWarning: {
    backgroundColor: colors.warning.DEFAULT,
  },
  resetContainer: {
    marginTop: spacingNum[4],
    paddingTop: spacingNum[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  resetText: {
    fontSize: 14,
    color: colors.text.subtle,
  },
  upgradeButton: {
    marginTop: spacingNum[4],
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: spacingNum[3],
    paddingHorizontal: spacingNum[4],
    borderRadius: radiusNum.md,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: colors.brand.foreground,
    fontSize: 16,
    fontWeight: typography.fontWeight.medium as any,
  },
});
