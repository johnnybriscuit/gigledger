import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useGigs, useDeleteGig, type GigWithPayer } from '../hooks/useGigs';
import { AddGigModal } from '../components/AddGigModal';
import { ImportGigsModal } from '../components/ImportGigsModal';
import { useGigTaxCalculation } from '../hooks/useGigTaxCalculation';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { H1, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';

// Gig card: shows a single gig in the Gigs list
// Emphasizes take-home pay and tax set-aside
function GigCard({ 
  item, 
  onEdit, 
  onDelete,
  formatDate,
  formatCurrency 
}: { 
  item: GigWithPayer; 
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
}) {
  // Derived money fields
  const gross = item.gross_amount 
    + (item.tips || 0) 
    + (item.per_diem || 0) 
    + (item.other_income || 0);
  
  const expensesTotal = (item.expenses || []).reduce((sum, exp) => sum + exp.amount, 0) 
    + (item.fees || 0)
    + ((item.mileage || []).reduce((sum, m) => sum + (m.miles * 0.67), 0)); // Standard mileage rate
  
  const netBeforeTax = gross - expensesTotal;
  
  // Use new 2025 tax engine for accurate tax calculation (same as Edit Gig form)
  const { taxResult } = useGigTaxCalculation(gross, expensesTotal);
  const taxToSetAside = taxResult?.setAside || 0;
  
  const takeHome = netBeforeTax - taxToSetAside;
  
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.cardContent}>
        {/* LEFT: Gig identity */}
        <View style={styles.gigInfo}>
          <H3>{item.title}</H3>
          <Text muted>{item.payer?.name || 'Unknown Payer'}</Text>
          <Text subtle>{formatDate(item.date)}</Text>
          {item.location && (
            <Text muted style={styles.location}>📍 {item.location}</Text>
          )}
          <Badge 
            variant={item.paid ? 'success' : 'warning'} 
            size="sm"
            style={styles.statusBadge}
          >
            {item.paid ? '✓ Paid' : '⏳ Unpaid'}
          </Badge>
        </View>

        {/* RIGHT: Money summary */}
        <View style={styles.moneySummary}>
          <View style={styles.moneyRow}>
            <View style={styles.moneyBlock}>
              <Text style={styles.moneyLabel}>Estimated take-home</Text>
              <Text style={styles.moneyValueGreen}>
                {formatCurrency(takeHome)}
              </Text>
              <Text style={styles.moneyHint}>after expenses & taxes</Text>
            </View>

            <View style={styles.moneyBlock}>
              <Text style={styles.moneyLabel}>Set aside for taxes</Text>
              <Text style={styles.moneyValueAmber}>
                {formatCurrency(taxToSetAside)}
              </Text>
              <Text style={styles.moneyHint}>
                {netBeforeTax > 0 
                  ? `~${Math.round((taxToSetAside / netBeforeTax) * 100)}% rate`
                  : 'estimated'}
              </Text>
            </View>
          </View>

          <Text style={styles.breakdownText}>
            {formatCurrency(gross)} gross
            {expensesTotal > 0 && <> − {formatCurrency(expensesTotal)} expenses</>}
            {taxToSetAside > 0 && <> − {formatCurrency(taxToSetAside)} taxes</>}
            {' = '}
            {formatCurrency(takeHome)}
          </Text>
        </View>
      </View>

      {/* Edit/Delete actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onEdit}
        >
          <Text semibold style={{ color: colors.brand.DEFAULT }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onDelete}
        >
          <Text semibold style={{ color: colors.danger.DEFAULT }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

interface GigsScreenProps {
  onNavigateToSubscription?: () => void;
}

export function GigsScreen({ onNavigateToSubscription }: GigsScreenProps = {}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingGig, setEditingGig] = useState<GigWithPayer | null>(null);
  
  const { data: gigs, isLoading, error } = useGigs();
  const deleteGig = useDeleteGig();

  // Use unified plan limits hook (reads from subscriptions table, same as SubscriptionScreen)
  const gigCount = gigs?.length || 0;
  const planLimits = usePlanLimits(gigCount, 0);
  
  const { isFreePlan, hasReachedGigLimit, maxGigs, gigsRemaining } = planLimits;

  const handleDelete = (id: string, title: string) => {
    if (Platform.OS === 'web') {
      // Use window.confirm on web
      if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
        deleteGig.mutate(id);
      }
    } else {
      // Use Alert.alert on native
      Alert.alert(
        'Delete Gig',
        `Are you sure you want to delete "${title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteGig.mutate(id),
          },
        ]
      );
    }
  };

  const handleEdit = (gig: GigWithPayer) => {
    setEditingGig(gig);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingGig(null);
  };

  const handleAddGigClick = () => {
    if (hasReachedGigLimit) {
      // Don't open modal if at free plan limit
      return;
    }
    setModalVisible(true);
  };

  const handleUpgradeClick = () => {
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
    }
  };

  const formatDate = (dateString: string) => {
    // Parse date as local date to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatDateUtil(date);
  };

  const formatCurrency = formatCurrencyUtil;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <H3 style={{ color: colors.danger.DEFAULT }}>Error loading gigs</H3>
        <Text muted>{(error as Error).message}</Text>
      </View>
    );
  }

  const totalGross = gigs?.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0) || 0;
  // Calculate total net including gig expenses
  const totalNet = gigs?.reduce((sum, gig) => {
    const gigExpensesTotal = (gig.expenses || []).reduce((expSum, exp) => expSum + exp.amount, 0);
    const actualNet = gig.gross_amount 
      + (gig.tips || 0) 
      + (gig.per_diem || 0) 
      + (gig.other_income || 0) 
      - (gig.fees || 0)
      - gigExpensesTotal;
    return sum + actualNet;
  }, 0) || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <H1>Gigs</H1>
          <Text muted>
            {gigs?.length || 0} gigs • {formatCurrency(totalNet)} net
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setImportModalVisible(true)}
          >
            📥 Import
          </Button>
          {hasReachedGigLimit ? (
            <Button
              variant="success"
              size="sm"
              onPress={handleUpgradeClick}
            >
              ⭐ Upgrade to add more
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onPress={handleAddGigClick}
            >
              + Add Gig
            </Button>
          )}
        </View>
      </View>

      {gigs && gigs.length === 0 ? (
        <EmptyState
          title="No gigs yet"
          description="Start tracking your performances and income"
          action={{
            label: 'Add Gig',
            onPress: handleAddGigClick,
          }}
        />
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            isFreePlan ? (
              <View style={styles.usageIndicator}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageText}>
                    You've used {gigCount} of {maxGigs} gigs on the free plan
                  </Text>
                  <TouchableOpacity onPress={handleUpgradeClick}>
                    <Text semibold style={{ color: colors.brand.DEFAULT }}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${Math.min((gigCount / maxGigs) * 100, 100)}%` }
                    ]} 
                  />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <GigCard
              item={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id, item.title)}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          )}
        />
      )}

      <AddGigModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingGig={editingGig}
      />
      
      <ImportGigsModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
    gap: parseInt(spacing[2]),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: parseInt(spacing[5]),
    paddingVertical: parseInt(spacing[4]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: parseInt(spacing[2]),
  },
  listContent: {
    padding: parseInt(spacing[4]),
  },
  usageIndicator: {
    backgroundColor: colors.warning.muted,
    borderRadius: parseInt(radius.sm),
    padding: parseInt(spacing[3]),
    marginBottom: parseInt(spacing[4]),
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[2]),
  },
  usageText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: '#92400e',
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warning.DEFAULT,
  },
  card: {
    marginBottom: parseInt(spacing[3]),
  },
  cardContent: {
    flexDirection: 'row',
    gap: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[3]),
  },
  gigInfo: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  moneySummary: {
    flex: 1.2,
    gap: parseInt(spacing[2]),
  },
  moneyRow: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
  },
  moneyBlock: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  moneyLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moneyValueGreen: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.success.DEFAULT,
    lineHeight: 32,
  },
  moneyValueAmber: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning.DEFAULT,
    lineHeight: 32,
  },
  moneyHint: {
    fontSize: 10,
    color: colors.text.subtle,
  },
  breakdownText: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 18,
  },
  location: {
    marginTop: parseInt(spacing[1]),
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: parseInt(spacing[4]),
    paddingTop: parseInt(spacing[3]),
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  actionButton: {
    paddingHorizontal: parseInt(spacing[2]),
    paddingVertical: parseInt(spacing[1]),
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: parseInt(spacing[2]),
  },
});
