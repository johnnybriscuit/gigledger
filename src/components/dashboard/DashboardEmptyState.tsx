import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacingNum, radiusNum } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, buttonText, onClick }) => {
  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
      <TouchableOpacity style={styles.actionButton} onPress={onClick}>
        <Text style={styles.actionButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

interface DashboardEmptyStateProps {
  onAddContact: () => void;
  onAddGig: () => void;
  onAddExpense: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onAddContact,
  onAddGig,
  onAddExpense,
}) => {
  const { isMobile } = useResponsive();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>Welcome to GigLedger! 👋</Text>
        <Text style={styles.welcomeSubtitle}>
          You're all set up. Here's what you can do next:
        </Text>
      </View>

      <View style={[styles.actionCards, isMobile && styles.actionCardsMobile]}>
        <ActionCard
          icon="📇"
          title="Add Your First Contact"
          description="Track clients, venues, and platforms you work with."
          buttonText="+ Add Contact"
          onClick={onAddContact}
        />

        <ActionCard
          icon="🎸"
          title="Log Your First Gig"
          description="Start tracking your income and stay organized for taxes."
          buttonText="+ Add Gig"
          onClick={onAddGig}
        />

        <ActionCard
          icon="💰"
          title="Add an Expense"
          description="Log business expenses to maximize deductions."
          buttonText="+ Add Expense"
          onClick={onAddExpense}
        />
      </View>

      <Text style={styles.exploreMessage}>
        Or explore at your own pace - we'll be here when you're ready!
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
    marginBottom: spacingNum[10],
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    marginBottom: spacingNum[3],
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
    maxWidth: 600,
  },
  actionCards: {
    flexDirection: 'row',
    gap: spacingNum[6],
    marginBottom: spacingNum[10],
    maxWidth: 1200,
    width: '100%',
  },
  actionCardsMobile: {
    flexDirection: 'column',
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusNum.lg,
    padding: spacingNum[8],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 48,
    marginBottom: spacingNum[4],
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    marginBottom: spacingNum[3],
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacingNum[6],
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: colors.success.DEFAULT,
    paddingHorizontal: spacingNum[6],
    paddingVertical: spacingNum[4],
    borderRadius: radiusNum.md,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  exploreMessage: {
    fontSize: 14,
    color: colors.text.subtle,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
