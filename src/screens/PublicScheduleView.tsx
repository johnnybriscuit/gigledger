import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { getBaseUrl } from '../lib/getBaseUrl';

interface ScheduleGig {
  id: string;
  date: string;
  title: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  amount: number | null;
  grossAmount: number | null;
  status: 'paid' | 'unpaid';
  payerName: string | null;
}

interface ScheduleData {
  displayName: string;
  showAmounts: boolean;
  showVenues: boolean;
  shareWindowDays: number | null;
  gigs: ScheduleGig[];
  monthlyTotals: Record<string, number>;
  generatedAt: string;
}

function formatGigDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function formatMonthHeader(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).toUpperCase();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours === 1 ? '1 hour' : `${hours} hours`} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function getUpcomingMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

type PageStatus = 'loading' | 'success' | 'not-found' | 'expired' | 'error';

export function PublicScheduleView({ token }: { token: string }) {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');

  const fetchData = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch(`${getBaseUrl()}/api/share/${token}`);
      if (res.status === 404) { setStatus('not-found'); return; }
      if (res.status === 410) { setStatus('expired'); return; }
      if (!res.ok) { setStatus('error'); return; }
      setData(await res.json() as ScheduleData);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [token]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (Platform.OS === 'web' && data?.displayName) {
      document.title = data.displayName;
    }
  }, [data?.displayName]);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://jvostkeswuhfwntbrfzl.supabase.co';
  const icsUrl = `${supabaseUrl}/functions/v1/schedule-ics?token=${encodeURIComponent(token)}`;
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl)}`;

  const handleOpenCal = () => {
    if (Platform.OS === 'web') {
      window.open(googleCalUrl, '_blank');
    } else {
      Linking.openURL(googleCalUrl);
    }
  };

  const handleBozzyLink = () => Linking.openURL('https://bozzygigs.com');

  if (status === 'loading') {
    return (
      <View style={S.fill}>
        <View style={S.centered}>
          <ActivityIndicator size="large" color="#1E3A5F" />
          <Text style={S.loadingText}>Loading schedule...</Text>
        </View>
      </View>
    );
  }

  if (status === 'not-found') {
    return (
      <View style={S.fill}>
        <View style={S.centered}>
          <Text style={S.errorEmoji}>🎵</Text>
          <Text style={S.errorHeading}>Schedule not found</Text>
          <Text style={S.errorBody}>
            This link may have been revoked or the URL might be incorrect.
          </Text>
          <TouchableOpacity onPress={handleBozzyLink}>
            <Text style={S.learnLink}>Learn about Bozzy →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === 'expired') {
    return (
      <View style={S.fill}>
        <View style={S.centered}>
          <Text style={S.errorEmoji}>⏰</Text>
          <Text style={S.errorHeading}>This link has expired</Text>
          <Text style={S.errorBody}>Ask them to generate a new schedule link in Bozzy.</Text>
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={S.fill}>
        <View style={S.centered}>
          <Text style={S.errorEmoji}>😕</Text>
          <Text style={S.errorHeading}>Something went wrong</Text>
          <Text style={S.errorBody}>Please try again in a moment.</Text>
          <TouchableOpacity style={S.retryBtn} onPress={fetchData}>
            <Text style={S.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!data) return null;

  const gigsByMonth: Record<string, ScheduleGig[]> = {};
  for (const gig of data.gigs) {
    const key = gig.date.slice(0, 7);
    if (!gigsByMonth[key]) gigsByMonth[key] = [];
    gigsByMonth[key].push(gig);
  }

  const allMonths = Array.from(
    new Set([...Object.keys(gigsByMonth), ...getUpcomingMonths(2)])
  ).sort();

  return (
    <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent}>
      <View style={S.page}>
        <Text style={S.brand}>Bozzy</Text>
        <Text style={S.displayName}>{data.displayName}</Text>
        <Text style={S.updatedAt}>Updated {relativeTime(data.generatedAt)}</Text>
        <Text style={S.windowText}>
          {data.shareWindowDays === null || data.shareWindowDays >= 365
            ? 'Showing all upcoming gigs'
            : `Showing the next ${Math.round(data.shareWindowDays / 30)} months`}
        </Text>

        <TouchableOpacity style={S.calBtn} onPress={handleOpenCal} activeOpacity={0.8}>
          <Text style={S.calBtnText}>📅 Subscribe in Google Calendar</Text>
        </TouchableOpacity>

        {data.gigs.length === 0 ? (
          <View style={S.emptyState}>
            <Text style={S.emptyEmoji}>📅</Text>
            <Text style={S.emptyHeading}>No upcoming gigs</Text>
            <Text style={S.emptyBody}>Check back soon!</Text>
          </View>
        ) : (
          allMonths.map((monthKey) => {
            const monthGigs = gigsByMonth[monthKey] ?? [];
            const monthTotal = data.monthlyTotals[monthKey] ?? 0;
            return (
              <View key={monthKey} style={S.monthSection}>
                <View style={S.monthHeader}>
                  <Text style={S.monthTitle}>{formatMonthHeader(monthKey)}</Text>
                  {data.showAmounts && monthTotal > 0 && (
                    <Text style={S.monthExpected}>Expected: {formatCurrency(monthTotal)}</Text>
                  )}
                </View>
                <View style={S.monthDivider} />
                {monthGigs.length === 0 ? (
                  <Text style={S.emptyMonth}>Nothing scheduled yet</Text>
                ) : (
                  monthGigs.map((gig) => {
                    const payerName = gig.payerName ?? 'Unknown';
                    const showTitle = gig.title && gig.title !== payerName;
                    let locationLine: string | null = null;
                    if (gig.venue && gig.city) {
                      locationLine = `${gig.venue} · ${gig.city}${gig.state ? `, ${gig.state}` : ''}`;
                    } else if (gig.city) {
                      locationLine = `${gig.city}${gig.state ? `, ${gig.state}` : ''}`;
                    } else if (gig.venue) {
                      locationLine = gig.venue;
                    }
                    return (
                      <View key={gig.id} style={S.gigCard}>
                        <View style={S.gigRow}>
                          <Text style={S.gigDate}>{formatGigDate(gig.date)}</Text>
                          {gig.amount != null && (
                            <Text style={S.gigAmount}>{formatCurrency(gig.amount)}</Text>
                          )}
                        </View>
                        <Text style={S.gigPayer}>{payerName}</Text>
                        {showTitle && <Text style={S.gigTitle}>{gig.title}</Text>}
                        {locationLine && <Text style={S.gigLocation}>📍 {locationLine}</Text>}
                      </View>
                    );
                  })
                )}
              </View>
            );
          })
        )}

        <View style={S.footer}>
          <Text style={S.footerText}>Shared via Bozzy · Read-only view</Text>
          <Text style={S.footerText}>© Bozzy {new Date().getFullYear()}</Text>
          <TouchableOpacity onPress={handleBozzyLink}>
            <Text style={S.footerLink}>What is Bozzy? →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1 },
  page: {
    width: '100%' as any,
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
  },
  loadingText: { marginTop: 16, fontSize: 15, color: '#9ca3af' },
  errorEmoji: { fontSize: 52, marginBottom: 16, textAlign: 'center' },
  errorHeading: {
    fontSize: 22, fontWeight: '700', color: '#111827',
    marginBottom: 8, textAlign: 'center',
  },
  errorBody: {
    fontSize: 15, color: '#6b7280', textAlign: 'center',
    lineHeight: 24, marginBottom: 16,
  },
  learnLink: { fontSize: 14, color: '#1E3A5F', fontWeight: '600' },
  retryBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 11,
    backgroundColor: '#1E3A5F', borderRadius: 8,
  },
  retryBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  brand: {
    fontSize: 13, fontWeight: '700', color: '#1E3A5F',
    letterSpacing: 0.8, marginBottom: 14,
  },
  displayName: {
    fontSize: 28, fontWeight: '700', color: '#111827',
    marginBottom: 4, lineHeight: 34,
  },
  updatedAt: { fontSize: 14, color: '#9ca3af', marginBottom: 4 },
  windowText: { fontSize: 13, color: '#9ca3af', marginBottom: 20, fontStyle: 'italic' },
  calBtn: {
    borderWidth: 1, borderColor: '#1E3A5F', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', marginBottom: 32,
  },
  calBtnText: { fontSize: 15, color: '#1E3A5F', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12, textAlign: 'center' },
  emptyHeading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyBody: { fontSize: 15, color: '#6b7280' },
  monthSection: { marginBottom: 28 },
  monthHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  monthExpected: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  monthDivider: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 10 },
  emptyMonth: {
    fontSize: 14, color: '#9ca3af', fontStyle: 'italic', paddingVertical: 16,
  },
  gigCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  gigRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  gigDate: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  gigAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  gigPayer: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  gigTitle: { fontSize: 14, color: '#6b7280', marginBottom: 2, lineHeight: 20 },
  gigLocation: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: { fontSize: 12, color: '#9ca3af', marginBottom: 2, lineHeight: 18 },
  footerLink: { fontSize: 12, color: '#1E3A5F', marginTop: 4, fontWeight: '600' },
});
