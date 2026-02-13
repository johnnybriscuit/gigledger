import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useTours } from '../../hooks/useTours';
import { useUpdateGig } from '../../hooks/useGigs';
import { H2, Text, Button, Badge } from '../../ui';
import { colors, spacingNum, radiusNum } from '../../styles/theme';

interface AssignGigsToTourModalProps {
  visible: boolean;
  gigIds: string[];
  onClose: () => void;
}

export function AssignGigsToTourModal({ visible, gigIds, onClose }: AssignGigsToTourModalProps) {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const { data: tours } = useTours();
  const updateGig = useUpdateGig();

  const handleAssign = async () => {
    if (!selectedTourId || gigIds.length === 0) return;

    setIsAssigning(true);
    try {
      // Update each gig with the selected tour
      for (const gigId of gigIds) {
        await updateGig.mutateAsync({
          id: gigId,
          tour_id: selectedTourId,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to assign gigs to tour:', error);
      if (Platform.OS === 'web') {
        window.alert("Couldn't assign gigs to tour. Try again.");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedTourId(null);
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
              <H2>Assign to Tour</H2>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text muted style={styles.description}>
                Select a tour to assign {gigIds.length} gig{gigIds.length !== 1 ? 's' : ''} to:
              </Text>

              <ScrollView style={styles.tourList}>
                {tours && tours.length > 0 ? (
                  tours.map((tour) => (
                    <TouchableOpacity
                      key={tour.id}
                      style={[
                        styles.tourItem,
                        selectedTourId === tour.id && styles.tourItemSelected,
                      ]}
                      onPress={() => setSelectedTourId(tour.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.tourInfo}>
                        <Text style={styles.tourName}>🎸 {tour.name}</Text>
                        {tour.artist_name && (
                          <Text muted>{tour.artist_name}</Text>
                        )}
                      </View>
                      {selectedTourId === tour.id && (
                        <Badge variant="success" size="sm">✓</Badge>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text muted style={styles.emptyText}>
                    No tours available. Create a tour first.
                  </Text>
                )}
              </ScrollView>
            </View>

            <View style={styles.footer}>
              <Button
                variant="ghost"
                onPress={handleClose}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                onPress={handleAssign}
                disabled={isAssigning || !selectedTourId}
              >
                {isAssigning ? 'Assigning...' : 'Assign to Tour'}
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
    maxWidth: 500,
    maxHeight: '70%',
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
  content: {
    padding: spacingNum[6],
  },
  description: {
    marginBottom: spacingNum[4],
  },
  tourList: {
    maxHeight: 300,
  },
  tourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingNum[4],
    borderRadius: radiusNum.md,
    marginBottom: spacingNum[2],
    backgroundColor: colors.surface.muted,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tourItemSelected: {
    backgroundColor: colors.brand.muted,
    borderColor: colors.brand.DEFAULT,
  },
  tourInfo: {
    flex: 1,
  },
  tourName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    marginBottom: spacingNum[1],
  },
  emptyText: {
    textAlign: 'center',
    padding: spacingNum[8],
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
