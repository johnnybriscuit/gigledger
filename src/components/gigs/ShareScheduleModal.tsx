import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSharedSchedule, SharedScheduleLink } from '../../hooks/useSharedSchedule';
import { confirmDialog } from '../../lib/dialog';
import { colors } from '../../styles/theme';

type WindowDays = 30 | 90 | 180 | 3650;

const WINDOW_OPTIONS: { days: WindowDays; label: string }[] = [
  { days: 30, label: '1 mo' },
  { days: 90, label: '3 mo' },
  { days: 180, label: '6 mo' },
  { days: 3650, label: 'All' },
];

export interface ShareScheduleModalProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigateToSettings?: () => void;
}

export function ShareScheduleModal({ isVisible, onClose, onNavigateToSettings }: ShareScheduleModalProps) {
  const [tab, setTab] = useState<'schedule' | 'history'>('schedule');
  const { shareLink, isLoading, shareUrl, createShareLink, updateShareLink, revokeShareLink } = useSharedSchedule('schedule');

  const [autoCreating, setAutoCreating] = useState(false);
  const autoCreateAttempted = useRef(false);

  const [windowConfirm, setWindowConfirm] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState<'amounts' | 'venues' | null>(null);

  useEffect(() => {
    if (!isVisible) {
      autoCreateAttempted.current = false;
      return;
    }
    if (isLoading || shareLink || autoCreateAttempted.current) return;

    autoCreateAttempted.current = true;
    setAutoCreating(true);
    createShareLink({ showAmounts: true, showVenues: true, shareWindowDays: 90 }).finally(() =>
      setAutoCreating(false)
    );
  }, [isVisible, isLoading, shareLink]);

  const handleCreateLink = async () => {
    setAutoCreating(true);
    try {
      await createShareLink({ showAmounts: true, showVenues: true, shareWindowDays: 90 });
    } finally {
      setAutoCreating(false);
    }
  };

  const handleToggleAmounts = async (val: boolean) => {
    if (!shareLink) return;
    await updateShareLink(shareLink.id, { showAmounts: val });
    setToggleConfirm('amounts');
    setTimeout(() => setToggleConfirm(null), 1200);
  };

  const handleToggleVenues = async (val: boolean) => {
    if (!shareLink) return;
    await updateShareLink(shareLink.id, { showVenues: val });
    setToggleConfirm('venues');
    setTimeout(() => setToggleConfirm(null), 1200);
  };

  const handleWindowChange = async (days: WindowDays) => {
    if (!shareLink || shareLink.share_window_days === days) return;
    await updateShareLink(shareLink.id, { shareWindowDays: days });
    setWindowConfirm(true);
    setTimeout(() => setWindowConfirm(false), 1200);
  };

  const isSettingUp = isLoading || autoCreating;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={S.overlay} />
      </TouchableWithoutFeedback>

      <View style={S.sheet}>
        {/* Header */}
        <View style={S.sheetHeader}>
          <Text style={S.sheetTitle}>📤 Share Your Schedule</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={S.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Mode tabs */}
        <View style={S.tabRow}>
          <TouchableOpacity style={[S.tab, tab === 'schedule' && S.tabActive]} onPress={() => setTab('schedule')}>
            <Text style={[S.tabText, tab === 'schedule' && S.tabTextActive]}>Upcoming schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.tab, tab === 'history' && S.tabActive]} onPress={() => setTab('history')}>
            <Text style={[S.tabText, tab === 'history' && S.tabTextActive]}>Gig history</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {tab === 'history' ? (
          <HistoryShareBody />
        ) : isSettingUp ? (
          <View style={S.settingUp}>
            <ActivityIndicator color={colors.brand.DEFAULT} />
            <Text style={S.settingUpText}>Setting up your link...</Text>
          </View>
        ) : shareLink && shareUrl ? (
          <>
            <ShareUrlBlock url={shareUrl} sectionLabel="YOUR SCHEDULE LINK" shareMessage="Here's my upcoming gig schedule" />

            <View style={S.divider} />

            {/* Privacy toggles */}
            <Text style={S.sectionLabel}>PRIVACY</Text>
            <View style={S.toggleRow}>
              <View style={S.toggleLeft}>
                <Text style={S.toggleLabel}>Show pay amounts</Text>
                {toggleConfirm === 'amounts' && <Text style={S.confirmText}>Updated ✓</Text>}
              </View>
              <Switch
                value={shareLink.show_amounts}
                onValueChange={handleToggleAmounts}
                trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
                thumbColor={colors.surface.DEFAULT}
              />
            </View>
            <View style={[S.toggleRow, S.toggleRowLast]}>
              <View style={S.toggleLeft}>
                <Text style={S.toggleLabel}>Show venue names</Text>
                {toggleConfirm === 'venues' && <Text style={S.confirmText}>Updated ✓</Text>}
              </View>
              <Switch
                value={shareLink.show_venues}
                onValueChange={handleToggleVenues}
                trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
                thumbColor={colors.surface.DEFAULT}
              />
            </View>

            <View style={S.divider} />

            {/* Date window */}
            <View style={S.windowRow}>
              <Text style={S.sectionLabel}>SHOW GIGS FOR</Text>
              {windowConfirm && <Text style={S.confirmText}>Updated ✓</Text>}
            </View>
            <View style={S.chipRow}>
              {WINDOW_OPTIONS.map(({ days, label }) => {
                const active = shareLink.share_window_days === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[S.chip, active && S.chipActive]}
                    onPress={() => handleWindowChange(days)}
                  >
                    <Text style={[S.chipText, active && S.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ManageLinkRow
              link={shareLink}
              noun="schedule"
              onRevoke={() => revokeShareLink(shareLink.id)}
            />

            <View style={S.divider} />

            {/* Footer nav */}
            <TouchableOpacity
              style={S.settingsNav}
              onPress={() => {
                onClose();
                onNavigateToSettings?.();
              }}
            >
              <Text style={S.settingsNavText}>⚙️ More settings → Account Settings</Text>
            </TouchableOpacity>
          </>
        ) : (
          <CreateLinkPrompt noun="schedule" creating={autoCreating} onCreate={handleCreateLink} />
        )}
      </View>
    </Modal>
  );
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours === 1 ? '1 hour' : `${hours} hours`} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/** View stats + revoke action shown at the bottom of each share tab. */
function ManageLinkRow({ link, noun, onRevoke }: {
  link: SharedScheduleLink;
  noun: string;
  onRevoke: () => Promise<unknown>;
}) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    const confirmed = await confirmDialog(
      'Revoke this link?',
      `Anyone with the link will no longer be able to view your ${noun}. You can create a new one anytime.`
    );
    if (!confirmed) return;
    setRevoking(true);
    try {
      await onRevoke();
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <View style={S.divider} />
      <Text style={S.statsText}>
        {link.access_count === 0
          ? 'Not viewed yet'
          : `Viewed ${link.access_count} time${link.access_count === 1 ? '' : 's'} · Last opened ${relativeTime(link.last_accessed)}`}
      </Text>
      <TouchableOpacity style={S.revokeBtn} onPress={handleRevoke} disabled={revoking}>
        {revoking ? (
          <ActivityIndicator size="small" color={colors.danger.DEFAULT} />
        ) : (
          <Text style={S.revokeBtnText}>Revoke link</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

/** Empty state shown when no link exists (first-run failure or after revoke). */
function CreateLinkPrompt({ noun, creating, onCreate }: {
  noun: string;
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <View style={S.settingUp}>
      <Text style={S.settingUpText}>No active {noun} link.</Text>
      <TouchableOpacity style={S.customApply} onPress={onCreate} disabled={creating}>
        {creating ? (
          <ActivityIndicator size="small" color={colors.brand.foreground} />
        ) : (
          <Text style={S.customApplyText}>Create a new link</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/** Shared URL display + copy/preview/share actions used by both tabs. */
function ShareUrlBlock({ url, sectionLabel, shareMessage }: {
  url: string;
  sectionLabel: string;
  shareMessage: string;
}) {
  const [copyLabel, setCopyLabel] = useState('📋 Copy link');

  const handleCopy = async () => {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(url);
    } else {
      await Clipboard.setStringAsync(url);
    }
    setCopyLabel('Copied! ✓');
    setTimeout(() => setCopyLabel('📋 Copy link'), 2000);
  };

  const handlePreview = () => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleShareVia = async () => {
    const message = `${shareMessage}: ${url}`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title: shareMessage, url });
        } catch {}
      } else {
        await handleCopy();
      }
    } else {
      await Share.share({ message });
    }
  };

  return (
    <>
      <Text style={S.sectionLabel}>{sectionLabel}</Text>
      <View style={S.urlRow}>
        <Text style={S.urlText} numberOfLines={1} ellipsizeMode="middle">
          {url}
        </Text>
        <TouchableOpacity onPress={handleCopy} style={S.urlCopyBtn}>
          <Text style={S.urlCopyIcon}>📋</Text>
        </TouchableOpacity>
      </View>

      <View style={S.actionRow}>
        <TouchableOpacity style={S.actionBtn} onPress={handleCopy}>
          <Text style={S.actionBtnText}>{copyLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.actionBtn} onPress={handlePreview}>
          <Text style={S.actionBtnText}>👁 Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.actionBtn} onPress={handleShareVia}>
          <Text style={S.actionBtnText}>📤 Share via...</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/** Gig history tab: a share link scoped to an explicit date range. */
function HistoryShareBody() {
  const { shareLink, isLoading, shareUrl, createShareLink, updateShareLink, revokeShareLink } = useSharedSchedule('history');

  const [autoCreating, setAutoCreating] = useState(false);
  const autoCreateAttempted = useRef(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [rangeConfirm, setRangeConfirm] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<'amounts' | 'venues' | null>(null);

  useEffect(() => {
    if (isLoading || shareLink || autoCreateAttempted.current) return;
    autoCreateAttempted.current = true;
    setAutoCreating(true);
    const y = new Date().getFullYear();
    createShareLink({
      showAmounts: true,
      showVenues: true,
      shareStartDate: `${y}-01-01`,
      shareEndDate: `${y}-12-31`,
    }).finally(() => setAutoCreating(false));
  }, [isLoading, shareLink]);

  const handleCreateLink = async () => {
    setAutoCreating(true);
    const y = new Date().getFullYear();
    try {
      await createShareLink({
        showAmounts: true,
        showVenues: true,
        shareStartDate: `${y}-01-01`,
        shareEndDate: `${y}-12-31`,
      });
    } finally {
      setAutoCreating(false);
    }
  };

  // Preset ranges computed from today
  const now = new Date();
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const yr = now.getFullYear();
  const PRESETS = [
    { key: 'thisYear', label: 'This Year', start: `${yr}-01-01`, end: `${yr}-12-31` },
    { key: 'lastYear', label: 'Last Year', start: `${yr - 1}-01-01`, end: `${yr - 1}-12-31` },
    { key: 'last90', label: 'Last 90d', start: ymd(new Date(now.getTime() - 89 * 86400000)), end: ymd(now) },
    { key: 'next90', label: 'Next 90d', start: ymd(now), end: ymd(new Date(now.getTime() + 89 * 86400000)) },
    { key: 'all', label: 'All Time', start: '2020-01-01', end: '2099-12-31' },
  ];

  const activePreset = shareLink
    ? PRESETS.find((p) => p.start === shareLink.share_start_date && p.end === shareLink.share_end_date)?.key ?? 'custom'
    : null;

  const applyRange = async (start: string, end: string) => {
    if (!shareLink) return;
    await updateShareLink(shareLink.id, { shareStartDate: start, shareEndDate: end });
    setRangeConfirm(true);
    setTimeout(() => setRangeConfirm(false), 1200);
  };

  const applyCustom = () => {
    setCustomError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
      setCustomError('Enter both dates as YYYY-MM-DD.');
      return;
    }
    if (startStr > endStr) {
      setCustomError('Start date must be before end date.');
      return;
    }
    void applyRange(startStr, endStr);
    setCustomOpen(false);
  };

  const handleToggleAmounts = async (val: boolean) => {
    if (!shareLink) return;
    await updateShareLink(shareLink.id, { showAmounts: val });
    setToggleConfirm('amounts');
    setTimeout(() => setToggleConfirm(null), 1200);
  };

  const handleToggleVenues = async (val: boolean) => {
    if (!shareLink) return;
    await updateShareLink(shareLink.id, { showVenues: val });
    setToggleConfirm('venues');
    setTimeout(() => setToggleConfirm(null), 1200);
  };

  if (isLoading || autoCreating) {
    return (
      <View style={S.settingUp}>
        <ActivityIndicator color={colors.brand.DEFAULT} />
        <Text style={S.settingUpText}>Setting up your link...</Text>
      </View>
    );
  }

  if (!shareLink || !shareUrl) {
    return (
      <CreateLinkPrompt noun="history" creating={autoCreating} onCreate={handleCreateLink} />
    );
  }

  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
  };

  return (
    <>
      <ShareUrlBlock url={shareUrl} sectionLabel="YOUR HISTORY LINK" shareMessage="Here's my gig history" />

      <View style={S.divider} />

      {/* Privacy toggles */}
      <Text style={S.sectionLabel}>PRIVACY</Text>
      <View style={S.toggleRow}>
        <View style={S.toggleLeft}>
          <Text style={S.toggleLabel}>Show pay amounts</Text>
          {toggleConfirm === 'amounts' && <Text style={S.confirmText}>Updated ✓</Text>}
        </View>
        <Switch
          value={shareLink.show_amounts}
          onValueChange={handleToggleAmounts}
          trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
          thumbColor={colors.surface.DEFAULT}
        />
      </View>
      <View style={[S.toggleRow, S.toggleRowLast]}>
        <View style={S.toggleLeft}>
          <Text style={S.toggleLabel}>Show venue names</Text>
          {toggleConfirm === 'venues' && <Text style={S.confirmText}>Updated ✓</Text>}
        </View>
        <Switch
          value={shareLink.show_venues}
          onValueChange={handleToggleVenues}
          trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
          thumbColor={colors.surface.DEFAULT}
        />
      </View>

      <View style={S.divider} />

      {/* Date range */}
      <View style={S.windowRow}>
        <Text style={S.sectionLabel}>DATE RANGE</Text>
        {rangeConfirm && <Text style={S.confirmText}>Updated ✓</Text>}
      </View>
      <Text style={S.rangeCurrent}>
        Currently sharing: {shareLink.share_start_date ? fmt(shareLink.share_start_date) : '—'} –{' '}
        {shareLink.share_end_date ? fmt(shareLink.share_end_date) : '—'}
      </Text>
      <View style={S.presetWrap}>
        {PRESETS.map((p) => {
          const active = activePreset === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[S.presetChip, active && S.chipActive]}
              onPress={() => { setCustomOpen(false); void applyRange(p.start, p.end); }}
            >
              <Text style={[S.chipText, active && S.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[S.presetChip, (activePreset === 'custom' || customOpen) && S.chipActive]}
          onPress={() => {
            setStartStr(shareLink.share_start_date ?? '');
            setEndStr(shareLink.share_end_date ?? '');
            setCustomOpen(true);
          }}
        >
          <Text style={[S.chipText, (activePreset === 'custom' || customOpen) && S.chipTextActive]}>Custom…</Text>
        </TouchableOpacity>
      </View>

      {customOpen && (
        <View style={S.customBox}>
          <Text style={S.customLabel}>Start date</Text>
          {Platform.OS === 'web' ? (
            /* @ts-ignore web-only */
            <input
              type="date"
              value={startStr}
              onChange={(e: any) => setStartStr(e.target.value)}
              style={{ padding: 10, fontSize: 14, borderRadius: 8, border: `1.5px solid ${colors.border.DEFAULT}`, background: colors.surface.muted, color: colors.text.DEFAULT, width: '100%', marginBottom: 10, fontFamily: 'inherit' } as any}
            />
          ) : (
            <TextInput
              style={S.customInput}
              value={startStr}
              onChangeText={setStartStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.subtle}
            />
          )}
          <Text style={S.customLabel}>End date</Text>
          {Platform.OS === 'web' ? (
            /* @ts-ignore web-only */
            <input
              type="date"
              value={endStr}
              onChange={(e: any) => setEndStr(e.target.value)}
              style={{ padding: 10, fontSize: 14, borderRadius: 8, border: `1.5px solid ${colors.border.DEFAULT}`, background: colors.surface.muted, color: colors.text.DEFAULT, width: '100%', marginBottom: 12, fontFamily: 'inherit' } as any}
            />
          ) : (
            <TextInput
              style={S.customInput}
              value={endStr}
              onChangeText={setEndStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.subtle}
            />
          )}
          {customError && <Text style={S.customError}>{customError}</Text>}
          <TouchableOpacity style={S.customApply} onPress={applyCustom}>
            <Text style={S.customApplyText}>Apply Range</Text>
          </TouchableOpacity>
        </View>
      )}

      <ManageLinkRow
        link={shareLink}
        noun="history report"
        onRevoke={() => revokeShareLink(shareLink.id)}
      />
    </>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.surface.DEFAULT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: colors.brand.DEFAULT,
    backgroundColor: colors.brand.muted,
  },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  tabTextActive: { color: colors.brand.DEFAULT, fontWeight: '700' },
  rangeCurrent: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 10,
    marginTop: -4,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.muted,
  },
  customBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.muted,
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.subtle,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  customInput: {
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text.DEFAULT,
    marginBottom: 12,
  },
  customError: {
    fontSize: 13,
    color: colors.danger.DEFAULT,
    marginBottom: 10,
  },
  customApply: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  customApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.foreground,
  },
  statsText: { fontSize: 12, color: colors.text.subtle, marginBottom: 10 },
  revokeBtn: { paddingVertical: 4, alignItems: 'center' },
  revokeBtnText: { fontSize: 15, fontWeight: '600', color: colors.danger.DEFAULT },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.DEFAULT,
  },
  closeBtn: {
    fontSize: 18,
    color: colors.text.subtle,
    paddingLeft: 8,
  },
  settingUp: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  settingUpText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.subtle,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    marginBottom: 12,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.muted,
    paddingVertical: 10,
  },
  urlCopyBtn: { padding: 10 },
  urlCopyIcon: { fontSize: 16 },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },
  toggleRowLast: { borderBottomWidth: 0, marginBottom: 4 },
  toggleLeft: { flex: 1 },
  toggleLabel: { fontSize: 15, color: colors.text.DEFAULT },
  confirmText: { fontSize: 12, color: colors.success.DEFAULT, marginTop: 2 },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: colors.brand.DEFAULT,
    backgroundColor: colors.brand.muted,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  chipTextActive: { color: colors.brand.DEFAULT, fontWeight: '700' },
  settingsNav: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  settingsNavText: {
    fontSize: 14,
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
});
