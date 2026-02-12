import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTours, useDeleteTour } from '../hooks/useTours';
import { CreateTourModal } from '../components/tours/CreateTourModal';
import { H1, H3, Text, Button, Card, Badge, EmptyState } from '../ui';
import { colors, spacingNum } from '../styles/theme';
import { formatDate } from '../utils/format';
import type { TourRun } from '../types/tours.types';

interface ToursScreenProps {
  onNavigateToTourDetail?: (tourId: string) => void;
}

function TourCard({ tour, onPress, onDelete }: { 
  tour: TourRun; 
  onPress: () => void;
  onDelete: () => void;
}) {
  const dateRange = tour.start_date && tour.end_date
    ? `${formatDate(tour.start_date)} - ${formatDate(tour.end_date)}`
    : tour.start_date
    ? `From ${formatDate(tour.start_date)}`
    : 'No dates set';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.tourInfo}>
            <H3>{tour.name}</H3>
            {tour.artist_name && (
              <Text muted>{tour.artist_name}</Text>
            )}
            <Text subtle style={styles.dateRange}>{dateRange}</Text>
            {tour.notes && (
              <Text muted numberOfLines={2} style={styles.notes}>
                {tour.notes}
              </Text>
            )}
          </View>
          
          <View style={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              onPress={(e) => {
                e?.stopPropagation();
                onDelete();
              }}
            >
              Delete
            </Button>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export function ToursScreen({ onNavigateToTourDetail }: ToursScreenProps = {}) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data: tours, isLoading } = useTours();
  const deleteTour = useDeleteTour();

  const handleTourPress = (tourId: string) => {
    if (onNavigateToTourDetail) {
      onNavigateToTourDetail(tourId);
    }
  };

  const handleDeleteTour = (tour: TourRun) => {
    Alert.alert(
      'Delete Tour',
      `Are you sure you want to delete "${tour.name}"? Gigs will not be deleted, just ungrouped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTour.mutateAsync(tour.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete tour');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <H1>Tours</H1>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <H1>Tours</H1>
        <Button onPress={() => setCreateModalOpen(true)}>
          Create Tour
        </Button>
      </View>

      {!tours || tours.length === 0 ? (
        <EmptyState
          icon="🎸"
          title="No tours yet"
          description="Group your gigs into tours to track tour-level income and expenses"
          action={{
            label: 'Create Your First Tour',
            onPress: () => setCreateModalOpen(true),
          }}
        />
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourCard
              tour={item}
              onPress={() => handleTourPress(item.id)}
              onDelete={() => handleDeleteTour(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <CreateTourModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingNum[6],
    paddingVertical: spacingNum[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacingNum[6],
  },
  card: {
    marginBottom: spacingNum[4],
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tourInfo: {
    flex: 1,
  },
  dateRange: {
    marginTop: spacingNum[2],
  },
  notes: {
    marginTop: spacingNum[3],
  },
  actions: {
    marginLeft: spacingNum[4],
  },
});
