import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Text } from '../ui';
import { useMileage, useDeleteMileage, calculateMileageDeduction, IRS_MILEAGE_RATE, useCreateMileage } from '../hooks/useMileage';
import { AddMileageModal } from '../components/AddMileageModal';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';
import { toUtcDateString } from '../lib/date';
import { type DateRange, getDateRangeConfig, filterByDateRange } from '../lib/dateRangeUtils';

interface MileageScreenProps {
  dateRange?: DateRange;
  customStart?: Date;
  customEnd?: Date;
  onNavigateToAccount?: () => void;
}

export function MileageScreen({ dateRange, customStart, customEnd, onNavigateToAccount }: MileageScreenProps = {}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMileage, setEditingMileage] = useState<any>(null);
  
  const { data: allMileage, isLoading, error } = useMileage();

  // Client-side date filtering — useMileage fetches all, we filter here
  const mileage = dateRange
    ? (() => {
        const { startDate, endDate } = getDateRangeConfig(dateRange, customStart, customEnd);
        return filterByDateRange(allMileage, startDate, endDate);
      })()
    : allMileage;
  const deleteMileage = useDeleteMileage();
  const createMileage = useCreateMileage();

  const handleDelete = async (id: string, purpose: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete "${purpose}"?`)
      : true;

    if (!confirmed) return;

    try {
      await deleteMileage.mutateAsync(id);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to delete mileage'}`);
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingMileage(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingMileage(null);
  };

  const formatDate = (dateString: string) => {
    return formatDateUtil(new Date(dateString));
  };

  const formatCurrency = formatCurrencyUtil;

  const handleDuplicateTrip = async (trip: any) => {
    if (createMileage.isPending) return; // Prevent duplicate clicks
    
    try {
      await createMileage.mutateAsync({
        date: toUtcDateString(new Date()),
        purpose: trip.purpose,
        start_location: trip.start_location,
        end_location: trip.end_location,
        miles: trip.miles,
        notes: trip.notes,
      });
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to duplicate trip'}`);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: T.red, fontWeight: '700', fontSize: 16 }}>Error loading mileage</Text>
        <Text style={{ color: T.textSecondary }}>{(error as Error).message}</Text>
      </View>
    );
  }

  const totalMiles = mileage?.reduce((sum, item) => sum + item.miles, 0) || 0;
  const totalDeduction = calculateMileageDeduction(totalMiles);
  const tripCount = mileage?.length || 0;
  const hasTrips = tripCount > 0;

  const renderTrip = ({ item }: { item: any }) => {
    const deduction = calculateMileageDeduction(item.miles);
    const venue = [item.start_location, item.end_location].filter(Boolean).join(' → ');
    return (
      <View style={styles.tripCard}>
        <View style={styles.tripBody}>
          <View style={styles.tripIconWrap}>
            <Text style={styles.tripIconEmoji}>🚗</Text>
          </View>
          <View style={styles.tripInfo}>
            <Text style={styles.tripName} numberOfLines={1}>{item.purpose || 'Trip'}</Text>
            {!!venue && <Text style={styles.tripVenue} numberOfLines={1}>{venue}</Text>}
            <View style={styles.dateChip}>
              <Text style={styles.dateChipText}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <View style={styles.tripRight}>
            <Text style={styles.milesLabel}>MILES</Text>
            <Text style={styles.milesValue}>{item.miles.toFixed(1)}</Text>
            <Text style={styles.deductionValue}>${deduction.toFixed(2)} saved</Text>
          </View>
        </View>
        <View style={styles.tripFooter}>
          <TouchableOpacity onPress={() => handleEdit(item)}>
            <Text style={styles.footerEdit}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.purpose)}>
            <Text style={styles.footerDelete}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryStatCol}>
          <Text style={styles.summaryLabel}>TRIPS</Text>
          <Text style={styles.summaryValue}>{tripCount}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStatCol}>
          <Text style={styles.summaryLabel}>MILES</Text>
          <Text style={{ ...styles.summaryValue, color: '#2DD4BF' }}>{totalMiles.toFixed(1)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryStatCol}>
          <Text style={styles.summaryLabel}>DEDUCTION</Text>
          <Text style={{ ...styles.summaryValue, color: '#4ADE80' }}>${totalDeduction.toFixed(0)}</Text>
        </View>
      </View>

      {/* IRS rate chip */}
      <View style={styles.irsChipWrap}>
        <View style={styles.irsChip}>
          <Text style={styles.irsChipText}>🚗  IRS Rate: ${IRS_MILEAGE_RATE} / mile ({new Date().getFullYear()})</Text>
        </View>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>ALL TRIPS</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {hasTrips ? (
        <FlatList
          data={mileage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderTrip}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyScroll}>
          {/* Home address callout */}
          <View style={styles.calloutCard}>
            <View style={styles.calloutTop}>
              <View style={styles.calloutIconWrap}>
                <Text style={styles.calloutIconEmoji}>🗺️</Text>
              </View>
              <View style={styles.calloutTextWrap}>
                <Text style={styles.calloutTitle}>Enable auto-calculated mileage</Text>
                <Text style={styles.calloutDesc}>Add your home address in Account Settings and mileage will be calculated automatically when you log gigs.</Text>
              </View>
            </View>
            <View style={styles.calloutActions}>
              <TouchableOpacity style={styles.calloutBtnGhost} onPress={() => setModalVisible(true)}>
                <Text style={styles.calloutBtnGhostText}>Add Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calloutBtnPrimary} onPress={onNavigateToAccount}>
                <Text style={styles.calloutBtnPrimaryText}>Go to Settings</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Empty state */}
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>No trips logged yet</Text>
            <Text style={styles.emptyDesc}>Add your first trip manually or set up auto-calculation via Account Settings.</Text>
          </View>
        </ScrollView>
      )}

      <AddMileageModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingMileage={editingMileage}
      />
    </View>
  );
}

const T = {
  bg: '#F5F4F0',
  surface: '#FFFFFF',
  surface2: '#EEECEA',
  border: '#E5E3DE',
  textPrimary: '#1A1A1A',
  textSecondary: '#7A7671',
  textMuted: '#B0ADA8',
  green: '#1D9B5E',
  teal: '#0D9488',
  tealLight: '#F0FDFA',
  accent: '#2D5BE3',
  red: '#DC2626',
};

const styles = StyleSheet.create({
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

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: T.textPrimary,
    marginHorizontal: 10,
    marginBottom: 14,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // IRS chip
  irsChipWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  irsChip: {
    backgroundColor: T.tealLight,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.15)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  irsChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.teal,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addBtn: {
    backgroundColor: T.accent,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // List
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 32,
    gap: 10,
  },

  // Trip card
  tripCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  tripBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 10,
  },
  tripIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: T.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tripIconEmoji: {
    fontSize: 20,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
  },
  tripVenue: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 2,
  },
  dateChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEECEA',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textSecondary,
  },
  tripRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  milesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  milesValue: {
    fontSize: 22,
    fontWeight: '700',
    color: T.teal,
  },
  deductionValue: {
    fontSize: 11,
    fontWeight: '600',
    color: T.green,
    marginTop: 3,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.bg,
  },
  footerEdit: {
    fontSize: 13,
    fontWeight: '600',
    color: T.accent,
  },
  footerDelete: {
    fontSize: 13,
    fontWeight: '600',
    color: T.red,
  },

  // Empty / callout
  emptyScroll: {
    paddingBottom: 32,
  },
  calloutCard: {
    marginHorizontal: 10,
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    padding: 18,
  },
  calloutTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  calloutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  calloutIconEmoji: {
    fontSize: 20,
  },
  calloutTextWrap: {
    flex: 1,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.accent,
    lineHeight: 20,
  },
  calloutDesc: {
    fontSize: 13,
    color: T.accent,
    opacity: 0.75,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  calloutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  calloutBtnGhost: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    alignItems: 'center',
  },
  calloutBtnGhostText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.accent,
  },
  calloutBtnPrimary: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: T.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  calloutBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    marginHorizontal: 10,
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 14,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textSecondary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: T.textMuted,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 240,
  },
});
