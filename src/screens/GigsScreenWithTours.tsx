// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useGigs, useDeleteGig, useUpdateGig, type GigWithPayer } from '../hooks/useGigs';
import { useTours } from '../hooks/useTours';
import { AddGigModal } from '../components/AddGigModal';
import { CreateTourModal } from '../components/tours/CreateTourModal';
import { AddGigsToTourModal } from '../components/tours/AddGigsToTourModal';
import { CSVImportWizard } from '../components/csv/CSVImportWizard';
import { PaywallModal } from '../components/PaywallModal';
import { UsageLimitBanner } from '../components/UsageLimitBanner';
import { usePayers } from '../hooks/usePayers';
import { useGigTaxCalculation } from '../hooks/useGigTaxCalculation';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { SkeletonGigCard } from '../components/SkeletonCard';
import { H1, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';
import { getGigDisplayName } from '../lib/gigDisplayName';

// Gig card with tour badge
function GigCard({ 
  item, 
  onEdit, 
  onDelete,
  onRepeat,
  onTogglePaid,
  togglingGigId,
  formatDate,
  formatCurrency,
  isSelected,
  onSelect,
  selectionMode,
  tourName,
  onViewTour,
}: { 
  item: GigWithPayer; 
  onEdit: () => void;
  onDelete: () => void;
  onRepeat: () => void;
  onTogglePaid: (gig: GigWithPayer) => void;
  togglingGigId: string | null;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
  isSelected?: boolean;
  onSelect?: () => void;
  selectionMode?: boolean;
  tourName?: string;
  onViewTour?: () => void;
}) {
  const gross = item.gross_amount 
    + (item.tips || 0) 
    + (item.per_diem || 0) 
    + (item.other_income || 0);
  
  const subcontractorPaymentsTotal = (item.subcontractor_payments || []).reduce((sum, p) => sum + p.amount, 0);
  const expensesOnly = (item.expenses || []).reduce((sum, exp) => sum + exp.amount, 0) 
    + (item.fees || 0)
    + ((item.mileage || []).reduce((sum, m) => sum + (m.miles * 0.67), 0));
  const expensesTotal = expensesOnly + subcontractorPaymentsTotal;
  
  const netBeforeTax = gross - expensesTotal;
  
  const { taxResult } = useGigTaxCalculation(gross, expensesTotal);
  const taxToSetAside = taxResult?.setAside || 0;
  const isNoSeTaxMode = taxResult?.mode === 'no_se_tax';
  
  const takeHome = netBeforeTax - taxToSetAside;
  
  return (
    <Card 
      variant="elevated" 
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
    >
      <View style={styles.cardContent}>
        {/* Selection checkbox */}
        {selectionMode && (
          <TouchableOpacity 
            onPress={onSelect}
            style={styles.checkbox}
          >
            <View style={[
              styles.checkboxBox,
              isSelected && styles.checkboxBoxSelected,
            ]}>
              {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}

        {/* LEFT: Gig identity */}
        <View style={styles.gigInfo}>
          <H3>{getGigDisplayName(item)}</H3>
          <Text muted>{item.payer?.name || 'Unknown Payer'}</Text>
          <Text subtle>{formatDate(item.date)}</Text>
          {item.location && (
            <Text muted style={styles.location}>📍 {item.location}</Text>
          )}
          
          {/* Tour badge */}
          {tourName && (
            <TouchableOpacity 
              onPress={onViewTour}
              style={styles.tourBadgeWrapper}
            >
              <Badge variant="info" size="sm">
                🎸 {tourName}
              </Badge>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={() => onTogglePaid(item)}
            disabled={togglingGigId === item.id}
            style={[
              styles.statusBadgeWrapper,
              Platform.OS === 'web' && { cursor: togglingGigId === item.id ? 'wait' : 'pointer' } as any,
            ]}
            activeOpacity={0.7}
          >
            <Badge 
              variant={item.paid ? 'success' : 'warning'} 
              size="sm"
              style={styles.statusBadge}
            >
              {togglingGigId === item.id ? '⏳ Saving...' : item.paid ? '✓ Paid' : '⏳ Unpaid'}
            </Badge>
          </TouchableOpacity>
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
              <Text style={styles.moneyLabel}>
                {isNoSeTaxMode ? 'Tax tracking' : 'Set aside for taxes'}
              </Text>
              <Text style={styles.moneyValueAmber}>
                {formatCurrency(taxToSetAside)}
              </Text>
              <Text style={styles.moneyHint}>
                {isNoSeTaxMode
                  ? 'SE tax not calculated'
                  : netBeforeTax > 0 
                  ? `~${Math.round((taxToSetAside / netBeforeTax) * 100)}% rate`
                  : 'estimated'}
              </Text>
            </View>
          </View>

          <Text style={styles.breakdownText}>
            {formatCurrency(gross)} gross
            {expensesOnly > 0 && <> − {formatCurrency(expensesOnly)} expenses</>}
            {subcontractorPaymentsTotal > 0 && <> − {formatCurrency(subcontractorPaymentsTotal)} subs</>}
            {taxToSetAside > 0 && <> − {formatCurrency(taxToSetAside)} taxes</>}
            {' = '}
            {formatCurrency(takeHome)}
          </Text>
        </View>
      </View>

      {/* Edit/Delete/Repeat actions */}
      {!selectionMode && (
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onEdit}
          >
            <Text semibold style={{ color: colors.brand.DEFAULT }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onRepeat}
          >
            <Text semibold style={{ color: colors.brand.DEFAULT }}>Repeat</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onDelete}
          >
            <Text semibold style={{ color: colors.danger.DEFAULT }}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

interface GigsScreenProps {
  onNavigateToSubscription?: () => void;
  onNavigateToTourDetail?: (tourId: string) => void;
}

export function GigsScreen({ onNavigateToSubscription, onNavigateToTourDetail }: GigsScreenProps = {}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [editingGig, setEditingGig] = useState<GigWithPayer | null>(null);
  const [duplicatingGig, setDuplicatingGig] = useState<GigWithPayer | null>(null);
  const [togglingGigId, setTogglingGigId] = useState<string | null>(null);
  
  // Tour management state
  const [createTourModalVisible, setCreateTourModalVisible] = useState(false);
  const [addGigsToTourModalVisible, setAddGigsToTourModalVisible] = useState(false);
  const [selectedTourForAdding, setSelectedTourForAdding] = useState<string | null>(null);
  const [tourFilter, setTourFilter] = useState<string | 'all' | 'none'>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGigIds, setSelectedGigIds] = useState<Set<string>>(new Set());
  
  const { data: gigs, isLoading, error } = useGigs();
  const { data: tours } = useTours();
  const { data: payers } = usePayers();
  
  const deleteGig = useDeleteGig();
  const updateGig = useUpdateGig();

  const gigCount = gigs?.length || 0;
  const planLimits = usePlanLimits(gigCount, 0);
  
  const { isFreePlan, hasReachedGigLimit, maxGigs, gigsRemaining } = planLimits;

  // Filter gigs by tour
  const filteredGigs = useMemo(() => {
    if (!gigs) return [];
    if (tourFilter === 'all') return gigs;
    if (tourFilter === 'none') return gigs.filter(g => !g.tour_id);
    return gigs.filter(g => g.tour_id === tourFilter);
  }, [gigs, tourFilter]);

  // Get tour name for a gig
  const getTourName = (tourId: string | null) => {
    if (!tourId || !tours) return undefined;
    return tours.find(t => t.id === tourId)?.name;
  };

  const handleDelete = (id: string, displayName: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${displayName}"?`)) {
        deleteGig.mutate(id);
      }
    } else {
      Alert.alert(
        'Delete Gig',
        `Are you sure you want to delete "${displayName}"?`,
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
    setDuplicatingGig(null);
    setModalVisible(true);
  };

  const handleRepeat = (gig: GigWithPayer) => {
    setDuplicatingGig(gig);
    setEditingGig(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingGig(null);
    setDuplicatingGig(null);
  };

  const handleTogglePaid = async (gig: GigWithPayer) => {
    setTogglingGigId(gig.id);
    
    try {
      const newPaidStatus = !gig.paid;
      await updateGig.mutateAsync({
        id: gig.id,
        paid: newPaidStatus,
      });
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert("Couldn't update payment status. Try again.");
      } else {
        Alert.alert('Error', "Couldn't update payment status. Try again.");
      }
    } finally {
      setTogglingGigId(null);
    }
  };

  const handleAddGigClick = () => {
    if (hasReachedGigLimit) {
      setShowPaywallModal(true);
      return;
    }
    setModalVisible(true);
  };

  const handleUpgradeClick = () => {
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
    } else if (Platform.OS === 'web') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'subscription');
      window.history.pushState({}, '', currentUrl.toString());
      window.dispatchEvent(new CustomEvent('tabChange', { detail: 'subscription' }));
    }
  };

  // Tour management handlers
  const handleToggleSelection = (gigId: string) => {
    const newSelected = new Set(selectedGigIds);
    if (newSelected.has(gigId)) {
      newSelected.delete(gigId);
    } else {
      newSelected.add(gigId);
    }
    setSelectedGigIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGigIds.size === filteredGigs.length) {
      setSelectedGigIds(new Set());
    } else {
      setSelectedGigIds(new Set(filteredGigs.map(g => g.id)));
    }
  };

  const handleAssignToTour = () => {
    if (selectedGigIds.size === 0) return;
    setAddGigsToTourModalVisible(true);
  };

  const handleRemoveFromTour = async () => {
    if (selectedGigIds.size === 0) return;
    
    const confirmMessage = `Remove ${selectedGigIds.size} gig(s) from their tour?`;
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(confirmMessage)
      : await new Promise(resolve => {
          Alert.alert('Remove from Tour', confirmMessage, [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Remove', onPress: () => resolve(true), style: 'destructive' },
          ]);
        });
    
    if (!confirmed) return;

    try {
      for (const gigId of selectedGigIds) {
        await updateGig.mutateAsync({
          id: gigId,
          tour_id: null,
        });
      }
      setSelectedGigIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert("Couldn't remove gigs from tour. Try again.");
      } else {
        Alert.alert('Error', "Couldn't remove gigs from tour. Try again.");
      }
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return formatDateUtil(date);
  };

  const formatCurrency = formatCurrencyUtil;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <H1>Gigs</H1>
          <Text muted>Loading...</Text>
        </View>
        <View style={styles.listContent}>
          <SkeletonGigCard />
          <SkeletonGigCard />
          <SkeletonGigCard />
        </View>
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

  const totalNet = filteredGigs?.reduce((sum, gig) => {
    const gigExpensesTotal = (gig.expenses || []).reduce((expSum, exp) => expSum + exp.amount, 0);
    const actualNet = gig.gross_amount 
      + (gig.tips || 0) 
      + (gig.per_diem || 0) 
      + (gig.other_income || 0) 
      - (gig.fees || 0)
      - gigExpensesTotal;
    return sum + actualNet;
  }, 0) || 0;

  const selectedGigsOnTour = Array.from(selectedGigIds).some(id => {
    const gig = gigs?.find(g => g.id === id);
    return gig?.tour_id != null;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <H1>Gigs</H1>
          <Text muted>
            {filteredGigs?.length || 0} gigs • {formatCurrency(totalNet)} net
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {!selectionMode && (
            <>
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
            </>
          )}
        </View>
      </View>

      {/* Tour controls bar */}
      <View style={styles.tourControls}>
        <View style={styles.tourControlsLeft}>
          {/* Tour filter dropdown */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Filter:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, tourFilter === 'all' && styles.filterButtonActive]}
                onPress={() => setTourFilter('all')}
              >
                <Text style={[styles.filterButtonText, tourFilter === 'all' && styles.filterButtonTextActive]}>
                  All gigs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, tourFilter === 'none' && styles.filterButtonActive]}
                onPress={() => setTourFilter('none')}
              >
                <Text style={[styles.filterButtonText, tourFilter === 'none' && styles.filterButtonTextActive]}>
                  No tour
                </Text>
              </TouchableOpacity>
              {tours?.map(tour => (
                <TouchableOpacity
                  key={tour.id}
                  style={[styles.filterButton, tourFilter === tour.id && styles.filterButtonActive]}
                  onPress={() => setTourFilter(tour.id)}
                >
                  <Text style={[styles.filterButtonText, tourFilter === tour.id && styles.filterButtonTextActive]}>
                    🎸 {tour.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* View tour summary button */}
          {tourFilter !== 'all' && tourFilter !== 'none' && onNavigateToTourDetail && (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => onNavigateToTourDetail(tourFilter)}
            >
              View Tour Summary
            </Button>
          )}
        </View>

        <View style={styles.tourControlsRight}>
          {!selectionMode ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setCreateTourModalVisible(true)}
              >
                + Create Tour
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
                  setSelectionMode(true);
                  setSelectedGigIds(new Set());
                }}
              >
                Assign to Tour
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.selectionCount}>
                {selectedGigIds.size} selected
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onPress={handleSelectAll}
              >
                {selectedGigIds.size === filteredGigs.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={handleAssignToTour}
                disabled={selectedGigIds.size === 0}
              >
                Add to Tour
              </Button>
              {selectedGigsOnTour && (
                <Button
                  variant="danger"
                  size="sm"
                  onPress={handleRemoveFromTour}
                  disabled={selectedGigIds.size === 0}
                >
                  Remove from Tour
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
                  setSelectionMode(false);
                  setSelectedGigIds(new Set());
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </View>
      </View>

      {/* Usage Banner */}
      {isFreePlan && (
        <View style={styles.bannerWrapper}>
          <UsageLimitBanner
            label="gigs"
            usedCount={gigCount}
            limitCount={7}
            onUpgradePress={handleUpgradeClick}
          />
        </View>
      )}

      {filteredGigs && filteredGigs.length === 0 ? (
        <EmptyState
          title={tourFilter === 'all' ? "No gigs yet" : tourFilter === 'none' ? "No gigs without a tour" : "No gigs in this tour"}
          description={tourFilter === 'all' ? "Start tracking your performances and income" : "Try a different filter"}
          action={tourFilter === 'all' ? {
            label: 'Add Gig',
            onPress: handleAddGigClick,
          } : undefined}
        />
      ) : (
        <FlatList
          data={filteredGigs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <GigCard
              item={item}
              onEdit={() => handleEdit(item)}
              onRepeat={() => handleRepeat(item)}
              onDelete={() => handleDelete(item.id, getGigDisplayName(item))}
              onTogglePaid={handleTogglePaid}
              togglingGigId={togglingGigId}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              isSelected={selectedGigIds.has(item.id)}
              onSelect={() => handleToggleSelection(item.id)}
              selectionMode={selectionMode}
              tourName={getTourName(item.tour_id)}
              onViewTour={item.tour_id && onNavigateToTourDetail ? () => onNavigateToTourDetail(item.tour_id!) : undefined}
            />
          )}
        />
      )}

      <AddGigModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingGig={editingGig}
        duplicatingGig={duplicatingGig}
      />
      
      <CSVImportWizard
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImportComplete={(count) => {
          setImportModalVisible(false);
        }}
        existingPayers={payers?.map(p => ({ id: p.id, name: p.name })) || []}
        existingGigs={gigs?.map(g => ({
          id: g.id,
          date: g.date,
          payer_id: g.payer_id,
          payer_name: g.payer?.name || '',
          gross: g.gross_amount,
          title: g.title ?? undefined,
        })) || []}
      />
      
      {showPaywallModal && (
        <PaywallModal
          visible={showPaywallModal}
          reason="gig_limit"
          onClose={() => setShowPaywallModal(false)}
          onUpgrade={() => {
            setShowPaywallModal(false);
            handleUpgradeClick();
          }}
        />
      )}

      <CreateTourModal
        visible={createTourModalVisible}
        onClose={() => setCreateTourModalVisible(false)}
      />

      {addGigsToTourModalVisible && selectedGigIds.size > 0 && (
        <AddGigsToTourModal
          visible={addGigsToTourModalVisible}
          tourId="" // Empty means we'll show tour picker
          onClose={() => {
            setAddGigsToTourModalVisible(false);
            setSelectionMode(false);
            setSelectedGigIds(new Set());
          }}
          preSelectedGigIds={Array.from(selectedGigIds)}
        />
      )}
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
  tourControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: parseInt(spacing[5]),
    paddingVertical: parseInt(spacing[3]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    flexWrap: 'wrap',
    gap: parseInt(spacing[3]),
  },
  tourControlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[3]),
    flex: 1,
    flexWrap: 'wrap',
  },
  tourControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
    flexWrap: 'wrap',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: parseInt(spacing[1]),
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: parseInt(spacing[2]),
    borderRadius: parseInt(radius.md),
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  filterButtonActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  filterButtonText: {
    fontSize: 13,
    color: colors.text.DEFAULT,
    fontWeight: typography.fontWeight.medium,
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: typography.fontWeight.semibold,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  listContent: {
    padding: parseInt(spacing[4]),
  },
  bannerWrapper: {
    padding: parseInt(spacing[4]),
    paddingBottom: 0,
  },
  card: {
    marginBottom: parseInt(spacing[3]),
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.brand.DEFAULT,
  },
  cardContent: {
    flexDirection: 'row',
    gap: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[3]),
  },
  checkbox: {
    paddingTop: parseInt(spacing[1]),
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxSelected: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
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
  tourBadgeWrapper: {
    alignSelf: 'flex-start',
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
  statusBadgeWrapper: {
    alignSelf: 'flex-start',
    marginTop: parseInt(spacing[2]),
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
});
