import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useMileage, useDeleteMileage, calculateMileageDeduction, IRS_MILEAGE_RATE, useCreateMileage } from '../hooks/useMileage';
import { AddMileageModal } from '../components/AddMileageModal';
import { H1, H3, Text, Button, Card, EmptyState } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/format';
import { useFavoriteRoutes } from '../hooks/useSavedRoutes';
import { toUtcDateString } from '../lib/date';

export function MileageScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMileage, setEditingMileage] = useState<any>(null);
  
  const { data: mileage, isLoading, error } = useMileage();
  const deleteMileage = useDeleteMileage();
  const createMileage = useCreateMileage();
  const { data: favoriteRoutes = [] } = useFavoriteRoutes();

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

  const handleQuickAddRoute = async (route: any) => {
    try {
      await createMileage.mutateAsync({
        date: toUtcDateString(new Date()),
        purpose: route.default_purpose || `Drive: ${route.name}`,
        start_location: route.start_location,
        end_location: route.end_location,
        miles: route.distance_miles,
      });
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to add trip'}`);
      }
    }
  };

  const handleDuplicateTrip = async (trip: any) => {
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
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <H3 style={{ color: colors.danger.DEFAULT }}>Error loading mileage</H3>
        <Text muted>{(error as Error).message}</Text>
      </View>
    );
  }

  const totalMiles = mileage?.reduce((sum, item) => sum + item.miles, 0) || 0;
  const totalDeduction = calculateMileageDeduction(totalMiles);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <H1>Mileage</H1>
          <Text muted>
            {mileage?.length || 0} trips • {totalMiles.toFixed(1)} miles • {formatCurrency(totalDeduction)} deduction
          </Text>
          <Text subtle style={styles.rateInfo}>
            IRS Rate: ${IRS_MILEAGE_RATE}/mile (2024)
          </Text>
        </View>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setModalVisible(true)}
        >
          + Add Trip
        </Button>
      </View>

      {favoriteRoutes.length > 0 && (
        <View style={styles.widgetSection}>
          <H3 style={styles.widgetTitle}>⭐ Favorite Routes</H3>
          <Text muted style={styles.widgetSubtitle}>Quick add from your most used routes</Text>
          {favoriteRoutes.slice(0, 3).map((route) => (
            <Card key={route.id} variant="elevated" style={styles.routeWidget}>
              <View style={styles.routeWidgetContent}>
                <View style={styles.routeWidgetInfo}>
                  <Text semibold>{route.name}</Text>
                  <Text muted style={styles.routeWidgetDetails}>
                    {route.distance_miles} miles • ${calculateMileageDeduction(route.distance_miles).toFixed(2)} deduction
                  </Text>
                  <Text subtle style={styles.routeWidgetUsage}>
                    Used {route.use_count} times
                  </Text>
                </View>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => handleQuickAddRoute(route)}
                  disabled={createMileage.isPending}
                >
                  Quick Add
                </Button>
              </View>
            </Card>
          ))}
        </View>
      )}

      {mileage && mileage.length > 0 && (
        <View style={styles.widgetSection}>
          <H3 style={styles.widgetTitle}>🔁 Recent Trips</H3>
          <Text muted style={styles.widgetSubtitle}>Click to duplicate with today's date</Text>
          <View style={styles.recentTripsContainer}>
            {mileage.slice(0, 3).map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.recentTripCard}
                onPress={() => handleDuplicateTrip(trip)}
                disabled={createMileage.isPending}
              >
                <Text semibold numberOfLines={1}>{trip.purpose}</Text>
                <Text muted style={styles.recentTripRoute} numberOfLines={1}>
                  {trip.start_location.split(',')[0]} → {trip.end_location.split(',')[0]}
                </Text>
                <Text style={styles.recentTripMiles}>{trip.miles} mi • {formatCurrency(calculateMileageDeduction(trip.miles))}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {mileage && mileage.length === 0 ? (
        <EmptyState
          title="No mileage tracked yet"
          description="Track business miles for tax deductions"
          action={{
            label: 'Add Trip',
            onPress: () => setModalVisible(true),
          }}
        />
      ) : (
        <FlatList
          data={mileage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const deduction = calculateMileageDeduction(item.miles);
            return (
              <Card variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <H3>{item.purpose}</H3>
                    <Text subtle>{formatDate(item.date)}</Text>
                    <View style={styles.locationRow}>
                      <Text muted>📍 {item.start_location}</Text>
                      <Text subtle>→</Text>
                      <Text muted>{item.end_location}</Text>
                    </View>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={styles.miles}>{item.miles} mi</Text>
                    <Text style={styles.deduction}>{formatCurrency(deduction)}</Text>
                  </View>
                </View>

                {item.notes && (
                  <Text muted numberOfLines={2} style={styles.notes}>
                    {item.notes}
                  </Text>
                )}

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={styles.actionButton}
                  >
                    <Text semibold style={{ color: colors.brand.DEFAULT }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.purpose)}
                    style={styles.actionButton}
                  >
                    <Text semibold style={{ color: colors.danger.DEFAULT }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}

      <AddMileageModal
        visible={modalVisible}
        onClose={handleCloseModal}
        editingMileage={editingMileage}
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
  rateInfo: {
    marginTop: parseInt(spacing[1]),
  },
  listContent: {
    padding: parseInt(spacing[5]),
  },
  card: {
    marginBottom: parseInt(spacing[3]),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: parseInt(spacing[2]),
  },
  cardInfo: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: parseInt(spacing[2]),
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: parseInt(spacing[1]),
  },
  miles: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.DEFAULT,
  },
  deduction: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.success.DEFAULT,
  },
  notes: {
    marginBottom: parseInt(spacing[3]),
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
  widgetSection: {
    paddingHorizontal: parseInt(spacing[5]),
    paddingTop: parseInt(spacing[4]),
    paddingBottom: parseInt(spacing[2]),
  },
  widgetTitle: {
    marginBottom: parseInt(spacing[1]),
  },
  widgetSubtitle: {
    marginBottom: parseInt(spacing[3]),
  },
  routeWidget: {
    marginBottom: parseInt(spacing[3]),
  },
  routeWidgetContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeWidgetInfo: {
    flex: 1,
    marginRight: parseInt(spacing[3]),
  },
  routeWidgetDetails: {
    marginTop: parseInt(spacing[1]),
  },
  routeWidgetUsage: {
    marginTop: 2,
  },
  recentTripsContainer: {
    flexDirection: 'row',
    gap: parseInt(spacing[3]),
  },
  recentTripCard: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: parseInt(radius.md),
    padding: parseInt(spacing[3]),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  recentTripRoute: {
    marginTop: parseInt(spacing[1]),
    fontSize: 12,
  },
  recentTripMiles: {
    marginTop: parseInt(spacing[2]),
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.DEFAULT,
  },
});
