/**
 * Tax Profile Banner
 * Prompts users to set their tax state when state is null
 * Dismissible and persisted per user in localStorage
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { supabase } from '../lib/supabase';

interface TaxProfileBannerProps {
  onNavigateToTaxSettings: () => void;
}

export function TaxProfileBanner({ onNavigateToTaxSettings }: TaxProfileBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get user ID and check if banner was dismissed
    const checkDismissal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      if (Platform.OS === 'web') {
        const dismissedKey = `tax_banner_dismissed_${user.id}`;
        const wasDismissed = localStorage.getItem(dismissedKey);
        if (wasDismissed === 'true') {
          setDismissed(true);
        }
      }
    };

    checkDismissal();
  }, []);

  const handleDismiss = () => {
    if (Platform.OS === 'web' && userId) {
      const dismissedKey = `tax_banner_dismissed_${userId}`;
      localStorage.setItem(dismissedKey, 'true');
    }
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Set up your tax profile</Text>
        <Text style={styles.message}>
          Add your state for accurate tax estimates
        </Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onNavigateToTaxSettings}
        accessibilityRole="button"
        accessibilityLabel="Set up tax profile"
      >
        <Text style={styles.actionText}>Set up →</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss banner"
      >
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.DEFAULT + '15', // Light warning background
    borderLeftWidth: 4,
    borderLeftColor: colors.warning.DEFAULT,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: colors.text.muted,
  },
  actionButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 16,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 8,
    marginLeft: 4,
  },
  dismissText: {
    fontSize: 18,
    color: colors.text.muted,
    fontWeight: '300',
  },
});
