import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { useCreateTour } from '../../hooks/useTours';
import { H2, Text, Button } from '../../ui';
import { colors, spacingNum, radiusNum } from '../../styles/theme';

interface CreateTourModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateTourModal({ visible, onClose }: CreateTourModalProps) {
  const [name, setName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const createTour = useCreateTour();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrors({ name: 'Tour name is required' });
      return;
    }

    try {
      await createTour.mutateAsync({
        name: name.trim(),
        artist_name: artistName.trim() || null,
        notes: notes.trim() || null,
      });

      setName('');
      setArtistName('');
      setNotes('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to create tour:', error);
      setErrors({ name: 'Failed to create tour. Please try again.' });
    }
  };

  const handleClose = () => {
    setName('');
    setArtistName('');
    setNotes('');
    setErrors({});
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
              <H2>Create Tour</H2>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.field}>
                <Text style={styles.label}>Tour Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors({});
                  }}
                  placeholder="e.g., Summer 2026 Tour"
                  autoFocus
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Artist/Band Name</Text>
                <TextInput
                  style={styles.input}
                  value={artistName}
                  onChangeText={setArtistName}
                  placeholder="Optional"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes about this tour"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <Text muted style={styles.hint}>
                After creating the tour, you'll be able to add gigs to it.
              </Text>
            </ScrollView>

            <View style={styles.footer}>
              <Button
                variant="ghost"
                onPress={handleClose}
                disabled={createTour.isPending}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                disabled={createTour.isPending || !name.trim()}
              >
                {createTour.isPending ? 'Creating...' : 'Create Tour'}
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
  content: {
    padding: spacingNum[6],
  },
  field: {
    marginBottom: spacingNum[5],
  },
  label: {
    marginBottom: spacingNum[2],
    fontWeight: '500',
    color: colors.text.DEFAULT,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusNum.md,
    padding: spacingNum[3],
    fontSize: 16,
    color: colors.text.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  inputError: {
    borderColor: colors.danger.DEFAULT,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger.DEFAULT,
    fontSize: 14,
    marginTop: spacingNum[1],
  },
  hint: {
    marginTop: spacingNum[4],
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
