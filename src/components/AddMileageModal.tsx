import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useCreateMileage, useUpdateMileage, calculateMileageDeduction, IRS_MILEAGE_RATE } from '../hooks/useMileage';
import { mileageSchema, type MileageFormData } from '../lib/validations';
import { DatePickerModal } from './ui/DatePickerModal';
import { toUtcDateString, fromUtcDateString } from '../lib/date';
import { AddressPlacesInput } from './AddressPlacesInput';
import { calculateDistance } from '../utils/distanceCalculation';
import { useCreateSavedRoute, useSavedRoutes } from '../hooks/useSavedRoutes';

interface AddMileageModalProps {
  visible: boolean;
  onClose: () => void;
  editingMileage?: any;
}

export function AddMileageModal({ visible, onClose, editingMileage }: AddMileageModalProps) {
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [miles, setMiles] = useState('');
  const [notes, setNotes] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [shouldSaveRoute, setShouldSaveRoute] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAutoCalculated, setIsAutoCalculated] = useState(false);
  const [startPlaceId, setStartPlaceId] = useState<string | null>(null);
  const [endPlaceId, setEndPlaceId] = useState<string | null>(null);
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  const createMileage = useCreateMileage();
  const updateMileage = useUpdateMileage();
  const createSavedRoute = useCreateSavedRoute();
  const { data: savedRoutes = [] } = useSavedRoutes();

  useEffect(() => {
    if (editingMileage) {
      setDate(editingMileage.date);
      setPurpose(editingMileage.purpose);
      setStartLocation(editingMileage.start_location);
      setEndLocation(editingMileage.end_location);
      setMiles(editingMileage.miles.toString());
      setNotes(editingMileage.notes || '');
    } else {
      resetForm();
    }
  }, [editingMileage, visible]);

  const resetForm = () => {
    setDate(toUtcDateString(new Date()));
    setPurpose('');
    setStartLocation('');
    setEndLocation('');
    setMiles('');
    setNotes('');
    setIsRoundTrip(false);
    setShouldSaveRoute(false);
    setRouteName('');
    setIsAutoCalculated(false);
    setStartPlaceId(null);
    setEndPlaceId(null);
    setStartCoords(null);
    setEndCoords(null);
    setLocationError('');
  };

  // Date picker handler
  const handleDateChange = (selectedDate: Date) => {
    setDate(toUtcDateString(selectedDate));
  };

  const calculateDeduction = () => {
    const milesNum = parseFloat(miles) || 0;
    return calculateMileageDeduction(milesNum);
  };

  // Auto-calculate distance from locations
  const handleCalculateDistance = async () => {
    // Validate that both locations are entered
    if (!startLocation || !endLocation) {
      setLocationError('Please enter both start and end locations');
      return;
    }

    // Validate that user selected from suggestions (has coordinates)
    if (!startCoords || !endCoords) {
      setLocationError('Please select a suggestion from the dropdown for both locations');
      return;
    }

    // Clear any previous errors
    setLocationError('');

    setIsCalculating(true);
    try {
      // Calculate distance using coordinates directly (no geocoding needed)
      const distance = calculateDistanceFromCoords(
        startCoords.lat,
        startCoords.lng,
        endCoords.lat,
        endCoords.lng
      );
      
      if (distance !== null) {
        const finalMiles = isRoundTrip ? distance * 2 : distance;
        setMiles(finalMiles.toFixed(1));
        setIsAutoCalculated(true);
      } else {
        setLocationError('Could not calculate distance. Please enter miles manually.');
      }
    } catch (error) {
      console.error('Distance calculation error:', error);
      setLocationError('Error calculating distance. Please enter miles manually.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Helper function to calculate distance from coordinates using Haversine formula
  const calculateDistanceFromCoords = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Update miles when round trip toggle changes
  useEffect(() => {
    if (isAutoCalculated && miles) {
      const currentMiles = parseFloat(miles);
      if (isRoundTrip) {
        setMiles((currentMiles * 2).toString());
      } else {
        setMiles((currentMiles / 2).toString());
      }
    }
  }, [isRoundTrip]);

  // Auto-generate route name from locations
  useEffect(() => {
    if (shouldSaveRoute && startLocation && endLocation) {
      const fromCity = startLocation.split(',')[0].trim();
      const toCity = endLocation.split(',')[0].trim();
      setRouteName(`${fromCity} → ${toCity}`);
    }
  }, [shouldSaveRoute, startLocation, endLocation]);

  // Handle saved route selection
  const handleSelectSavedRoute = (routeId: string) => {
    const route = savedRoutes.find(r => r.id === routeId);
    if (route) {
      setStartLocation(route.start_location);
      setEndLocation(route.end_location);
      setMiles(route.distance_miles.toString());
      if (route.default_purpose) {
        setPurpose(route.default_purpose);
      }
      setIsAutoCalculated(true);
    }
  };

  const handleSubmit = async () => {
    try {
      const formData: MileageFormData = {
        date,
        purpose,
        start_location: startLocation,
        end_location: endLocation,
        miles: parseFloat(miles) || 0,
        notes: notes || undefined,
      };

      const validated = mileageSchema.parse(formData);

      if (editingMileage) {
        await updateMileage.mutateAsync({
          id: editingMileage.id,
          ...validated,
        });
      } else {
        await createMileage.mutateAsync(validated);

        // Save route if requested
        if (shouldSaveRoute && routeName && startLocation && endLocation) {
          try {
            await createSavedRoute.mutateAsync({
              name: routeName,
              start_location: startLocation,
              end_location: endLocation,
              distance_miles: parseFloat(miles) || 0,
              default_purpose: purpose,
              is_favorite: false,
            });
          } catch (error) {
            console.error('Failed to save route:', error);
            // Don't block the main flow if route save fails
          }
        }
      }

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Mileage submission error:', error);
      if (error.errors) {
        if (Platform.OS === 'web') {
          window.alert(`Validation Error: ${error.errors[0].message}`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(`Error: ${error.message || 'Failed to save mileage'}`);
        }
      }
    }
  };

  const deduction = calculateDeduction();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingMileage ? 'Edit Trip' : 'Add New Trip'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {!editingMileage && savedRoutes.length > 0 && (
              <View style={styles.quickSelectSection}>
                <Text style={styles.quickSelectTitle}>🚀 Quick Select</Text>
                <Text style={styles.quickSelectSubtitle}>
                  Choose a saved route to auto-fill the form
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.routeCardsContainer}
                >
                  {savedRoutes.slice(0, 5).map((route) => (
                    <TouchableOpacity
                      key={route.id}
                      style={styles.routeCard}
                      onPress={() => handleSelectSavedRoute(route.id)}
                    >
                      <Text style={styles.routeCardName}>{route.name}</Text>
                      <Text style={styles.routeCardDetails}>
                        {route.distance_miles} mi • Used {route.use_count}x
                      </Text>
                      {route.is_favorite && (
                        <Text style={styles.favoriteIcon}>⭐</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {date || 'YYYY-MM-DD'}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purpose *</Text>
              <TextInput
                style={styles.input}
                value={purpose}
                onChangeText={setPurpose}
                placeholder="e.g., Drive to gig in Columbus"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <AddressPlacesInput
              label="Start Location *"
              placeholder="e.g., Ryman Auditorium or 123 Main St"
              value={startLocation}
              onChange={(text) => {
                setStartLocation(text);
                setStartPlaceId(null); // Reset place ID when typing
                setStartCoords(null); // Reset coordinates when typing
                setLocationError(''); // Clear errors
              }}
              onSelect={(item) => {
                setStartLocation(item.description);
                setStartPlaceId(item.place_id);
                if (item.lat && item.lng) {
                  setStartCoords({ lat: item.lat, lng: item.lng });
                  console.log('[AddMileageModal] Start coords set:', { lat: item.lat, lng: item.lng });
                }
                setLocationError(''); // Clear errors on selection
              }}
              helperText="Choose a suggestion for the most accurate mileage"
              error={locationError && !startCoords ? locationError : undefined}
            />

            <AddressPlacesInput
              label="End Location *"
              placeholder="e.g., The Ryman or 500 Broadway"
              value={endLocation}
              onChange={(text) => {
                setEndLocation(text);
                setEndPlaceId(null); // Reset place ID when typing
                setEndCoords(null); // Reset coordinates when typing
                setLocationError(''); // Clear errors
              }}
              onSelect={(item) => {
                setEndLocation(item.description);
                setEndPlaceId(item.place_id);
                if (item.lat && item.lng) {
                  setEndCoords({ lat: item.lat, lng: item.lng });
                  console.log('[AddMileageModal] End coords set:', { lat: item.lat, lng: item.lng });
                }
                setLocationError(''); // Clear errors on selection
              }}
              helperText="Choose a suggestion for the most accurate mileage"
              error={locationError && !endCoords ? locationError : undefined}
            />

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Miles *</Text>
                <TouchableOpacity
                  style={styles.calculateButton}
                  onPress={handleCalculateDistance}
                  disabled={isCalculating || !startLocation || !endLocation}
                >
                  {isCalculating ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <Text style={styles.calculateButtonText}>🔄 Calculate</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={miles}
                onChangeText={(text) => {
                  setMiles(text);
                  setIsAutoCalculated(false);
                }}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              {isAutoCalculated && (
                <Text style={styles.autoCalculatedHint}>
                  ✓ Auto-calculated
                </Text>
              )}
            </View>

            <View style={styles.checkboxGroup}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setIsRoundTrip(!isRoundTrip)}
              >
                <View style={[styles.checkboxBox, isRoundTrip && styles.checkboxBoxChecked]}>
                  {isRoundTrip && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Round trip (doubles the miles)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deductionCard}>
              <Text style={styles.deductionLabel}>Tax Deduction</Text>
              <Text style={styles.deductionValue}>
                ${deduction.toFixed(2)}
              </Text>
              <Text style={styles.deductionFormula}>
                {miles || '0'} miles × ${IRS_MILEAGE_RATE}/mile
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this trip..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {!editingMileage && (
              <View style={styles.saveRouteSection}>
                <View style={styles.checkboxGroup}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setShouldSaveRoute(!shouldSaveRoute)}
                  >
                    <View style={[styles.checkboxBox, shouldSaveRoute && styles.checkboxBoxChecked]}>
                      {shouldSaveRoute && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      Save this route for quick access later
                    </Text>
                  </TouchableOpacity>
                </View>
                {shouldSaveRoute && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Route Name</Text>
                    <TextInput
                      style={styles.input}
                      value={routeName}
                      onChangeText={setRouteName}
                      placeholder="e.g., Home → Office"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={createMileage.isPending || updateMileage.isPending}
            >
              <Text style={styles.submitButtonText} numberOfLines={1} ellipsizeMode="tail">
                {createMileage.isPending || updateMileage.isPending
                  ? 'Saving...'
                  : editingMileage
                  ? 'Update'
                  : 'Add'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        value={date ? fromUtcDateString(date) : null}
        onChange={handleDateChange}
        title="Select trip date"
        showTodayShortcut={true}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  dateButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  calendarIcon: {
    fontSize: 18,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  deductionCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  deductionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  deductionValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  deductionFormula: {
    fontSize: 12,
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculateButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  calculateButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  autoCalculatedHint: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  checkboxGroup: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  saveRouteSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  quickSelectSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickSelectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  quickSelectSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  routeCardsContainer: {
    marginTop: 4,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  routeCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  routeCardDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 14,
  },
});
