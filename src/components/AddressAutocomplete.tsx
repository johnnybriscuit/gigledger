/**
 * AddressAutocomplete Component
 * Google Places Autocomplete for addresses - allows free-form input
 * Unlike PlaceAutocomplete, this doesn't require confirmed selection
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, FlatList, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { useAnchorLayout } from '../hooks/useAnchorLayout';
import DropdownOverlay from './DropdownOverlay';

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  error?: string;
}

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sessionToken] = useState(() => generateSessionToken());

  const anchorRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const { anchor, measure } = useAnchorLayout(anchorRef);

  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fetch predictions
  const fetchPredictions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    setFetchError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        types: 'address',
        sessiontoken: sessionToken,
      });

      const response = await fetch(`/api/places/autocomplete?${params}`, {
        credentials: 'include',
        signal: abortController.current.signal,
      });

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
      if (err.name === 'AbortError') return;
      
      console.error('Error fetching predictions:', err);
      setFetchError('Couldn\'t load suggestions');
      setPredictions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, measure]);

  // Handle input change - allows free-form typing
  const handleInputChange = (text: string) => {
    onChange(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 250);
  };

  // Handle selection from dropdown
  const handleSelect = useCallback((prediction: PlacePrediction) => {
    onChange(prediction.description);
    setIsOpen(false);
    setPredictions([]);
    setActiveIndex(-1);
  }, [onChange]);

  // Handle focus
  const handleFocus = () => {
    if (value && predictions.length > 0) {
      measure();
      setIsOpen(true);
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: any) => {
    if (!isOpen) return;

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
        break;
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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View ref={anchorRef} onLayout={measure}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            error && styles.inputError,
            disabled && styles.inputDisabled,
          ]}
          value={value}
          onChangeText={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          editable={!disabled}
          autoCapitalize="words"
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

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
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
                // @ts-ignore - web-only
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
