import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Modal,
  Text as NativeText,
} from 'react-native';
import { useGigs, useDeleteGig, useUpdateGig, type GigWithPayer } from '../hooks/useGigs';
import { useTours, useRemoveGigFromTour } from '../hooks/useTours';
import { AddGigModal } from '../components/AddGigModal';
import { CreateTourModal } from '../components/tours/CreateTourModal';
import { AssignGigsToTourModal } from '../components/tours/AssignGigsToTourModal';
import { CSVImportWizard } from '../components/csv/CSVImportWizard';
import { PaywallModal } from '../components/PaywallModal';
import { UsageLimitBanner } from '../components/UsageLimitBanner';
import { OnboardingHelperCard } from '../components/OnboardingHelperCard';
import { usePayers } from '../hooks/usePayers';
import { useGigTaxCalculation } from '../hooks/useGigTaxCalculation';
import { useEntitlements } from '../hooks/useEntitlements';
import { SkeletonGigCard } from '../components/SkeletonCard';
import { H1, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';
import { getGigDisplayName } from '../lib/gigDisplayName';
import { type DateRange, getDateRangeConfig, filterByDateRange } from '../lib/dateRangeUtils';
import { generateICSFile, downloadICSFile, generateICSFilename } from '../utils/calendar';
import { addGigToCalendar } from '../utils/nativeCalendar';
import { useDateRange } from '../hooks/useDateRange';
import { DateRangeFilter } from '../components/DateRangeFilter';

// Design tokens
const T = {
  bg: '#F5F4F0',
  surface: '#FFFFFF',
  surface2: '#EEECEA',
  border: '#E5E3DE',
  textPrimary: '#1A1A1A',
  textSecondary: '#7A7671',
  textMuted: '#B0ADA8',
  green: '#1D9B5E',
  greenLight: '#E8F7F0',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  accent: '#2D5BE3',
  accentLight: '#F0F4FF',
  red: '#DC2626',
  mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
};

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
  onTourBadgeClick,
  onAddToCalendar,
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
  onTourBadgeClick?: () => void;
  onAddToCalendar?: () => void;
}) {
  // Derived money fields
  const gross = item.gross_amount 
    + (item.tips || 0) 
    + (item.per_diem || 0) 
    + (item.other_income || 0);
  
  const subcontractorPaymentsTotal = (item.subcontractor_payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const expensesOnly = (item.expenses || []).reduce((sum: number, exp: any) => sum + exp.amount, 0) 
    + (item.fees || 0)
    + ((item.mileage || []).reduce((sum: number, m: any) => sum + (m.miles * 0.67), 0));
  const expensesTotal = expensesOnly + subcontractorPaymentsTotal;
  const netBeforeTax = gross - expensesTotal;
  
  const { taxResult } = useGigTaxCalculation(gross, expensesTotal);
  const taxToSetAside = taxResult?.setAside || 0;
  const takeHome = netBeforeTax - taxToSetAside;

  const displayName = getGigDisplayName(item);
  const venueCity = item.location || (item.payer?.name || 'Unknown Payer');

  const handleCardPress = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection();
    } else if (!isSelectionMode) {
      onEdit();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleCardPress}
      style={[
        cardS.card,
        isSelected && cardS.cardSelected,
      ]}
    >
      {/* Main body */}
      <View style={cardS.main}>
        {/* Checkbox in selection mode */}
        {isSelectionMode && (
          <TouchableOpacity
            onPress={onToggleSelection}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={cardS.checkboxWrap}
          >
            <View style={[cardS.checkbox, isSelected && cardS.checkboxChecked]}>
              {isSelected && <NativeText style={cardS.checkboxTick}>✓</NativeText>}
            </View>
          </TouchableOpacity>
        )}

        {/* LEFT: identity */}
        <View style={cardS.left}>
          <NativeText style={cardS.bandName} numberOfLines={1}>{displayName}</NativeText>
          <NativeText style={cardS.venue} numberOfLines={1}>📍 {venueCity}</NativeText>
          <View style={cardS.metaRow}>
            <View style={cardS.dateChip}>
              <NativeText style={cardS.dateText}>{formatDate(item.date)}</NativeText>
            </View>
            <TouchableOpacity
              onPress={() => onTogglePaid(item)}
              disabled={togglingGigId === item.id}
              activeOpacity={0.7}
              style={[cardS.badge, item.paid ? cardS.badgePaid : cardS.badgeUnpaid]}
            >
              <NativeText style={[cardS.badgeText, item.paid ? cardS.badgeTextPaid : cardS.badgeTextUnpaid]}>
                {togglingGigId === item.id ? 'SAVING...' : item.paid ? 'PAID' : 'UNPAID'}
              </NativeText>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT: money */}
        <View style={cardS.right}>
          <NativeText style={cardS.takeHomeLabel}>TAKE-HOME</NativeText>
          <NativeText style={cardS.takeHomeValue}>{formatCurrency(takeHome)}</NativeText>
          <NativeText style={cardS.taxAside}>
            {'set aside '}
            <NativeText style={cardS.taxAsideAmt}>{formatCurrency(taxToSetAside)}</NativeText>
          </NativeText>
        </View>
      </View>

      {/* Footer */}
      <View style={[cardS.footer, isSelected && cardS.footerSelected]}>
        <TouchableOpacity onPress={onTourBadgeClick} activeOpacity={tourId ? 0.7 : 1} disabled={!tourId}>
          <NativeText style={cardS.tourTag}>{tourName ? `🎸 ${tourName}` : ''}</NativeText>
        </TouchableOpacity>
        <View style={cardS.footerActions}>
          {onAddToCalendar && (
            <TouchableOpacity onPress={onAddToCalendar} style={cardS.footerBtn}>
              <NativeText style={cardS.footerBtnText}>📅 Calendar</NativeText>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onEdit} style={cardS.footerBtn}>
            <NativeText style={cardS.footerBtnText}>Edit</NativeText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRepeat} style={cardS.footerBtn}>
            <NativeText style={cardS.footerBtnText}>Repeat</NativeText>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardS = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: T.accent,
    backgroundColor: T.accentLight,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  checkboxWrap: { paddingTop: 2, marginRight: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: T.accent, borderColor: T.accent },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  left: { flex: 1, minWidth: 0 },
  bandName: { fontSize: 15, fontWeight: '700', color: T.textPrimary, marginBottom: 3 },
  venue: { fontSize: 13, color: T.textSecondary, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dateChip: { backgroundColor: T.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dateText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePaid: { backgroundColor: T.greenLight },
  badgeUnpaid: { backgroundColor: T.amberLight },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  badgeTextPaid: { color: T.green },
  badgeTextUnpaid: { color: T.amber },
  right: { alignItems: 'flex-end', flexShrink: 0 },
  takeHomeLabel: { fontSize: 10, fontWeight: '600', color: T.textMuted, letterSpacing: 0.5, marginBottom: 2 },
  takeHomeValue: {
    fontSize: 26,
    fontWeight: '700',
    color: T.green,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 30,
  },
  taxAside: { fontSize: 11, color: T.textMuted, marginTop: 3 },
  taxAsideAmt: { color: T.amber, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.bg,
  },
  footerSelected: { backgroundColor: '#EBF0FF' },
  tourTag: { fontSize: 12, fontWeight: '600', color: T.textSecondary },
  footerActions: { flexDirection: 'row', gap: 12 },
  footerBtn: { paddingVertical: 2 },
  footerBtnText: { fontSize: 13, fontWeight: '600', color: T.accent },
});

interface GigsScreenProps {
  onNavigateToSubscription?: () => void;
}

export function GigsScreen({ onNavigateToSubscription }: GigsScreenProps = {}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [createTourModalVisible, setCreateTourModalVisible] = useState(false);
  const [assignToTourModalVisible, setAssignToTourModalVisible] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [editingGig, setEditingGig] = useState<GigWithPayer | null>(null);
  const [duplicatingGig, setDuplicatingGig] = useState<GigWithPayer | null>(null);
  const [togglingGigId, setTogglingGigId] = useState<string | null>(null);
  
  // Tour filter state: 'all' | 'none' | tourId (UUID string)
  const [tourFilter, setTourFilter] = useState<'all' | 'none' | string>('all');
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGigIds, setSelectedGigIds] = useState<string[]>([]);
  
  // Date range state - managed independently per page
  const { range: dateRange, customStart, customEnd, setRange, setCustomRange } = useDateRange();
  
  const { data: allGigs, isLoading, error } = useGigs();

  // Client-side date filtering — useGigs fetches all, we filter here
  const gigs = dateRange
    ? (() => {
        const { startDate, endDate } = getDateRangeConfig(dateRange, customStart, customEnd);
        return filterByDateRange(allGigs, startDate, endDate);
      })()
    : allGigs;
  const { data: payers } = usePayers();
  const { data: tours, isLoading: toursLoading } = useTours();
  
  const deleteGig = useDeleteGig();
  const updateGig = useUpdateGig();
  const removeGigFromTour = useRemoveGigFromTour();
  const entitlements = useEntitlements();
  const gigCount = entitlements.usage.gigsCount;
  const isFreePlan = !entitlements.isPro;
  const hasReachedGigLimit = !entitlements.can.createGig;

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

  const handleAddToCalendar = async (gig: GigWithPayer) => {
    const displayName = getGigDisplayName(gig);
    const location = [gig.location, gig.city, gig.state].filter(Boolean).join(', ');
    
    const eventData = {
      id: gig.id,
      title: displayName,
      date: gig.date,
      location,
      payerName: gig.payer?.name,
      payAmount: gig.gross_amount,
      notes: gig.notes || undefined,
    };

    if (Platform.OS === 'web') {
      // Generate and download .ics file for web
      const icsContent = generateICSFile(eventData);
      const filename = generateICSFilename(displayName, gig.date);
      downloadICSFile(icsContent, filename);
      
      if (window.confirm('Calendar event file downloaded. Would you like to open it?')) {
        // The file is already downloaded, user can open it from downloads
      }
    } else {
      // Use native calendar for mobile
      try {
        const calendarEventId = await addGigToCalendar(eventData);
        
        if (calendarEventId) {
          // Update the gig with the calendar event ID
          await updateGig.mutateAsync({
            id: gig.id,
            calendar_event_id: calendarEventId,
          });
          
          Alert.alert('Success', 'Gig added to your calendar!');
        }
      } catch (error) {
        console.error('Error adding to calendar:', error);
        Alert.alert('Error', 'Failed to add gig to calendar. Please try again.');
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
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <NativeText style={{ fontSize: 28, fontWeight: '700', color: T.textPrimary }}>Gigs</NativeText>
          <NativeText style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>Loading...</NativeText>
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
        <NativeText style={{ fontSize: 16, fontWeight: '600', color: T.red }}>Error loading gigs</NativeText>
        <NativeText style={{ fontSize: 14, color: T.textMuted }}>{(error as Error).message}</NativeText>
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

  // Derived filter label for dropdown button
  const filterLabel = tourFilter === 'all' ? 'All Gigs'
    : tourFilter === 'none' ? 'No Tour'
    : (tours?.find(t => t.id === tourFilter)?.name || 'Tour');
  const filterIcon = tourFilter === 'all' ? '📋' : tourFilter === 'none' ? '🗂️' : '🎸';

  // Total tax aside estimate across filtered gigs (rough: 16% of net)
  const totalTaxAside = Math.round(totalNet * 0.16);

  return (
    <View style={styles.container}>

      {/* ── SUMMARY BAR ── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryStat}>
          <NativeText style={styles.summaryLabel}>TOTAL GIGS</NativeText>
          <NativeText style={styles.summaryValue}>{filteredGigs?.length || 0}</NativeText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStat}>
          <NativeText style={styles.summaryLabel}>NET EARNINGS</NativeText>
          <NativeText style={styles.summaryValue}>{formatCurrency(totalNet)}</NativeText>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStat}>
          <NativeText style={styles.summaryLabel}>TAX ASIDE</NativeText>
          <NativeText style={[styles.summaryValue, styles.summaryValueAmber]}>{formatCurrency(totalTaxAside)}</NativeText>
        </View>
      </View>

      {/* ── SECTION HEADER + ACTION BUTTONS ── */}
      {!isSelectionMode && (
        <View style={styles.sectionHeader}>
          <NativeText style={styles.sectionTitle}>ALL GIGS</NativeText>
          <View style={styles.headerActions}>
            <DateRangeFilter
              selected={dateRange}
              onSelect={setRange}
              customStart={customStart}
              customEnd={customEnd}
              onCustomRangeChange={setCustomRange}
            />
            <TouchableOpacity style={styles.btnGhost} onPress={() => setImportModalVisible(true)}>
              <NativeText style={styles.btnGhostText}>📥 Import</NativeText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setCreateTourModalVisible(true)}>
              <NativeText style={styles.btnGhostText}>+ Tour</NativeText>
            </TouchableOpacity>
            {hasReachedGigLimit ? (
              <TouchableOpacity style={styles.btnPrimary} onPress={handleUpgradeClick}>
                <NativeText style={styles.btnPrimaryText}>⭐ Upgrade</NativeText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnPrimary} onPress={handleAddGigClick}>
                <NativeText style={styles.btnPrimaryText}>+ Gig</NativeText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── FILTER + SELECT ROW / SELECT MODE BAR ── */}
      {isSelectionMode ? (
        <View style={styles.selectModeBar}>
          <TouchableOpacity onPress={handleCancelSelection}>
            <NativeText style={styles.cancelSelectText}>Cancel</NativeText>
          </TouchableOpacity>
          <NativeText style={styles.selectCount}>
            {selectedGigIds.length} gig{selectedGigIds.length !== 1 ? 's' : ''} selected
          </NativeText>
          <TouchableOpacity
            style={[styles.assignBtn, selectedGigIds.length > 0 && styles.assignBtnEnabled]}
            onPress={handleAddToTour}
            disabled={selectedGigIds.length === 0}
          >
            <NativeText style={styles.assignBtnText}>Assign to Tour →</NativeText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.filterRow}>
          {/* Filter dropdown */}
          <View style={styles.filterDropdownWrap}>
            <TouchableOpacity
              style={styles.filterDropdownBtn}
              onPress={() => setFilterDropdownOpen(o => !o)}
              activeOpacity={0.8}
            >
              <NativeText style={styles.filterIcon}>{filterIcon}</NativeText>
              <NativeText style={styles.filterLabelText} numberOfLines={1}>{filterLabel}</NativeText>
              <NativeText style={styles.filterChevron}>{filterDropdownOpen ? '▲' : '▼'}</NativeText>
            </TouchableOpacity>
            {filterDropdownOpen && (
              <View style={styles.filterMenu}>
                {[
                  { value: 'all', label: 'All Gigs', icon: '📋' },
                  { value: 'none', label: 'No Tour', icon: '🗂️' },
                  ...(tours?.map(t => ({ value: t.id, label: t.name, icon: '🎸' })) || []),
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterMenuItem, tourFilter === opt.value && styles.filterMenuItemActive]}
                    onPress={() => { setTourFilter(opt.value); setFilterDropdownOpen(false); }}
                  >
                    <NativeText style={styles.filterMenuIcon}>{opt.icon}</NativeText>
                    <NativeText style={[styles.filterMenuLabel, tourFilter === opt.value && styles.filterMenuLabelActive]} numberOfLines={1}>
                      {opt.label}
                    </NativeText>
                    {tourFilter === opt.value && (
                      <View style={styles.filterCheck}>
                        <NativeText style={styles.filterCheckMark}>✓</NativeText>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Select pill */}
          <TouchableOpacity
            style={styles.selectPill}
            onPress={handleEnterSelectionMode}
            activeOpacity={0.8}
          >
            <NativeText style={styles.selectPillText}>Select</NativeText>
          </TouchableOpacity>
        </View>
      )}

      {/* Usage Banner */}
      {isFreePlan && (
        <View style={styles.bannerWrapper}>
          <UsageLimitBanner
            label="gigs"
            usedCount={gigCount}
            limitCount={entitlements.limits.gigsMax ?? 0}
            onUpgradePress={handleUpgradeClick}
          />
        </View>
      )}

      {/* ── GIG LIST ── */}
      <View style={styles.contentArea}>
        {filteredGigs && filteredGigs.length === 0 ? (
          tourFilter === 'all' ? (
            <View style={{ padding: 16 }}>
              <OnboardingHelperCard
                icon="🎸"
                title="Log your first gig"
                description="Start by logging a gig. It powers your income tracking, tax estimates, and everything else in the app."
                actionLabel="Add Gig"
                onAction={handleAddGigClick}
              />
            </View>
          ) : (
            <EmptyState
              title={tourFilter === 'none' ? 'No gigs without a tour' : 'No gigs in this tour'}
              description="Try a different filter"
            />
          )
        ) : (
          <FlatList
            data={filteredGigs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const tour = item.tour_id ? tours?.find((t: any) => t.id === item.tour_id) : null;
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
                  onTourBadgeClick={() => { if (tour?.id) setTourFilter(tour.id); }}
                  onAddToCalendar={() => handleAddToCalendar(item)}
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
  // ── Screen ──
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg,
    gap: 8,
  },
  contentArea: {
    flex: 1,
  },

  // ── Summary bar ──
  summaryBar: {
    backgroundColor: T.textPrimary,
    marginHorizontal: 10,
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStat: {},
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginTop: 2,
  },
  summaryValueAmber: {
    color: '#FBBF24',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
    letterSpacing: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textPrimary,
  },
  btnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: T.accent,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // ── Filter + Select row ──
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 14,
    alignItems: 'center',
  },
  filterDropdownWrap: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
    gap: 8,
  },
  filterIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  filterLabelText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },
  filterChevron: {
    fontSize: 10,
    color: T.textMuted,
  },
  filterMenu: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 50,
    marginTop: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } as any,
    }),
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  filterMenuItemActive: {
    backgroundColor: T.accentLight,
  },
  filterMenuIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  filterMenuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: T.textPrimary,
  },
  filterMenuLabelActive: {
    color: T.accent,
    fontWeight: '700',
  },
  filterCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCheckMark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  selectPill: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  selectPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },

  // ── Select mode bar ──
  selectModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.textPrimary,
    marginHorizontal: 10,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 10,
  },
  cancelSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  selectCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  assignBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: T.accent,
    opacity: 0.4,
  },
  assignBtnEnabled: {
    opacity: 1,
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 24,
  },
  bannerWrapper: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
});
