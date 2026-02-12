import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  FlatList,
} from 'react-native';
import { useGigs } from '../../hooks/useGigs';
import { useAddGigsToTour } from '../../hooks/useTours';
import { H2, Text, Button, Input } from '../../ui';
import { colors, spacingNum, radiusNum } from '../../styles/theme';
import { formatDate } from '../../utils/format';

interface AddGigsToTourModalProps {
  visible: boolean;
  tourId: string;
  onClose: () => void;
}

export function AddGigsToTourModal({ visible, tourId, onClose }: AddGigsToTourModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGigIds, setSelectedGigIds] = useState<Set<string>>(new Set());
  
  const { data: allGigs } = useGigs();
  const addGigsToTour = useAddGigsToTour();

  // Filter gigs that are not already in a tour
  const availableGigs = useMemo(() => {
    if (!allGigs) return [];
    return allGigs.filter(gig => !gig.tour_id);
  }, [allGigs]);

  // Filter by search query
  const filteredGigs = useMemo(() => {
    if (!searchQuery.trim()) return availableGigs;
    
    const query = searchQuery.toLowerCase();
    return availableGigs.filter(gig => 
      gig.title?.toLowerCase().includes(query) ||
      gig.location?.toLowerCase().includes(query) ||
      gig.payer?.name.toLowerCase().includes(query)
    );
  }, [availableGigs, searchQuery]);

  const handleToggleGig = (gigId: string) => {
    const newSelected = new Set(selectedGigIds);
    if (newSelected.has(gigId)) {
      newSelected.delete(gigId);
    } else {
      newSelected.add(gigId);
    }
    setSelectedGigIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedGigIds.size === 0) return;

    try {
      await addGigsToTour.mutateAsync({
        tourId,
        gigIds: Array.from(selectedGigIds),
      });

      setSelectedGigIds(new Set());
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Failed to add gigs to tour:', error);
    }
  };

  const handleClose = () => {
    setSelectedGigIds(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContainer}
        >
          <View style={styles.modal}>
            <View style={styles.header}>
              <H2>Add Gigs to Tour</H2>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search gigs..."
              />
              <Text muted style={styles.selectedCount}>
                {selectedGigIds.size} selected
              </Text>
            </View>

            <ScrollView style={styles.content}>
              {filteredGigs.length === 0 ? (
                <Text muted style={styles.emptyText}>
                  {searchQuery ? 'No gigs match your search' : 'No available gigs to add'}
                </Text>
              ) : (
                filteredGigs.map((gig) => {
                  const isSelected = selectedGigIds.has(gig.id);
                  return (
                    <TouchableOpacity
                      key={gig.id}
                      style={[styles.gigItem, isSelected && styles.gigItemSelected]}
                      onPress={() => handleToggleGig(gig.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.checkbox}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <View style={styles.gigDetails}>
                        <Text style={styles.gigTitle}>
                          {gig.title || 'Untitled Gig'}
                        </Text>
                        <Text muted>{gig.payer?.name || 'Unknown Payer'}</Text>
                        <Text subtle>{formatDate(gig.date)}</Text>
                        {gig.location && <Text subtle>{gig.location}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Button
                variant="ghost"
                onPress={handleClose}
                disabled={addGigsToTour.isPending}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                disabled={addGigsToTour.isPending || selectedGigIds.size === 0}
              >
                {addGigsToTour.isPending ? 'Adding...' : `Add ${selectedGigIds.size} Gig${selectedGigIds.size !== 1 ? 's' : ''}`}
              </Button>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
  },
  modal: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusNum.lg,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacingNum[6],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  closeButton: {
    fontSize: 24,
    color: colors.text.muted,
    padding: spacingNum[2],
  },
  searchContainer: {
    padding: spacingNum[6],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  selectedCount: {
    marginTop: spacingNum[2],
  },
  content: {
    maxHeight: 400,
    padding: spacingNum[4],
  },
  emptyText: {
    textAlign: 'center',
    padding: spacingNum[8],
  },
  gigItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacingNum[4],
    borderRadius: radiusNum.md,
    marginBottom: spacingNum[2],
    backgroundColor: colors.surface.muted,
  },
  gigItemSelected: {
    backgroundColor: colors.brand.muted,
    borderWidth: 2,
    borderColor: colors.brand.DEFAULT,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    marginRight: spacingNum[3],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: colors.brand.DEFAULT,
    fontSize: 16,
    fontWeight: '700',
  },
  gigDetails: {
    flex: 1,
  },
  gigTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.DEFAULT,
    marginBottom: spacingNum[1],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacingNum[3],
    padding: spacingNum[6],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
});
