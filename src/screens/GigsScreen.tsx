import React, { useState } from 'react';
import {
  View,
  Text,
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.gigTitle}>{item.title}</Text>
          <Text style={styles.payerName}>
            {item.payer?.name || 'Unknown Payer'}
          </Text>
          <Text style={styles.date}>{formatDate(item.date)}</Text>
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
          <View style={[styles.statusBadge, item.paid ? styles.statusPaid : styles.statusUnpaid]}>
            <Text style={[styles.statusText, !item.paid && styles.statusTextUnpaid]}>
              {item.paid ? '✓ Paid' : '⏳ Unpaid'}
            </Text>
          </View>
        </View>
      </View>

      {item.location && (
        <Text style={styles.location}>📍 {item.location}</Text>
      )}

      {(item.tips > 0 || item.fees > 0) && (
        <View style={styles.breakdown}>
          {item.tips > 0 && (
            <Text style={styles.breakdownItem}>
              Tips: +{formatCurrency(item.tips)}
            </Text>
          )}
          {item.fees > 0 && (
            <Text style={styles.breakdownItem}>
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
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onDelete}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  const { data: profile } = useQuery({
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading gigs</Text>
        <Text style={styles.errorDetail}>{(error as Error).message}</Text>
      </View>
    );
  }

  const totalGross = gigs?.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0) || 0;
  const totalNet = gigs?.reduce((sum, gig) => sum + (gig.net_amount || 0), 0) || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gigs</Text>
          <Text style={styles.subtitle}>
            {gigs?.length || 0} gigs • {formatCurrency(totalNet)} net
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => setImportModalVisible(true)}
          >
            <Text style={styles.importButtonText}>📥 Import</Text>
          </TouchableOpacity>
          {hasReachedFreeLimit ? (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradeClick}
            >
              <Text style={styles.upgradeButtonText}>⭐ Upgrade to add more</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddGigClick}
            >
              <Text style={styles.addButtonText}>+ Add Gig</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {gigs && gigs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No gigs yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start tracking your performances and income
          </Text>
        </View>
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
                    <Text style={styles.upgradeLink}>Upgrade</Text>
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
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  importButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  importButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  usageIndicator: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  upgradeLink: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  gigTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  payerName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: '#9ca3af',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  netAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  grossAmount: {
    fontSize: 12,
    color: '#6b7280',
  },
  taxAmount: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  breakdown: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  breakdownItem: {
    fontSize: 13,
    color: '#6b7280',
  },
  notes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
  },
  statusUnpaid: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  statusTextUnpaid: {
    color: '#991b1b',
  },
});
