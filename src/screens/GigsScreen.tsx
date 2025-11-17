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
import { useWithholding } from '../hooks/useWithholding';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FREE_GIG_LIMIT } from '../config/plans';
import { H1, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';

// Separate component for gig card to use hooks
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
  // Use withholding hook for this specific gig
  const { breakdown } = useWithholding(item.net_amount);
  
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <H3>{item.title}</H3>
          <Text muted>
            {item.payer?.name || 'Unknown Payer'}
          </Text>
          <Text subtle>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.netAmount}>
            {formatCurrency(item.net_amount)}
          </Text>
          <Text style={styles.grossAmount}>
            Gross: {formatCurrency(item.gross_amount)}
          </Text>
          <Text style={styles.taxAmount}>
            Tax to set aside: {formatCurrency(breakdown?.total || 0)}
          </Text>
          {/* Payment Status Badge */}
          <Badge 
            variant={item.paid ? 'success' : 'warning'} 
            size="sm"
            style={styles.statusBadge}
          >
            {item.paid ? '✓ Paid' : '⏳ Unpaid'}
          </Badge>
        </View>
      </View>

      {item.location && (
        <Text muted style={styles.location}>📍 {item.location}</Text>
      )}

      {(item.tips > 0 || item.fees > 0) && (
        <View style={styles.breakdown}>
          {item.tips > 0 && (
            <Text muted>
              Tips: +{formatCurrency(item.tips)}
            </Text>
          )}
          {item.fees > 0 && (
            <Text muted>
              Fees: -{formatCurrency(item.fees)}
            </Text>
          )}
        </View>
      )}

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

  // Fetch user's plan
  const { data: profile } = useQuery<{ id: string; plan: string } | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, plan')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const userPlan = profile?.plan || 'free';
  const gigCount = gigs?.length || 0;
  const isFreePlan = userPlan === 'free';
  const hasReachedFreeLimit = isFreePlan && gigCount >= FREE_GIG_LIMIT;

  // Debug logging
  console.log('GigLedger plan debug:', profile?.id, profile?.plan, gigCount);

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
    if (hasReachedFreeLimit) {
      // Don't open modal if at limit
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
  const totalNet = gigs?.reduce((sum, gig) => sum + (gig.net_amount || 0), 0) || 0;

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
          {hasReachedFreeLimit ? (
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
                    You've used {gigCount} of {FREE_GIG_LIMIT} gigs on the free plan
                  </Text>
                  <TouchableOpacity onPress={handleUpgradeClick}>
                    <Text semibold style={{ color: colors.brand.DEFAULT }}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${Math.min((gigCount / FREE_GIG_LIMIT) * 100, 100)}%` }
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: parseInt(spacing[3]),
  },
  cardInfo: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: parseInt(spacing[1]),
  },
  netAmount: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    color: colors.success.DEFAULT,
  },
  grossAmount: {
    fontSize: parseInt(typography.fontSize.caption.size),
    color: colors.text.muted,
  },
  taxAmount: {
    fontSize: 11,
    color: colors.warning.DEFAULT,
    fontWeight: typography.fontWeight.semibold,
  },
  location: {
    marginBottom: parseInt(spacing[2]),
  },
  breakdown: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
    marginBottom: parseInt(spacing[2]),
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
    alignSelf: 'flex-end',
    marginTop: parseInt(spacing[2]),
  },
});
