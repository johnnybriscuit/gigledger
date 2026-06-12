import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSharedSchedule } from '../../hooks/useSharedSchedule';
import { colors } from '../../styles/theme';

type Expiry = 'never' | '90days' | '30days';

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

function expiryToDate(expiry: Expiry): string | null {
  if (expiry === 'never') return null;
  const d = new Date();
  d.setDate(d.getDate() + (expiry === '90days' ? 90 : 30));
  return d.toISOString();
}

export function ShareScheduleSection() {
  const { shareLink, isLoading, shareUrl, createShareLink, updateShareLink, revokeShareLink } =
    useSharedSchedule();

  // State A form
  const [showForm, setShowForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [formShowAmounts, setFormShowAmounts] = useState(true);
  const [formShowVenues, setFormShowVenues] = useState(true);
  const [expiry, setExpiry] = useState<Expiry>('never');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // State B UI
  const [copyLabel, setCopyLabel] = useState('📋 Copy link');
  const [updateConfirm, setUpdateConfirm] = useState<'amounts' | 'venues' | null>(null);
  const [revoking, setRevoking] = useState(false);

  const resetForm = () => {
    setShowForm(false);
    setLinkName('');
    setFormShowAmounts(true);
    setFormShowVenues(true);
    setExpiry('never');
    setCreateError('');
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      await createShareLink({
        displayName: linkName.trim() || undefined,
        showAmounts: formShowAmounts,
        showVenues: formShowVenues,
        expiresAt: expiryToDate(expiry),
      });
      resetForm();
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to create link. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(shareUrl);
    } else {
      await Clipboard.setStringAsync(shareUrl);
    }
    setCopyLabel('Copied! ✓');
    setTimeout(() => setCopyLabel('📋 Copy link'), 2000);
  };

  const handlePreview = () => {
    if (!shareUrl) return;
    if (Platform.OS === 'web') {
      window.open(shareUrl, '_blank');
    } else {
      Linking.openURL(shareUrl);
    }
  };

  const handleShareAction = async () => {
    if (!shareUrl) return;
    const message = `Here's my upcoming gig schedule: ${shareUrl}`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title: 'My Gig Schedule', url: shareUrl });
        } catch {}
      } else {
        await handleCopy();
        Alert.alert('', 'Link copied — paste it anywhere to share');
      }
    } else {
      await Share.share({ message });
    }
  };

  const handleToggleAmounts = async (val: boolean) => {
    if (!shareLink) return;
    await updateShareLink(shareLink.id, { showAmounts: val });
    setUpdateConfirm('amounts');
    setTimeout(() => setUpdateConfirm(null), 1200);
  };

  const handleToggleVenues = async (val: boolean) => {
    if (!shareLink) return;
    await updateShareLink(shareLink.id, { showVenues: val });
    setUpdateConfirm('venues');
    setTimeout(() => setUpdateConfirm(null), 1200);
  };

  const handleRevoke = () => {
    if (!shareLink) return;
    const doRevoke = async () => {
      setRevoking(true);
      try {
        await revokeShareLink(shareLink.id);
      } finally {
        setRevoking(false);
      }
    };
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Revoke this link? Anyone with the link will no longer be able to view your schedule. You can create a new one anytime.'
        )
      ) {
        doRevoke();
      }
    } else {
      Alert.alert(
        'Revoke this link?',
        'Anyone with the link will no longer be able to view your schedule. You can create a new one anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Revoke', style: 'destructive', onPress: doRevoke },
        ]
      );
    }
  };

  return (
    <>
      <Text style={S.sectionLabel}>Share Schedule</Text>

      {isLoading ? (
        <View style={[S.card, S.loadingCard]}>
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : shareLink ? (
        /* ── STATE B: active link ── */
        <View style={S.card}>
          {/* Header */}
          <View style={S.stateBHeader}>
            <Text style={S.stateBTitle}>📅 Share Your Schedule</Text>
            <View style={S.activeBadge}>
              <Text style={S.activeBadgeText}>ACTIVE</Text>
            </View>
          </View>

          {/* URL row */}
          <View style={S.urlSection}>
            <Text style={S.urlLabel}>YOUR SCHEDULE LINK</Text>
            <View style={S.urlRow}>
              <Text style={S.urlText} numberOfLines={1} ellipsizeMode="middle">
                {shareUrl}
              </Text>
              <TouchableOpacity onPress={handleCopy} style={S.urlCopyBtn}>
                <Text style={S.urlCopyIcon}>📋</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={S.actionRow}>
            <TouchableOpacity style={S.actionBtn} onPress={handleCopy}>
              <Text style={S.actionBtnText}>{copyLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.actionBtn} onPress={handlePreview}>
              <Text style={S.actionBtnText}>👁 Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.actionBtn} onPress={handleShareAction}>
              <Text style={S.actionBtnText}>📤 Share</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <Text style={S.statsText}>
            {shareLink.access_count === 0
              ? 'Not viewed yet'
              : `Viewed ${shareLink.access_count} time${shareLink.access_count !== 1 ? 's' : ''} · Last opened ${relativeTime(shareLink.last_accessed)}`}
          </Text>

          <View style={S.divider} />

          {/* Privacy toggles */}
          <View style={S.toggleRow}>
            <View style={S.toggleLeft}>
              <Text style={S.toggleLabel}>Show pay amounts</Text>
              {updateConfirm === 'amounts' && (
                <Text style={S.updateConfirmText}>Updated ✓</Text>
              )}
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
              {updateConfirm === 'venues' && (
                <Text style={S.updateConfirmText}>Updated ✓</Text>
              )}
            </View>
            <Switch
              value={shareLink.show_venues}
              onValueChange={handleToggleVenues}
              trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
              thumbColor={colors.surface.DEFAULT}
            />
          </View>

          <View style={S.divider} />

          {/* Revoke */}
          <TouchableOpacity
            style={S.revokeBtn}
            onPress={handleRevoke}
            disabled={revoking}
          >
            {revoking ? (
              <ActivityIndicator size="small" color={colors.danger.DEFAULT} />
            ) : (
              <Text style={S.revokeBtnText}>Revoke link</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : showForm ? (
        /* ── STATE A: inline create form ── */
        <View style={S.card}>
          <Text style={S.formTitle}>New share link</Text>

          <Text style={S.fieldLabel}>LINK NAME (OPTIONAL)</Text>
          <TextInput
            style={S.input}
            value={linkName}
            onChangeText={setLinkName}
            placeholder={'e.g. "John\'s Gig Schedule"'}
            placeholderTextColor={colors.text.subtle}
            maxLength={60}
          />

          <View style={S.toggleRow}>
            <View style={S.toggleLeft}>
              <Text style={S.toggleLabel}>Show pay amounts</Text>
              <Text style={S.toggleHelper}>Your spouse can see how much each gig pays</Text>
            </View>
            <Switch
              value={formShowAmounts}
              onValueChange={setFormShowAmounts}
              trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
              thumbColor={colors.surface.DEFAULT}
            />
          </View>
          <View style={[S.toggleRow, S.toggleRowLast]}>
            <View style={S.toggleLeft}>
              <Text style={S.toggleLabel}>Show venue names</Text>
              <Text style={S.toggleHelper}>Show city and venue for each gig</Text>
            </View>
            <Switch
              value={formShowVenues}
              onValueChange={setFormShowVenues}
              trackColor={{ false: colors.border.DEFAULT, true: colors.brand.DEFAULT }}
              thumbColor={colors.surface.DEFAULT}
            />
          </View>

          <Text style={[S.fieldLabel, { marginTop: 16 }]}>LINK EXPIRES</Text>
          <View style={S.expiryRow}>
            {(['never', '90days', '30days'] as Expiry[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[S.expiryChip, expiry === opt && S.expiryChipActive]}
                onPress={() => setExpiry(opt)}
              >
                <Text style={[S.expiryChipText, expiry === opt && S.expiryChipTextActive]}>
                  {opt === 'never' ? 'Never' : opt === '90days' ? '90 days' : '30 days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!createError && <Text style={S.errorText}>{createError}</Text>}

          <View style={S.formBtnRow}>
            <TouchableOpacity style={S.cancelBtn} onPress={resetForm} disabled={creating}>
              <Text style={S.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.generateBtn} onPress={handleCreate} disabled={creating}>
              {creating ? (
                <ActivityIndicator size="small" color={colors.brand.foreground} />
              ) : (
                <Text style={S.generateBtnText}>Generate link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── STATE A: prompt card ── */
        <View style={S.card}>
          <Text style={S.promptTitle}>📅 Share Your Schedule</Text>
          <Text style={S.promptSubtext}>
            Let your spouse, family, or manager see your upcoming gigs and projected income — no
            login required.
          </Text>
          <TouchableOpacity style={S.createBtn} onPress={() => setShowForm(true)}>
            <Text style={S.createBtnText}>Create a share link →</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const S = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.subtle,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  // State A prompt
  promptTitle: { fontSize: 16, fontWeight: '700', color: colors.text.DEFAULT, marginBottom: 6 },
  promptSubtext: { fontSize: 14, color: colors.text.muted, lineHeight: 20, marginBottom: 16 },
  createBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createBtnText: { fontSize: 14, fontWeight: '600', color: colors.brand.foreground },
  // State A form
  formTitle: { fontSize: 16, fontWeight: '700', color: colors.text.DEFAULT, marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.subtle,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text.DEFAULT,
    marginBottom: 14,
  },
  expiryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  expiryChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
  },
  expiryChipActive: {
    borderColor: colors.brand.DEFAULT,
    backgroundColor: colors.brand.muted,
  },
  expiryChipText: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  expiryChipTextActive: { color: colors.brand.DEFAULT, fontWeight: '700' },
  errorText: { fontSize: 13, color: colors.danger.DEFAULT, marginTop: 8 },
  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.text.DEFAULT },
  generateBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.brand.DEFAULT,
    alignItems: 'center',
  },
  generateBtnText: { fontSize: 14, fontWeight: '600', color: colors.brand.foreground },
  // State B
  stateBHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stateBTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text.DEFAULT },
  activeBadge: {
    backgroundColor: colors.success.muted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success.DEFAULT,
    letterSpacing: 0.5,
  },
  urlSection: { marginBottom: 12 },
  urlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.subtle,
    letterSpacing: 0.4,
    marginBottom: 6,
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
    paddingVertical: 4,
  },
  urlText: { flex: 1, fontSize: 13, color: colors.text.muted, paddingVertical: 6 },
  urlCopyBtn: { padding: 8 },
  urlCopyIcon: { fontSize: 16 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.brand.DEFAULT },
  statsText: { fontSize: 12, color: colors.text.subtle, marginBottom: 12 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.DEFAULT,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLeft: { flex: 1 },
  toggleLabel: { fontSize: 15, color: colors.text.DEFAULT },
  toggleHelper: { fontSize: 12, color: colors.text.subtle, marginTop: 2 },
  updateConfirmText: { fontSize: 12, color: colors.success.DEFAULT, marginTop: 2 },
  revokeBtn: { paddingVertical: 4, alignItems: 'center' },
  revokeBtnText: { fontSize: 15, fontWeight: '600', color: colors.danger.DEFAULT },
});
