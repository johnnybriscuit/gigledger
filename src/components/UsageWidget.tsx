// @ts-nocheck
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { useEntitlements } from '../hooks/useEntitlements';
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
  const entitlements = useEntitlements();
  
  if (entitlements.isLoading || entitlements.isPro) return null;
  
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
          📊 Your Plan Usage {entitlements.isLegacyFree && '(Legacy Free)'}
        </Text>
        <TouchableOpacity onPress={handleUpgradePress}>
          <Text style={styles.upgradeLink}>Upgrade →</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.metersContainer}>
        <UsageMeter 
          label="Gigs" 
          used={entitlements.usage.gigsCount} 
          limit={entitlements.limits.gigsMax ?? 0}
          unlimited={entitlements.limits.gigsMax === null}
        />
        
        <UsageMeter 
          label="Expenses" 
          used={entitlements.usage.expensesCount} 
          limit={entitlements.limits.expensesMax ?? 0}
          unlimited={entitlements.limits.expensesMax === null}
        />
        
        {!entitlements.isLegacyFree && (
          <>
            <UsageMeter 
              label="Invoices" 
              used={entitlements.usage.invoicesCreatedCount} 
              limit={entitlements.limits.invoicesMax ?? 0}
              unlimited={entitlements.limits.invoicesMax === null}
            />
            
            <UsageMeter 
              label="Exports" 
              used={entitlements.usage.exportsCount} 
              limit={entitlements.limits.exportsMax ?? 0}
              unlimited={entitlements.limits.exportsMax === null}
            />
          </>
        )}
      </View>
      
      {!entitlements.isLegacyFree && entitlements.resetDate && (
        <View style={styles.resetContainer}>
          <Text style={styles.resetText}>
            Resets: {entitlements.resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
