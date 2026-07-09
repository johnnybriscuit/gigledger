import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';
import { useGigs } from '../../hooks/useGigs';
import { supabase } from '../../lib/supabase';

interface AICoachCardProps {
  className?: string;
  onAddGig?: () => void;
}

interface CoachTipCache {
  tip: string;
  date: string;
  fallback: boolean;
  category?: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1');
}

function isZeroGigTip(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("haven't logged") ||
    lower.includes('first gig') ||
    lower.includes('no gigs yet') ||
    lower.includes('start by adding') ||
    lower.includes('log your first') ||
    lower.includes("haven't started") ||
    lower.includes('get started by logging')
  );
}

function detectCategory(tipText: string): string {
  const lower = tipText.toLowerCase();
  if (lower.includes('tax') || lower.includes('quarter')) return 'TAX';
  if (lower.includes('retirement') || lower.includes('sep') || lower.includes('ira') || lower.includes('401')) return 'RETIREMENT';
  if (lower.includes('emergency')) return 'EMERGENCY';
  if (lower.includes('debt') || lower.includes('loan') || lower.includes('interest')) return 'DEBT';
  if (lower.includes('gig') || lower.includes('income') || lower.includes('earn')) return 'INCOME';
  return 'GOAL';
}

export function AICoachCard({ className, onAddGig }: AICoachCardProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();
  const ytdStart = `${new Date().getFullYear()}-01-01`;
  const { data: gigs } = useGigs({ startDate: ytdStart });
  const paidGigs = useMemo(() => (gigs || []).filter(g => g.paid), [gigs]);
  // undefined = still loading; number = loaded (even if 0)
  const gigCount = gigs !== undefined ? paidGigs.length : undefined;
  const allGigCount = gigs !== undefined ? gigs.length : undefined;

  const [tip, setTip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsExpanded(prev => !prev);
  };

  const today = new Date().toISOString().split('T')[0];

  // Load/validate cache — re-runs when gigs load or gigCount changes
  useEffect(() => {
    if (gigCount === undefined) return; // wait for gigs to finish loading

    if (Platform.OS === 'web') {
      const cacheKey = `bozzy_coach_tip_v2_${today}_g${gigCount}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed: CoachTipCache = JSON.parse(cached);
          if (!parsed.fallback) {
            const isStale = gigCount > 0 && isZeroGigTip(parsed.tip);
            if (!isStale) {
              setTip(parsed.tip);
              setIsFallback(false);
              if (parsed.category) setLastCategory(parsed.category);
              return;
            }
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }
    }

    if (gigCount === 0) return; // zero-gig users get static message, no AI call needed
    if (buckets.length > 0) {
      fetchTip();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets.length, gigCount]);

  const fetchTip = async () => {
    if (buckets.length === 0) return;
    if (gigs === undefined) return; // don't call AI until gigs have loaded

    setIsLoading(true);
    try {
      // Use component-level paidGigs (already filtered)
      const ytdIncome = paidGigs.reduce((sum, g) => sum + (g.gross_amount || 0), 0);
      const count = paidGigs.length;
      const avgGigAmount = count > 0 ? ytdIncome / count : 0;

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
        buckets: buckets.map(b => ({
          name: b.name,
          bucketType: b.bucket_type,
          percentage: b.percentage,
          ytdBalance: ytdTotals.find(t => t.bucket_id === b.id)?.total || 0,
          goalAmount: b.goal_amount,
        })),
        gigCount: count,
        avgGigAmount,
        nextQuarterlyDate: nextQuarterly.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysUntilQuarterly,
        lastAdviceCategory: lastCategory || undefined,
      };

      console.log('[AICoachCard] Sending to AI coach:', { ytdIncome, gigCount: count, avgGigAmount, bucketsCount: requestBody.buckets.length });

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No response from AI coach');
      }

      setTip(data.tip);
      setIsFallback(data.fallback || false);

      const category = detectCategory(data.tip);
      setLastCategory(category);

      // Cache only real (non-fallback) responses (key includes gigCount to avoid stale context)
      if (Platform.OS === 'web' && !data.fallback) {
        const cacheKey = `bozzy_coach_tip_v2_${today}_g${count}`;
        const cache: CoachTipCache = {
          tip: data.tip,
          date: today,
          fallback: false,
          category,
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
      const count = gigCount ?? 0;
      localStorage.removeItem(`bozzy_coach_tip_v2_${today}_g${count}`);
      localStorage.removeItem(`bozzy_coach_tip_v2_${today}`); // clear legacy key format
    }
    setTip(null);
    fetchTip();
  };

  // Don't show if no buckets configured
  if (buckets.length === 0) {
    return null;
  }

  const zeroStateMessage = (() => {
    if (gigs === undefined || allGigCount === undefined) return null;
    if (allGigCount === 0) {
      return "Welcome to Bozzy! The first thing to do is log a gig. Once you add your first paid gig, I'll give you personalized advice on taxes, savings goals, and maximizing your income.";
    }
    if (gigCount === 0) {
      return "Great — your first gig is logged! Mark it as paid once you receive payment and I'll show you exactly where your money goes across your tax, savings, and spending buckets.";
    }
    return null;
  })();

  // Zero or unpaid-only state: show static contextual message
  if (zeroStateMessage !== null) {
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
        <View style={styles.collapsedRow}>
          <Text style={styles.emoji}>🤖</Text>
          <View style={styles.collapsedTextWrapper}>
            <Text style={[styles.collapsedLabel, { color: colors.text.muted }]}>
              Your Financial Coach
            </Text>
          </View>
        </View>
        <View style={styles.expandedContent}>
          <View style={[styles.expandedDivider, { backgroundColor: colors.border.muted }]} />
          <View style={styles.tipWrapper}>
            <Text style={{ color: colors.text.DEFAULT, fontSize: 15, lineHeight: 23 }}>
              {zeroStateMessage}
            </Text>
          </View>
          {allGigCount === 0 && onAddGig && (
            <TouchableOpacity
              onPress={onAddGig}
              style={styles.addGigButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.addGigButtonText, { color: colors.brand.DEFAULT }]}>
                + Add Gig →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // First sentence of tip for the collapsed preview
  const firstSentence = tip
    ? (tip.match(/^[^.!?]+[.!?]/) ?? [tip])[0]
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleToggle}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface.elevated,
          borderColor: colors.border.DEFAULT,
        },
      ]}
    >
      {/* ── COLLAPSED ROW (always visible) ── */}
      <View style={styles.collapsedRow}>
        <Text style={styles.emoji}>🤖</Text>
        <View style={styles.collapsedTextWrapper}>
          <Text style={[styles.collapsedLabel, { color: colors.text.muted }]}>
            Your Financial Coach
          </Text>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.brand.DEFAULT}
              style={styles.inlineSpinner}
            />
          ) : !isExpanded && firstSentence ? (
            <Text
              style={[styles.collapsedPreview, { color: colors.text.DEFAULT }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {stripMarkdown(firstSentence)}
            </Text>
          ) : !isExpanded ? (
            <Text style={[styles.collapsedPreview, { color: colors.text.subtle }]}>
              Tap to get your personalized tip
            </Text>
          ) : null}
        </View>
        <Text style={[styles.chevron, { color: colors.text.subtle }]}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </View>

      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && tip && (
        <View style={styles.expandedContent}>
          <View style={[styles.expandedDivider, { backgroundColor: colors.border.muted }]} />
          <View style={styles.tipWrapper}>
            <Markdown
              style={{
                body: {
                  color: colors.text.DEFAULT,
                  fontSize: 15,
                  lineHeight: 23,
                  fontFamily: 'System',
                },
                strong: {
                  fontWeight: '700',
                  color: colors.text.DEFAULT,
                },
                em: {
                  fontStyle: 'italic',
                  color: colors.text.DEFAULT,
                },
                paragraph: {
                  marginTop: 0,
                  marginBottom: 0,
                },
              }}
            >
              {tip}
            </Markdown>
          </View>
          <View style={styles.footer}>
            <Text style={[styles.timestamp, { color: colors.text.subtle }]}>
              Updated today
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                handleRefresh();
              }}
            >
              <Text style={[styles.refreshButton, { color: colors.brand.DEFAULT }]}>
                Refresh ↺
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 20,
  },
  collapsedTextWrapper: {
    flex: 1,
    gap: 2,
  },
  collapsedLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  collapsedPreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  inlineSpinner: {
    alignSelf: 'flex-start',
  },
  chevron: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 4,
  },
  expandedDivider: {
    height: 1,
    marginVertical: 12,
  },
  tipWrapper: {
    marginBottom: 12,
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
    fontSize: 13,
    fontWeight: '500',
  },
  addGigButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  addGigButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
