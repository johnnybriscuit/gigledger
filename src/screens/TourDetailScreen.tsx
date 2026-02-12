import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTour, useUpdateTour } from '../hooks/useTours';
import { useSettlements } from '../hooks/useSettlements';
import { AddGigsToTourModal } from '../components/tours/AddGigsToTourModal';
import { AddSettlementModal } from '../components/tours/AddSettlementModal';
import { H1, H2, H3, Text, Button, Card } from '../ui';
import { colors, spacingNum } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/format';
import { buildTourFinancials } from '../utils/tourAllocations';
import type { AllocationMode } from '../types/tours.types';

interface TourDetailScreenProps {
  route: {
    params: {
      tourId: string;
    };
  };
}

export function TourDetailScreen({ route }: TourDetailScreenProps) {
  const { tourId } = route.params;
  const { data: tour, isLoading } = useTour(tourId);
  const { data: settlements } = useSettlements(tourId);
  const [addGigsModalOpen, setAddGigsModalOpen] = useState(false);
  const [addSettlementModalOpen, setAddSettlementModalOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={styles.container}>
        <Text>Tour not found</Text>
      </View>
    );
  }

  const gigs = tour.gigs || [];
  const tourExpenses = tour.tour_expenses || [];
  const tourSettlements = settlements || [];

  // Calculate gig-specific expenses
  const gigExpenses: { [gigId: string]: number } = {};
  gigs.forEach((gig) => {
    const gigTotal = (gig.fees || 0);
    gigExpenses[gig.id] = gigTotal;
  });

  // Build tour financials
  const financials = buildTourFinancials(
    gigs.map(g => ({
      id: g.id,
      title: g.title,
      date: g.date,
      gross_amount: g.gross_amount,
      tips: g.tips,
      per_diem: g.per_diem,
      other_income: g.other_income,
    })),
    tourSettlements.map(s => ({
      amount: s.amount,
      allocation_mode: s.allocation_mode as AllocationMode,
      allocation_json: s.allocation_json as any,
    })),
    tourExpenses.map(e => ({
      amount: e.amount,
      allocation_mode: e.allocation_mode as AllocationMode,
      allocation_json: e.allocation_json as any,
    })),
    gigExpenses
  );

  const dateRange = tour.start_date && tour.end_date
    ? `${formatDate(tour.start_date)} - ${formatDate(tour.end_date)}`
    : tour.start_date
    ? `From ${formatDate(tour.start_date)}`
    : 'No dates set';

  return (
    <ScrollView style={styles.container}>
      {/* Tour Header */}
      <View style={styles.header}>
        <View>
          <H1>{tour.name}</H1>
          {tour.artist_name && <Text muted>{tour.artist_name}</Text>}
          <Text subtle style={styles.dateRange}>{dateRange}</Text>
        </View>
      </View>

      {/* P&L Summary */}
      <Card variant="elevated" style={styles.section}>
        <H2 style={styles.sectionTitle}>Tour Summary</H2>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Gigs</Text>
          <Text style={styles.summaryValue}>{gigs.length}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Gross Income</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(financials.totals.gross)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={[styles.summaryValue, styles.expenseText]}>
            {formatCurrency(financials.totals.expenses)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabelBold}>Net</Text>
          <Text style={[styles.summaryValueBold, financials.totals.net >= 0 ? styles.positiveText : styles.negativeText]}>
            {formatCurrency(financials.totals.net)}
          </Text>
        </View>
      </Card>

      {/* Gigs in Tour */}
      <Card variant="elevated" style={styles.section}>
        <View style={styles.sectionHeader}>
          <H2 style={styles.sectionTitle}>Gigs ({gigs.length})</H2>
          <Button size="sm" onPress={() => setAddGigsModalOpen(true)}>
            Add Gigs
          </Button>
        </View>

        {gigs.length === 0 ? (
          <Text muted>No gigs in this tour yet. Add gigs to get started.</Text>
        ) : (
          <View style={styles.gigsList}>
            {gigs.map((gig) => {
              const gigFinancials = financials.perGig[gig.id];
              return (
                <View key={gig.id} style={styles.gigRow}>
                  <View style={styles.gigInfo}>
                    <Text style={styles.gigTitle}>
                      {gig.title || 'Untitled Gig'}
                    </Text>
                    <Text muted>{formatDate(gig.date)}</Text>
                    {gig.location && <Text subtle>{gig.location}</Text>}
                  </View>
                  <View style={styles.gigFinancials}>
                    {gigFinancials && (
                      <Text style={gigFinancials.net >= 0 ? styles.positiveText : styles.negativeText}>
                        {formatCurrency(gigFinancials.net)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Settlements */}
      <Card variant="elevated" style={styles.section}>
        <View style={styles.sectionHeader}>
          <H2 style={styles.sectionTitle}>Settlements ({tourSettlements.length})</H2>
          <Button size="sm" onPress={() => setAddSettlementModalOpen(true)}>
            Add Settlement
          </Button>
        </View>

        {tourSettlements.length === 0 ? (
          <Text muted>No settlements yet. Add a settlement to track tour-level payments.</Text>
        ) : (
          <View style={styles.settlementsList}>
            {tourSettlements.map((settlement) => (
              <View key={settlement.id} style={styles.settlementRow}>
                <View style={styles.settlementInfo}>
                  {settlement.payer_name && (
                    <Text style={styles.settlementPayer}>{settlement.payer_name}</Text>
                  )}
                  {settlement.paid_at && (
                    <Text muted>{formatDate(settlement.paid_at)}</Text>
                  )}
                  <Text subtle>
                    Allocation: {settlement.allocation_mode}
                  </Text>
                </View>
                <Text style={styles.settlementAmount}>
                  {formatCurrency(settlement.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Tour Expenses */}
      <Card variant="elevated" style={styles.section}>
        <View style={styles.sectionHeader}>
          <H2 style={styles.sectionTitle}>Tour Expenses ({tourExpenses.length})</H2>
        </View>

        {tourExpenses.length === 0 ? (
          <Text muted>No shared tour expenses yet.</Text>
        ) : (
          <View style={styles.expensesList}>
            {tourExpenses.map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={styles.expenseInfo}>
                  <Text>{expense.description}</Text>
                  <Text muted>{expense.category}</Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(expense.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <AddGigsToTourModal
        visible={addGigsModalOpen}
        tourId={tourId}
        onClose={() => setAddGigsModalOpen(false)}
      />

      <AddSettlementModal
        visible={addSettlementModalOpen}
        tourId={tourId}
        onClose={() => setAddSettlementModalOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacingNum[6],
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  dateRange: {
    marginTop: spacingNum[2],
  },
  section: {
    margin: spacingNum[4],
    padding: spacingNum[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingNum[4],
  },
  sectionTitle: {
    marginBottom: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacingNum[3],
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: 16,
    color: colors.text.DEFAULT,
    fontWeight: '500',
  },
  summaryLabelBold: {
    fontSize: 18,
    color: colors.text.DEFAULT,
    fontWeight: '600',
  },
  summaryValueBold: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: spacingNum[2],
  },
  positiveText: {
    color: colors.success.DEFAULT,
  },
  negativeText: {
    color: colors.danger.DEFAULT,
  },
  expenseText: {
    color: colors.text.muted,
  },
  gigsList: {
    gap: spacingNum[3],
  },
  gigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacingNum[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  gigInfo: {
    flex: 1,
  },
  gigTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.DEFAULT,
  },
  gigFinancials: {
    alignItems: 'flex-end',
  },
  settlementsList: {
    gap: spacingNum[3],
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacingNum[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  settlementInfo: {
    flex: 1,
  },
  settlementPayer: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.DEFAULT,
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success.DEFAULT,
  },
  expensesList: {
    gap: spacingNum[3],
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacingNum[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.muted,
  },
});
