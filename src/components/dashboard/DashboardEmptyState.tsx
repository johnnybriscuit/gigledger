import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacingNum, radiusNum } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { trackDashboardPrimaryCtaClicked } from '../../lib/analytics';

interface DashboardEmptyStateProps {
  onAddContact: () => void;
  onAddGig: () => void;
  onOpenGigs: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onAddContact,
  onAddGig,
  onOpenGigs,
}) => {
  const { isMobile } = useResponsive();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>Welcome to Bozzy 👋</Text>
        <Text style={styles.welcomeSubtitle}>
          Start with one gig. That unlocks your dashboard, tax set-aside guidance, and the rest of your bookkeeping flow.
        </Text>
      </View>

      <View style={[styles.primaryCard, isMobile && styles.primaryCardMobile]}>
        <Text style={styles.primaryTitle}>Log your first gig</Text>
        <Text style={styles.primaryDescription}>
          Add the payer, amount, and date first. If you do not have a payer yet, Bozzy will help you create one inside the same flow.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            trackDashboardPrimaryCtaClicked({ cta: 'add_first_gig' });
            onAddGig();
          }}
        >
          <Text style={styles.primaryButtonText}>Add your first gig</Text>
        </TouchableOpacity>
        <Text style={styles.primaryHint}>Optional details like venue, mileage, and notes can wait.</Text>
      </View>

      <View style={[styles.secondaryActions, isMobile && styles.secondaryActionsMobile]}>
        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => {
            trackDashboardPrimaryCtaClicked({ cta: 'add_contact' });
            onAddContact();
          }}
        >
          <Text style={styles.secondaryLinkText}>Add a contact first</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => {
            trackDashboardPrimaryCtaClicked({ cta: 'open_gigs' });
            onOpenGigs();
          }}
        >
          <Text style={styles.secondaryLinkText}>Open the Gigs page</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacingNum[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacingNum[6],
    maxWidth: 760,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    marginBottom: spacingNum[3],
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryCard: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusNum.xl,
    padding: spacingNum[7],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    marginBottom: spacingNum[5],
  },
  primaryCardMobile: {
    padding: spacingNum[6],
  },
  primaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    marginBottom: spacingNum[3],
    textAlign: 'center',
  },
  primaryDescription: {
    fontSize: 15,
    color: colors.text.muted,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacingNum[5],
  },
  primaryButton: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
    paddingHorizontal: spacingNum[6],
    paddingVertical: spacingNum[4],
    borderRadius: radiusNum.md,
    alignItems: 'center',
    minWidth: 240,
  },
  primaryButtonText: {
    color: colors.brand.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryHint: {
    fontSize: 14,
    color: colors.text.subtle,
    textAlign: 'center',
    marginTop: spacingNum[4],
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacingNum[3],
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  secondaryActionsMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  secondaryLink: {
    paddingHorizontal: spacingNum[4],
    paddingVertical: spacingNum[3],
  },
  secondaryLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
  },
});
