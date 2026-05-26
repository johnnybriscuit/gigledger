import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAllocationTransactions } from '../hooks/useAllocationTransactions';
import { useAllocationBuckets } from '../hooks/useAllocationBuckets';
import { getGigDisplayName } from '../lib/gigDisplayName';
import type { GigWithPayer } from '../hooks/useGigs';

interface AllocationCardProps {
  visible: boolean;
  onDismiss: () => void;
  gig: GigWithPayer;
  onSetUpBuckets?: () => void;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export function AllocationCard({ visible, onDismiss, gig, onSetUpBuckets }: AllocationCardProps) {
  const { transactions, isLoading } = useAllocationTransactions({ gigId: gig.id });
  const { buckets } = useAllocationBuckets();

  const gigDisplayName = getGigDisplayName(gig);
  const netAmount = gig.net_amount ?? gig.gross_amount ?? 0;

  const enrichedRows = transactions.map(tx => {
    const bucket = buckets.find(b => b.id === tx.bucket_id);
    return {
      txId: tx.id,
      allocatedAmount: tx.allocated_amount,
      bucketName: bucket?.name ?? 'Unknown',
      bucketEmoji: bucket?.emoji ?? '💰',
      bucketColor: bucket?.color ?? '#6b7280',
      bucketType: bucket?.bucket_type ?? 'custom',
    };
  });

  const nonSpendableRows = enrichedRows.filter(r => r.bucketType !== 'spendable');
  const spendableRow = enrichedRows.find(r => r.bucketType === 'spendable');
  const transferAmount = Math.round(
    nonSpendableRows.reduce((sum, r) => sum + r.allocatedAmount, 0) * 100
  ) / 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.handle} />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Calculating your allocation...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <>
              <Text style={styles.title}>💰 Money Plan</Text>
              <Text style={styles.emptyMessage}>
                Set up your money plan to see where this payment goes
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => { onSetUpBuckets?.(); onDismiss(); }}
              >
                <Text style={styles.primaryButtonText}>Set up buckets</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostButton} onPress={onDismiss}>
                <Text style={styles.ghostButtonText}>Skip</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>💰 Payment Allocated</Text>
              <Text style={styles.gigName} numberOfLines={1}>{gigDisplayName}</Text>
              <Text style={styles.netAmount}>{formatCurrency(netAmount)}</Text>

              <View style={styles.rowList}>
                {nonSpendableRows.map(row => (
                  <View key={row.txId} style={styles.row}>
                    <Text style={styles.rowEmoji}>{row.bucketEmoji}</Text>
                    <Text style={styles.rowName}>{row.bucketName}</Text>
                    <Text style={[styles.rowAmount, { color: row.bucketColor || '#6b7280' }]}>
                      {formatCurrency(row.allocatedAmount)}
                    </Text>
                  </View>
                ))}
              </View>

              {spendableRow && (
                <View style={styles.spendableCard}>
                  <Text style={styles.spendableLabel}>
                    {spendableRow.bucketEmoji} {spendableRow.bucketName} — yours to spend
                  </Text>
                  <Text style={styles.spendableAmount}>
                    {formatCurrency(spendableRow.allocatedAmount)}
                  </Text>
                </View>
              )}

              {transferAmount > 0 && (
                <View style={styles.transferBox}>
                  <Text style={styles.transferText}>
                    Move{' '}
                    <Text style={styles.transferBold}>{formatCurrency(transferAmount)}</Text>
                    {' '}to your savings account
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={onDismiss}>
                <Text style={styles.primaryButtonText}>Got it</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  gigName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  rowList: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  rowEmoji: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  spendableCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  spendableLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 6,
  },
  spendableAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#059669',
  },
  transferBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  transferText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  transferBold: {
    fontWeight: '700',
    color: '#d97706',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ghostButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostButtonText: {
    fontSize: 15,
    color: '#6b7280',
  },
  emptyMessage: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 24,
  },
});
