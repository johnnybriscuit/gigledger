/**
 * PlaceAutocomplete Component
 * Google Places Autocomplete with Modal overlay
 * Uses measureInWindow for cross-platform positioning
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  FlatList,
  Pressable,
} from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import DropdownOverlay from './DropdownOverlay';
import { useAnchorLayout } from '../hooks/useAnchorLayout';
import { isPrintableKey, isNavKey, isCloseKey } from '../lib/keyboard';

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sessionToken] = useState(() => generateSessionToken());

  const anchorRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const ignoreBlurRef = useRef(false); // Prevent blur when clicking inside dropdown

  const { anchor, measure } = useAnchorLayout(anchorRef);

  // Generate a session token for billing optimization
  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fetch predictions with proper error handling
  const fetchPredictions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    setFetchError(null);

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
        signal: abortController.current.signal,
      });

      // Check content-type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON, got: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setPredictions(data.predictions || []);
      
      if (data.predictions && data.predictions.length > 0) {
        measure();
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      
      console.error('Error fetching predictions:', err);
      setFetchError('Couldn\'t load suggestions');
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [types, sessionToken, locationBias, measure]);

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
    }, 250);
  };

  // Handle selection
  const handleSelect = useCallback((prediction: PlacePrediction) => {
    onChange(prediction.description);
    setHasConfirmedSelection(true);
    setShowError(false);
    setIsOpen(false);
    setPredictions([]);
    setActiveIndex(-1);
    onSelect(prediction);
  }, [onChange, onSelect]);

  // Handle blur - stable pattern to prevent flicker
  const handleBlur = () => {
    // If we're clicking inside the dropdown, don't close
    if (ignoreBlurRef.current) {
      ignoreBlurRef.current = false;
      return;
    }
    // Close dropdown on real blur (clicking outside, tab away)
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Handle focus
  const handleFocus = () => {
    if (value && predictions.length > 0) {
      measure();
      setIsOpen(true);
    }
  };

  // Keyboard navigation using shared utilities
  // NEVER preventDefault on Space or other printable characters
  const handleKeyDown = useCallback((e: any) => {
    // Printable keys (including Space) should always type into the input
    if (isPrintableKey(e)) return;

    // Navigation keys - only when menu is open
    if (isOpen && isNavKey(e.key)) {
      e.preventDefault();
      setActiveIndex((prev) => {
        if (!predictions?.length) return -1;
        const max = predictions.length - 1;
        const next =
          e.key === 'ArrowDown'
            ? (prev ?? -1) + 1
            : (prev ?? predictions.length) - 1;
        return Math.max(0, Math.min(max, next));
      });
      return;
    }

    // Enter - only select if something is highlighted
    if (isOpen && e.key === 'Enter') {
      const hasHighlight = activeIndex != null && activeIndex >= 0 && predictions?.[activeIndex];
      if (hasHighlight) {
        e.preventDefault();
        handleSelect(predictions[activeIndex]);
      }
      // If no highlight, let the form do its normal thing (no preventDefault)
      return;
    }

    // Esc/Tab: close the menu; let Tab move focus naturally
    if (isOpen && isCloseKey(e.key)) {
      if (e.key === 'Escape') e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
  }, [isOpen, predictions, activeIndex, handleSelect]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const displayError = error || ''; // No forced selection error

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View ref={anchorRef} onLayout={measure}>
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
          // @ts-ignore - web-only
          onKeyDown={Platform.OS === 'web' ? handleKeyDown : undefined}
        />

        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
          </View>
        )}
      </View>

      {displayError ? (
        <Text style={styles.errorText}>{displayError}</Text>
      ) : null}

      <DropdownOverlay
        visible={isOpen}
        anchor={anchor}
        onClose={() => setIsOpen(false)}
      >
        {fetchError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorMessage}>{fetchError}</Text>
          </View>
        ) : predictions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matches found</Text>
          </View>
        ) : (
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.item,
                  index === activeIndex && styles.itemActive,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => handleSelect(item)}
                // @ts-ignore - web-only props
                onMouseDown={() => { ignoreBlurRef.current = true; }}
                accessibilityRole={Platform.OS === 'web' ? 'menuitem' : undefined}
              >
                {item.structured_formatting ? (
                  <View>
                    <Text style={styles.mainText}>{item.structured_formatting.main_text}</Text>
                    <Text style={styles.secondaryText}>{item.structured_formatting.secondary_text}</Text>
                  </View>
                ) : (
                  <Text style={styles.mainText}>{item.description}</Text>
                )}
              </Pressable>
            )}
          />
        )}
      </DropdownOverlay>
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
    top: parseInt(spacing[3]),
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 13,
    marginTop: parseInt(spacing[1]),
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemActive: {
    backgroundColor: '#EEF2FF',
  },
  itemPressed: {
    backgroundColor: '#E0E7FF',
  },
  mainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  secondaryText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
  },
});
