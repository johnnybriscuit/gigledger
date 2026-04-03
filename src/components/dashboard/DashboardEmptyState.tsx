import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacingNum, radiusNum } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';

interface StepCardProps {
  step: string;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  primary?: boolean;
}

const StepCard: React.FC<StepCardProps> = ({ step, title, description, buttonText, onClick, primary = false }) => {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <Text style={styles.stepDescription}>{description}</Text>
      <TouchableOpacity
        style={[styles.stepButton, primary && styles.stepButtonPrimary]}
        onPress={onClick}
      >
        <Text style={[styles.stepButtonText, primary && styles.stepButtonTextPrimary]}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

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
          Let’s log your first gig so your dashboard, tax estimates, and reports can start working for you.
        </Text>
      </View>

      <View style={[styles.stepsContainer, isMobile && styles.stepsContainerMobile]}>
        <StepCard
          step="1"
          title="Add a contact"
          description="Create a payer (venue, client, or platform) so your gig has someone attached to it."
          buttonText="Add Contact"
          onClick={onAddContact}
        />

        <StepCard
          step="2"
          title="Log your first gig"
          description="Add date + amount to create your first income record. You can fill in extras later."
          buttonText="+ Add Gig"
          onClick={onAddGig}
          primary
        />

        <StepCard
          step="3"
          title="Review your gigs"
          description="Open the Gigs tab anytime to edit details, mark gigs paid, and keep everything organized."
          buttonText="Open Gigs"
          onClick={onOpenGigs}
        />
      </View>

      <Text style={styles.exploreMessage}>
        Tip: Start simple with one gig — you can always add more detail later.
      </Text>
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
    marginBottom: spacingNum[8],
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
  stepsContainer: {
    flexDirection: 'row',
    gap: spacingNum[5],
    marginBottom: spacingNum[8],
    maxWidth: 1200,
    width: '100%',
  },
  stepsContainerMobile: {
    flexDirection: 'column',
  },
  stepCard: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusNum.lg,
    padding: spacingNum[6],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    minHeight: 220,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingNum[3],
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNum[3],
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.hover,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacingNum[5],
    lineHeight: 20,
    flex: 1,
  },
  stepButton: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacingNum[5],
    paddingVertical: spacingNum[3],
    borderRadius: radiusNum.md,
    alignItems: 'center',
  },
  stepButtonPrimary: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  stepButtonText: {
    color: colors.text.DEFAULT,
    fontSize: 14,
    fontWeight: '600',
  },
  stepButtonTextPrimary: {
    color: colors.brand.foreground,
  },
  exploreMessage: {
    fontSize: 14,
    color: colors.text.subtle,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
