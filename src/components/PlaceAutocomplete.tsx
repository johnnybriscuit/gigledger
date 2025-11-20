/**
 * PlaceAutocomplete Component
 * Accessible combobox for Google Places Autocomplete
 * Requires confirmed selection (no free text)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, StyleSheet, Platform } from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceAutocompleteProps {
  label: string;
  placeholder?: string;
  types: 'establishment' | '(cities)' | 'address';
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: { description: string; place_id: string }) => void;
  initialQuery?: string;
  disabled?: boolean;
  error?: string;
  locationBias?: { lat: number; lng: number };
}

export function PlaceAutocomplete({
  label,
  placeholder,
  types,
  value,
  onChange,
  onSelect,
  initialQuery,
  disabled = false,
  error,
  locationBias,
}: PlaceAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasConfirmedSelection, setHasConfirmedSelection] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken] = useState(() => generateSessionToken());

  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const listId = useRef(`place-list-${Math.random().toString(36).substr(2, 9)}`).current;

  // Generate a session token for billing optimization
  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fetch predictions from our proxy API
  const fetchPredictions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        q: query,
        types,
        sessiontoken: sessionToken,
      });

      if (locationBias) {
        params.append('location', `${locationBias.lat},${locationBias.lng}`);
        params.append('radius', '50000'); // 50km radius
      }

      const response = await fetch(`/api/places/autocomplete?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const data = await response.json();
      setPredictions(data.predictions || []);
      setIsOpen(data.predictions.length > 0);
      setActiveIndex(-1);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [types, sessionToken, locationBias]);

  // Debounced input handler
  const handleInputChange = useCallback((text: string) => {
    onChange(text);
    setHasConfirmedSelection(false);
    setShowError(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 250);
  }, [onChange, fetchPredictions]);

  // Handle selection
  const handleSelect = useCallback((prediction: PlacePrediction) => {
    onChange(prediction.description);
    setHasConfirmedSelection(true);
    setShowError(false);
    setIsOpen(false);
    setPredictions([]);
    onSelect({ description: prediction.description, place_id: prediction.place_id });
  }, [onChange, onSelect]);

  // Handle blur - validate confirmed selection
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (value && !hasConfirmedSelection && predictions.length === 0) {
        setShowError(true);
      }
      setIsOpen(false);
    }, 200); // Delay to allow click on dropdown item
  }, [value, hasConfirmedSelection, predictions.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: any) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < predictions.length) {
          handleSelect(predictions[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setPredictions([]);
        break;
    }
  }, [isOpen, predictions, activeIndex, handleSelect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const displayError = error || (showError ? 'Please choose a suggestion' : '');

  return (
    <View style={[styles.container, isOpen && styles.containerActive]}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            displayError && styles.inputError,
            disabled && styles.inputDisabled,
          ]}
          value={value}
          onChangeText={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => {
            if (value && predictions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          editable={!disabled}
          autoComplete="off"
          autoCorrect={false}
          // @ts-ignore - web-only props
          role={Platform.OS === 'web' ? 'combobox' : undefined}
          aria-label={Platform.OS === 'web' ? label : undefined}
          aria-expanded={Platform.OS === 'web' ? isOpen : undefined}
          aria-controls={Platform.OS === 'web' ? listId : undefined}
          aria-activedescendant={Platform.OS === 'web' && activeIndex >= 0 ? `${listId}-item-${activeIndex}` : undefined}
          aria-autocomplete={Platform.OS === 'web' ? 'list' : undefined}
          onKeyDown={Platform.OS === 'web' ? handleKeyDown : undefined}
        />

        {isLoading && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>...</Text>
          </View>
        )}
      </View>

      {displayError && (
        <Text 
          style={styles.errorText}
          // @ts-ignore - web-only prop
          aria-live={Platform.OS === 'web' ? 'polite' : undefined}
        >
          {displayError}
        </Text>
      )}

      {isOpen && predictions.length > 0 && (
        <View 
          style={styles.dropdown}
          // @ts-ignore - web-only props
          id={Platform.OS === 'web' ? listId : undefined}
          role={Platform.OS === 'web' ? 'listbox' : undefined}
        >
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  index === activeIndex && styles.dropdownItemActive,
                ]}
                onPress={() => handleSelect(item)}
                // @ts-ignore - web-only props
                id={Platform.OS === 'web' ? `${listId}-item-${index}` : undefined}
                role={Platform.OS === 'web' ? 'option' : undefined}
                aria-selected={Platform.OS === 'web' ? index === activeIndex : undefined}
              >
                {item.structured_formatting ? (
                  <View>
                    <Text style={styles.mainText}>{item.structured_formatting.main_text}</Text>
                    <Text style={styles.secondaryText}>{item.structured_formatting.secondary_text}</Text>
                  </View>
                ) : (
                  <Text style={styles.mainText}>{item.description}</Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.dropdownList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: parseInt(spacing[4]),
    zIndex: 1,
  },
  containerActive: {
    zIndex: 1000, // Higher z-index when dropdown is open
  },
  label: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[2]),
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
    ...Platform.select({
      web: {
        // @ts-ignore - web-only
        overflow: 'visible',
      },
    }),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.md),
    padding: parseInt(spacing[3]),
    fontSize: 16,
    color: colors.text.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  inputError: {
    borderColor: colors.error.DEFAULT,
  },
  inputDisabled: {
    backgroundColor: colors.surface.muted,
    color: colors.text.muted,
  },
  loadingIndicator: {
    position: 'absolute',
    right: parseInt(spacing[3]),
    top: parseInt(spacing[3]),
  },
  loadingText: {
    color: colors.text.muted,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 13,
    marginTop: parseInt(spacing[1]),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.md),
    marginTop: parseInt(spacing[1]),
    maxHeight: 300,
    zIndex: 10000,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 8,
      },
    }),
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: parseInt(spacing[3]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: '#ffffff', // Solid white background
  },
  dropdownItemActive: {
    backgroundColor: colors.brand.muted, // Light blue when active
  },
  mainText: {
    fontSize: 15,
    color: colors.text.DEFAULT,
    fontWeight: typography.fontWeight.medium,
  },
  secondaryText: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
});
