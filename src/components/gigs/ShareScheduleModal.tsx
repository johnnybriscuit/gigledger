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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSharedSchedule } from '../../hooks/useSharedSchedule';
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
  const { shareLink, isLoading, shareUrl, createShareLink, updateShareLink } = useSharedSchedule();

  const [autoCreating, setAutoCreating] = useState(false);
  const autoCreateAttempted = useRef(false);

  const [copyLabel, setCopyLabel] = useState('📋 Copy link');
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

  const handleShareVia = async () => {
    if (!shareUrl) return;
    const message = `Here's my upcoming gig schedule: ${shareUrl}`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title: 'My Gig Schedule', url: shareUrl });
        } catch {}
      } else {
        await handleCopy();
      }
    } else {
      await Share.share({ message });
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

        {/* Body */}
        {isSettingUp ? (
          <View style={S.settingUp}>
            <ActivityIndicator color={colors.brand.DEFAULT} />
            <Text style={S.settingUpText}>Setting up your link...</Text>
          </View>
        ) : shareLink && shareUrl ? (
          <>
            {/* URL display */}
            <Text style={S.sectionLabel}>YOUR SCHEDULE LINK</Text>
            <View style={S.urlRow}>
              <Text style={S.urlText} numberOfLines={1} ellipsizeMode="middle">
                {shareUrl}
              </Text>
              <TouchableOpacity onPress={handleCopy} style={S.urlCopyBtn}>
                <Text style={S.urlCopyIcon}>📋</Text>
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
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
          <View style={S.settingUp}>
            <Text style={S.settingUpText}>Could not load your share link. Please try again.</Text>
          </View>
        )}
      </View>
    </Modal>
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
    marginBottom: 18,
  },
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
