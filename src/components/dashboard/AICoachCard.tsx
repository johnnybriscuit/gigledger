import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';
import { useGigs } from '../../hooks/useGigs';
import { supabase } from '../../lib/supabase';

interface AICoachCardProps {
  className?: string;
}

interface CoachTipCache {
  tip: string;
  date: string;
  fallback: boolean;
}

export function AICoachCard({ className }: AICoachCardProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();
  const { data: gigs } = useGigs();
  
  const [tip, setTip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Load cached tip on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      const cacheKey = `bozzy_coach_tip_${today}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed: CoachTipCache = JSON.parse(cached);
          setTip(parsed.tip);
          setIsFallback(parsed.fallback);
          return;
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }
    }
    
    // No cache, fetch new tip
    if (buckets.length > 0) {
      fetchTip();
    }
  }, [buckets.length]);

  const fetchTip = async () => {
    if (buckets.length === 0) return;

    setIsLoading(true);
    try {
      // Calculate data for the prompt
      const paidGigs = (gigs || []).filter(g => g.paid);
      const ytdIncome = paidGigs.reduce((sum, g) => sum + g.net_amount, 0);
      const gigCount = paidGigs.length;
      const avgGigAmount = gigCount > 0 ? ytdIncome / gigCount : 0;

      const taxBucket = buckets.find(b => b.bucket_type === 'federal_tax');
      const retirementBucket = buckets.find(b => b.bucket_type === 'retirement');
      const emergencyBucket = buckets.find(b => b.bucket_type === 'emergency_fund');
      const debtBucket = buckets.find(b => b.bucket_type === 'debt');

      const taxBalance = ytdTotals.find(t => t.bucket_id === taxBucket?.id)?.total || 0;
      const retirementBalance = ytdTotals.find(t => t.bucket_id === retirementBucket?.id)?.total || 0;
      const emergencyBalance = ytdTotals.find(t => t.bucket_id === emergencyBucket?.id)?.total || 0;
      const debtBalance = ytdTotals.find(t => t.bucket_id === debtBucket?.id)?.total || 0;

      // Estimate tax owed (simplified)
      const estimatedTaxOwed = ytdIncome * ((taxBucket?.percentage || 20) / 100);

      // Calculate next quarterly date
      const now = new Date();
      const year = now.getFullYear();
      const quarterlyDates = [
        new Date(year, 3, 15), // April 15
        new Date(year, 5, 15), // June 15
        new Date(year, 8, 15), // September 15
        new Date(year + 1, 0, 15), // January 15 next year
      ];
      const nextQuarterly = quarterlyDates.find(d => d > now) || quarterlyDates[0];
      const daysUntilQuarterly = Math.ceil((nextQuarterly.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const requestBody = {
        ytdIncome,
        taxBucketBalance: taxBalance,
        estimatedTaxOwed,
        retirementBalance,
        retirementPercentage: retirementBucket?.percentage || 0,
        emergencyBalance,
        emergencyGoal: emergencyBucket?.goal_amount || 5000,
        debtBalance: debtBucket ? debtBalance : undefined,
        debtName: debtBucket?.goal_name || debtBucket?.name,
        nextQuarterlyDate: nextQuarterly.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysUntilQuarterly,
        gigCount,
        avgGigAmount,
      };

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tip');
      }

      const data = await response.json();
      setTip(data.tip);
      setIsFallback(data.fallback || false);

      // Cache the tip
      if (Platform.OS === 'web') {
        const cacheKey = `bozzy_coach_tip_${today}`;
        const cache: CoachTipCache = {
          tip: data.tip,
          date: today,
          fallback: data.fallback || false,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('[AICoachCard] Error fetching tip:', error);
      const fallbackTip = "Set up a separate bank account named 'Tax Money' and transfer your tax allocation every time you get paid.";
      setTip(fallbackTip);
      setIsFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (Platform.OS === 'web') {
      const cacheKey = `bozzy_coach_tip_${today}`;
      localStorage.removeItem(cacheKey);
    }
    setTip(null);
    fetchTip();
  };

  // Don't show if no buckets configured
  if (buckets.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { 
          backgroundColor: colors.surface.elevated,
          borderColor: colors.border.DEFAULT,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>🤖</Text>
        <Text style={[styles.title, { color: colors.text.DEFAULT }]}>
          Your Financial Coach
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
          <Text style={[styles.loadingText, { color: colors.text.muted }]}>
            Analyzing your finances...
          </Text>
        </View>
      ) : tip ? (
        <>
          <Text style={[styles.tipText, { color: colors.text.DEFAULT }]}>
            {tip}
          </Text>
          <View style={styles.footer}>
            <Text style={[styles.timestamp, { color: colors.text.subtle }]}>
              Updated just now
            </Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={[styles.refreshButton, { color: colors.brand.DEFAULT }]}>
                Refresh ↺
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
  },
  refreshButton: {
    fontSize: 14,
    fontWeight: '500',
  },
});
