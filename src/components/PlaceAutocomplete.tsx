/**
 * PlaceAutocomplete Component
 * Google Places Autocomplete with Modal overlay dropdown
 * Uses OverlayDropdown for true overlay rendering
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, StyleSheet, Platform, findNodeHandle, UIManager } from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import OverlayDropdown, { DropdownItem } from './OverlayDropdown';

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
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate a session token for billing optimization
  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Measure input position and open dropdown
  const openDropdown = useCallback(() => {
    const handle = findNodeHandle(inputRef.current);
    if (!handle) return;

    UIManager.measure(handle, (_x, _y, width, height, pageX, pageY) => {
      setAnchor({
        top: pageY + height,
        left: pageX,
        width,
      });
      setIsOpen(true);
    });
  }, []);

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
        params.append('radius', '50000');
      }

      const response = await fetch(`/api/places/autocomplete?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setPredictions(data.predictions || []);
      
      if (data.predictions && data.predictions.length > 0) {
        openDropdown();
      } else {
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [types, sessionToken, locationBias, openDropdown]);

  // Debounced input change handler
  const handleInputChange = (text: string) => {
    onChange(text);
    setHasConfirmedSelection(false);
    setShowError(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  // Handle selection from dropdown
  const handleSelect = useCallback((item: DropdownItem) => {
    const prediction = predictions.find(p => p.place_id === item.id);
    if (prediction) {
      onChange(prediction.description);
      setHasConfirmedSelection(true);
      setShowError(false);
      setIsOpen(false);
      setPredictions([]);
      onSelect(prediction);
    }
  }, [predictions, onChange, onSelect]);

  // Handle blur - validate confirmed selection
  const handleBlur = () => {
    setTimeout(() => {
      if (value && !hasConfirmedSelection) {
        setShowError(true);
      }
    }, 200);
  };

  // Handle focus - reopen if has predictions
  const handleFocus = () => {
    if (value && predictions.length > 0) {
      openDropdown();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const displayError = error || (showError ? 'Please choose a suggestion' : '');

  // Convert predictions to dropdown items
  const dropdownItems: DropdownItem[] = predictions.map(pred => ({
    id: pred.place_id,
    label: pred.structured_formatting?.main_text || pred.description,
    subtitle: pred.structured_formatting?.secondary_text,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
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
        onFocus={handleFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {isLoading && (
        <View style={styles.loadingIndicator}>
          <Text style={styles.loadingText}>...</Text>
        </View>
      )}

      {displayError ? (
        <Text style={styles.errorText}>{displayError}</Text>
      ) : null}

      <OverlayDropdown
        visible={isOpen}
        top={anchor.top}
        left={anchor.left}
        width={anchor.width}
        items={dropdownItems}
        onSelect={handleSelect}
        onClose={() => setIsOpen(false)}
        loading={isLoading && predictions.length === 0}
        emptyMessage="No matches found"
        activeIndex={activeIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: parseInt(spacing[4]),
  },
  label: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[2]),
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
    top: 42,
  },
  loadingText: {
    color: colors.text.muted,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 13,
    marginTop: parseInt(spacing[1]),
  },
});
