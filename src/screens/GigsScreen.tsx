import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useGigs, useDeleteGig, useUpdateGig, type GigWithPayer } from '../hooks/useGigs';
import { useTours, useRemoveGigFromTour } from '../hooks/useTours';
import { AddGigModal } from '../components/AddGigModal';
import { CreateTourModal } from '../components/tours/CreateTourModal';
import { AssignGigsToTourModal } from '../components/tours/AssignGigsToTourModal';
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

// Gig card: shows a single gig in the Gigs list
// Emphasizes take-home pay and tax set-aside
function GigCard({ 
  item, 
  onEdit, 
  onDelete,
  onRepeat,
  onTogglePaid,
  togglingGigId,
  formatDate,
  formatCurrency,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  tourName,
  tourId,
}: { 
  item: GigWithPayer; 
  onEdit: () => void;
  onDelete: () => void;
  onRepeat: () => void;
  onTogglePaid: (gig: GigWithPayer) => void;
  togglingGigId: string | null;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  tourName?: string;
  tourId?: string;
}) {
  // Derived money fields
  const gross = item.gross_amount 
    + (item.tips || 0) 
    + (item.per_diem || 0) 
    + (item.other_income || 0);
  
  const subcontractorPaymentsTotal = (item.subcontractor_payments || []).reduce((sum, p) => sum + p.amount, 0);
  const expensesOnly = (item.expenses || []).reduce((sum, exp) => sum + exp.amount, 0) 
    + (item.fees || 0)
    + ((item.mileage || []).reduce((sum, m) => sum + (m.miles * 0.67), 0)); // Standard mileage rate
  const expensesTotal = expensesOnly + subcontractorPaymentsTotal;
  
  const netBeforeTax = gross - expensesTotal;
  
  const { taxResult } = useGigTaxCalculation(gross, expensesTotal);
  const taxToSetAside = taxResult?.setAside || 0;
  const isNoSeTaxMode = taxResult?.mode === 'no_se_tax';
  
  const takeHome = netBeforeTax - taxToSetAside;
  
  const handleCardPress = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection();
    } else if (!isSelectionMode) {
      onEdit();
    }
  };
  
  return (
    <TouchableOpacity
      activeOpacity={isSelectionMode ? 0.7 : 1}
      onPress={isSelectionMode ? handleCardPress : undefined}
      disabled={!isSelectionMode}
    >
      <Card 
        variant="elevated" 
        style={
          isSelected 
            ? StyleSheet.flatten([styles.card, styles.cardSelected])
            : styles.card
        }
      >
        <View style={styles.cardContent}>
          {/* Checkbox in selection mode */}
          {isSelectionMode && (
            <TouchableOpacity 
              onPress={onToggleSelection}
              style={styles.checkbox}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={[
                styles.checkboxBox,
                isSelected && styles.checkboxBoxChecked,
              ]}>
                {isSelected && (
                  <Text style={styles.checkboxCheck}>✓</Text>
                )}
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

      {/* Edit/Delete/Repeat actions + Tour badge */}
      <View style={styles.cardActions}>
        {tourName && tourId && (
          <TouchableOpacity
            style={styles.tourBadgeButton}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.location.href = `/tours/${tourId}`;
              }
            }}
            activeOpacity={0.7}
          >
            <Badge variant="neutral" size="sm">
              🎸 {tourName}
            </Badge>
          </TouchableOpacity>
        )}
        <View style={styles.cardActionsRight}>
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
      </View>
      </Card>
    </TouchableOpacity>
  );
}

interface GigsScreenProps {
  onNavigateToSubscription?: () => void;
}

export function GigsScreen({ onNavigateToSubscription }: GigsScreenProps = {}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [createTourModalVisible, setCreateTourModalVisible] = useState(false);
  const [assignToTourModalVisible, setAssignToTourModalVisible] = useState(false);
  const [editingGig, setEditingGig] = useState<GigWithPayer | null>(null);
  const [duplicatingGig, setDuplicatingGig] = useState<GigWithPayer | null>(null);
  const [togglingGigId, setTogglingGigId] = useState<string | null>(null);
  
  // Tour filter state: 'all' | 'none' | tourId (UUID string)
  const [tourFilter, setTourFilter] = useState<'all' | 'none' | string>('all');
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGigIds, setSelectedGigIds] = useState<string[]>([]);
  
  const { data: gigs, isLoading, error } = useGigs();
  const { data: payers } = usePayers();
  const { data: tours, isLoading: toursLoading } = useTours();
  
  const deleteGig = useDeleteGig();
  const updateGig = useUpdateGig();
  const removeGigFromTour = useRemoveGigFromTour();

  // Use unified plan limits hook (reads from subscriptions table, same as SubscriptionScreen)
  const gigCount = gigs?.length || 0;
  const planLimits = usePlanLimits(gigCount, 0);
  
  const { isFreePlan, hasReachedGigLimit, maxGigs, gigsRemaining } = planLimits;

  const handleDelete = (id: string, displayName: string) => {
    if (Platform.OS === 'web') {
      // Use window.confirm on web
      if (window.confirm(`Are you sure you want to delete "${displayName}"?`)) {
        deleteGig.mutate(id);
      }
    } else {
      // Use Alert.alert on native
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
      
      // Success feedback (optional toast could be added here)
    } catch (error: any) {
      // Error feedback
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
      // Show paywall modal instead of silently failing
      setShowPaywallModal(true);
      return;
    }
    setModalVisible(true);
  };

  const handleUpgradeClick = () => {
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
    } else if (Platform.OS === 'web') {
      // Direct web navigation to subscription page
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'subscription');
      window.history.pushState({}, '', currentUrl.toString());
      window.dispatchEvent(new CustomEvent('tabChange', { detail: 'subscription' }));
    }
  };

  // Selection mode handlers
  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedGigIds([]);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedGigIds([]);
  };

  const handleToggleGigSelection = (gigId: string) => {
    setSelectedGigIds(prev => {
      if (prev.includes(gigId)) {
        return prev.filter(id => id !== gigId);
      } else {
        return [...prev, gigId];
      }
    });
  };

  // Bulk action handlers
  const handleAddToTour = () => {
    if (selectedGigIds.length === 0) return;
    setAssignToTourModalVisible(true);
  };

  const handleRemoveFromTour = async () => {
    if (selectedGigIds.length === 0) return;

    const confirmMessage = `Remove ${selectedGigIds.length} gig${selectedGigIds.length !== 1 ? 's' : ''} from their tours? This cannot be undone.`;
    
    const confirmed = Platform.OS === 'web'
      ? window.confirm(confirmMessage)
      : await new Promise<boolean>(resolve => {
          Alert.alert(
            'Remove from Tours',
            confirmMessage,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Remove', onPress: () => resolve(true), style: 'destructive' },
            ]
          );
        });

    if (!confirmed) return;

    try {
      // Remove each gig from its tour
      for (const gigId of selectedGigIds) {
        await removeGigFromTour.mutateAsync({ gigId });
      }
      // Exit selection mode and clear selections
      setIsSelectionMode(false);
      setSelectedGigIds([]);
    } catch (error) {
      console.error('Failed to remove gigs from tours:', error);
      if (Platform.OS === 'web') {
        window.alert("Couldn't remove gigs from tours. Try again.");
      } else {
        Alert.alert('Error', "Couldn't remove gigs from tours. Try again.");
      }
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
      <View style={styles.container}>
        <View style={styles.header}>
          <H1>Gigs</H1>
          <Text muted>Loading...</Text>
        </View>
        <View style={styles.listContent}>
          <SkeletonGigCard />
          <SkeletonGigCard />
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

  // Filter gigs based on tour filter
  const filteredGigs = gigs?.filter(gig => {
    if (tourFilter === 'all') return true;
    if (tourFilter === 'none') return !gig.tour_id;
    return gig.tour_id === tourFilter;
  }) || [];

  // Check if all selected gigs have tours (must be AFTER filteredGigs is defined)
  const allSelectedHaveTour = selectedGigIds.length > 0 && selectedGigIds.every(id => {
    const gig = filteredGigs?.find(g => g.id === id);
    return gig?.tour_id != null;
  });

  const totalGross = filteredGigs?.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0) || 0;
  // Calculate total net including gig expenses
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isSelectionMode ? (
          <>
            <View>
              <H1>{selectedGigIds.length} selected</H1>
            </View>
            <View>
              <Button
                variant="secondary"
                size="sm"
                onPress={handleCancelSelection}
              >
                Cancel
              </Button>
            </View>
          </>
        ) : (
          <>
            <View>
              <H1>Gigs</H1>
              <Text muted>
                {filteredGigs?.length || 0} gigs • {formatCurrency(totalNet)} net
              </Text>
            </View>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.headerButtons}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setImportModalVisible(true)}
                >
                  📥 Import
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setCreateTourModalVisible(true)}
                >
                  + Tour
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleEnterSelectionMode}
                >
                  Select
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
              </ScrollView>
            </View>
          </>
        )}
      </View>

      {/* Filter/Actions Bar - shows tour filter OR bulk actions */}
      <View style={styles.filterBar}>
        {isSelectionMode ? (
          // Bulk actions when in selection mode
          <View style={styles.bulkActionsInline}>
            <Text style={styles.bulkActionsLabel}>
              {selectedGigIds.length} gig{selectedGigIds.length !== 1 ? 's' : ''} selected
            </Text>
            <View style={styles.bulkActionsButtons}>
              <Button
                variant="primary"
                size="sm"
                onPress={handleAddToTour}
              >
                Add to Tour
              </Button>
              {allSelectedHaveTour && (
                <Button
                  variant="destructive"
                  size="sm"
                  onPress={handleRemoveFromTour}
                >
                  Remove from Tour
                </Button>
              )}
            </View>
          </View>
        ) : (
          // Tour filter dropdown when not in selection mode
          <>
            {Platform.OS === 'web' ? (
              <select
                value={tourFilter}
                onChange={(e: any) => setTourFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: 14,
                  cursor: 'pointer',
                  minWidth: 160,
                  maxWidth: 250,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                } as any}
              >
                <option value="all">All Gigs</option>
                <option value="none">No Tour</option>
                {tours?.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.name}
                  </option>
                ))}
              </select>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterButtons}
              >
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    tourFilter === 'all' && styles.filterButtonActive,
                  ]}
                  onPress={() => setTourFilter('all')}
                >
                  <Text
                    style={
                      tourFilter === 'all'
                        ? styles.filterButtonTextActive
                        : styles.filterButtonText
                    }
                  >
                    All Gigs
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    tourFilter === 'none' && styles.filterButtonActive,
                  ]}
                  onPress={() => setTourFilter('none')}
                >
                  <Text
                    style={
                      tourFilter === 'none'
                        ? styles.filterButtonTextActive
                        : styles.filterButtonText
                    }
                  >
                    No Tour
                  </Text>
                </TouchableOpacity>
                {tours?.map((tour) => (
                  <TouchableOpacity
                    key={tour.id}
                    style={[
                      styles.filterButton,
                      tourFilter === tour.id && styles.filterButtonActive,
                    ]}
                    onPress={() => setTourFilter(tour.id)}
                  >
                    <Text
                      style={
                        tourFilter === tour.id
                          ? styles.filterButtonTextActive
                          : styles.filterButtonText
                      }
                    >
                      🎸 {tour.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Usage Banner - show for all free plan users */}
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

      {/* Content area with relative positioning for bulk actions bar */}
      <View style={styles.contentArea}>
        {filteredGigs && filteredGigs.length === 0 ? (
          <EmptyState
            title={
              tourFilter === 'all'
                ? "No gigs yet"
                : tourFilter === 'none'
                ? "No gigs without a tour"
                : "No gigs in this tour"
            }
            description={
              tourFilter === 'all'
                ? "Start tracking your performances and income"
                : "Try a different filter"
            }
            action={
              tourFilter === 'all'
                ? {
                    label: 'Add Gig',
                    onPress: handleAddGigClick,
                  }
                : undefined
            }
          />
        ) : (
          <FlatList
            data={filteredGigs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const tour = item.tour_id ? tours?.find(t => t.id === item.tour_id) : null;
              return (
                <GigCard
                  item={item}
                  onEdit={() => handleEdit(item)}
                  onRepeat={() => handleRepeat(item)}
                  onDelete={() => handleDelete(item.id, getGigDisplayName(item))}
                  onTogglePaid={handleTogglePaid}
                  togglingGigId={togglingGigId}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedGigIds.includes(item.id)}
                  onToggleSelection={() => handleToggleGigSelection(item.id)}
                  tourName={tour?.name}
                  tourId={tour?.id}
                />
              );
            }}
          />
        )}
      </View>

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
          // Gigs will refresh automatically via React Query
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
      
      {/* Paywall Modal - shown when user hits gig limit */}
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

      {/* Create Tour Modal */}
      <CreateTourModal
        visible={createTourModalVisible}
        onClose={() => setCreateTourModalVisible(false)}
      />

      {/* Assign to Tour Modal */}
      <AssignGigsToTourModal
        visible={assignToTourModalVisible}
        gigIds={selectedGigIds}
        onClose={() => {
          setAssignToTourModalVisible(false);
          setIsSelectionMode(false);
          setSelectedGigIds([]);
        }}
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
  contentArea: {
    flex: 1,
    position: 'relative',
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
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 50,
      },
    }),
  },
  headerButtons: {
    flexDirection: 'row',
    gap: parseInt(spacing[2]),
    flexShrink: 1,
  },
  filterBar: {
    paddingHorizontal: parseInt(spacing[5]),
    paddingVertical: parseInt(spacing[3]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 73, // Height of header
        zIndex: 40,
      },
    }),
  },
  bulkActionsInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  bulkActionsLabel: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  bulkActionsButtons: {
    flexDirection: 'row',
    gap: parseInt(spacing[2]),
  },
  filterButtons: {
    flexDirection: 'row',
    gap: parseInt(spacing[2]),
    paddingRight: parseInt(spacing[5]),
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
  listContent: {
    padding: parseInt(spacing[4]),
  },
  bannerWrapper: {
    padding: parseInt(spacing[4]),
    paddingBottom: 0,
  },
  bannerContainer: {
    marginBottom: parseInt(spacing[4]),
  },
  card: {
    marginBottom: parseInt(spacing[3]),
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.brand.DEFAULT,
  },
  checkbox: {
    paddingTop: parseInt(spacing[1]),
    marginRight: parseInt(spacing[3]),
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
  checkboxBoxChecked: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: parseInt(spacing[3]),
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  tourBadgeButton: {
    alignSelf: 'flex-start',
  },
  cardActionsRight: {
    flexDirection: 'row',
    gap: parseInt(spacing[4]),
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
