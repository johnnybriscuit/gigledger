import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, radius, typography } from '../styles/theme';
import { useRateBenchmarks } from '../hooks/useRateBenchmarks';
import type { RateBenchmark } from '../types/allocation';

interface RateGuideScreenProps {
  onBack: () => void;
}

const GROUPS: { label: string; types: string[] }[] = [
  {
    label: 'Music & Performance',
    types: [
      'Session drumming',
      'Studio recording (general)',
      'Live performance (club/bar)',
      'Wedding band (per musician)',
      'Music production',
      'Voice over',
    ],
  },
  {
    label: 'Creative & Design',
    types: ['Graphic design', 'Photography', 'Videography', 'Copywriting'],
  },
  {
    label: 'Tech & Consulting',
    types: [
      'Freelance web development',
      'GA4/Analytics consulting',
      'Social media management',
    ],
  },
  {
    label: 'Education',
    types: ['Tutoring/Teaching'],
  },
  {
    label: 'Events',
    types: ['Corporate event'],
  },
];

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function BenchmarkRow({ benchmark }: { benchmark: RateBenchmark }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{benchmark.gig_type}</Text>
        <Text style={styles.rowRate}>
          {fmt(benchmark.rate_low)}–{fmt(benchmark.rate_high)} / {benchmark.rate_unit}
        </Text>
        {benchmark.notes ? (
          <Text style={styles.rowNotes}>{benchmark.notes}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function RateGuideScreen({ onBack }: RateGuideScreenProps) {
  const { benchmarks, isLoading } = useRateBenchmarks();

  const byType = React.useMemo(() => {
    const map: Record<string, RateBenchmark> = {};
    for (const b of benchmarks) {
      map[b.gig_type] = b;
    }
    return map;
  }, [benchmarks]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rate Guide</Text>
        <Text style={styles.subtitle}>Mid-market benchmarks · May 2026</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.loadingText}>Loading benchmarks…</Text>
        ) : (
          GROUPS.map(group => {
            const rows = group.types
              .map(t => byType[t])
              .filter(Boolean) as RateBenchmark[];

            if (rows.length === 0) return null;

            return (
              <View key={group.label} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={styles.groupCard}>
                  {rows.map((b, i) => (
                    <React.Fragment key={b.gig_type}>
                      <BenchmarkRow benchmark={b} />
                      {i < rows.length - 1 && <View style={styles.divider} />}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.disclaimer}>
          Rates are estimates for the mid-market tier based on industry data. Actual rates vary by location, experience, and market conditions.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  header: {
    paddingHorizontal: parseInt(spacing[4]),
    paddingTop: parseInt(spacing[4]),
    paddingBottom: parseInt(spacing[3]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    gap: 4,
  },
  backButton: {
    marginBottom: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.brand.DEFAULT,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.DEFAULT,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: parseInt(spacing[4]),
    paddingBottom: 48,
    gap: 20,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowMain: {
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  rowRate: {
    fontSize: 14,
    color: colors.brand.DEFAULT,
    fontWeight: '500',
  },
  rowNotes: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 17,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginHorizontal: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 40,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: parseInt(spacing[2]),
    marginTop: 8,
  },
});
