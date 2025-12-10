/**
 * AddressAutocomplete Component
 * Free-solo address input with optional autocomplete suggestions
 * Allows typing freely - no forced selection
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, FlatList, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { useAnchorLayout } from '../hooks/useAnchorLayout';
import { isPrintableKey, isNavKey, isCloseKey } from '../lib/keyboard';
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
  onSelect?: (item: { description: string; place_id: string }) => void;
  disabled?: boolean;
  error?: string;
}

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  disabled = false,
  error,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sessionToken] = useState(() => generateSessionToken());
  const [isFocused, setIsFocused] = useState(false);

  const anchorRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Delayed blur to prevent race with click
  const isFocusedRef = useRef(false); // for async checks

  const { anchor, measure } = useAnchorLayout(anchorRef);

  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fetch predictions
  const fetchPredictions = useCallback(
    async (query: string) => {
      const trimmed = query.trim();

      if (trimmed.length < 3) {
        console.log('[AddressAutocomplete] Query too short, clearing predictions');
        setPredictions([]);
        setHighlightedIndex(-1);
        if (!isFocusedRef.current) {
          setIsOpen(false);
        }
        return;
      }

      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setIsLoading(true);
      setFetchError(null);
      console.log('[AddressAutocomplete] Fetching predictions for:', trimmed);

      try {
        const params = new URLSearchParams({
          q: trimmed,
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
        const newPredictions: PlacePrediction[] = data.predictions || [];
        setPredictions(newPredictions);
        setHighlightedIndex(newPredictions.length > 0 ? 0 : -1);

        console.log('[AddressAutocomplete] Received', newPredictions.length, 'predictions');

        // Only open dropdown if we are still focused when async finishes
        if (isFocusedRef.current && newPredictions.length > 0) {
          measure();
          setIsOpen(true);
          console.log('[AddressAutocomplete] Opening dropdown with results');
        } else if (!newPredictions.length) {
          setIsOpen(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[AddressAutocomplete] Request aborted');
          return;
        }

        console.error('[AddressAutocomplete] Error fetching predictions:', err);
        setFetchError("Couldn't load suggestions");
        setPredictions([]);
        setHighlightedIndex(-1);

        if (!isFocusedRef.current) {
          setIsOpen(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [sessionToken, measure]
  );

  // Handle input change - FREE TYPING, no interception
  const handleInputChange = (text: string) => {
    onChange(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  // Handle selection from dropdown
  const handleSelect = useCallback(
    (prediction: PlacePrediction) => {
      console.log('[AddressAutocomplete] Option selected:', prediction.description);

      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }

      onChange(prediction.description);
      setIsOpen(false);
      setPredictions([]);
      setHighlightedIndex(-1);

      if (onSelect) {
        onSelect({
          description: prediction.description,
          place_id: prediction.place_id,
        });
      }

      // Keep focus on input
      inputRef.current?.focus();
    },
    [onChange, onSelect]
  );

  // Focus handler - only open if we have predictions
  const handleFocus = () => {
    console.log('[AddressAutocomplete] Input focus, predictions:', predictions.length, 'isOpen:', isOpen);

    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
      console.log('[AddressAutocomplete] Cleared blur timeout on focus');
    }

    setIsFocused(true);
    isFocusedRef.current = true;

    // Only reopen if dropdown is currently closed AND we have predictions
    // This prevents focus/blur loops when Modal opens
    if (predictions.length > 0 && !isOpen) {
      console.log('[AddressAutocomplete] Opening dropdown on focus');
      measure();
      setIsOpen(true);
    }
  };

  // Delayed blur
  const handleBlur = () => {
    console.log('[AddressAutocomplete] Input blur - scheduling close in 150ms');

    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    blurTimeoutRef.current = setTimeout(() => {
      console.log('[AddressAutocomplete] Blur timeout fired - closing dropdown');
      setIsFocused(false);
      isFocusedRef.current = false;
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: any) => {
      if (isPrintableKey(e)) return;

      if (isOpen && isNavKey(e.key)) {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          if (!predictions?.length) return -1;
          const max = predictions.length - 1;
          const base = prev == null ? -1 : prev;
          const next =
            e.key === 'ArrowDown'
              ? base + 1
              : base - 1;
          return Math.max(0, Math.min(max, next));
        });
        return;
      }

      if (isOpen && e.key === 'Enter') {
        const hasHighlight =
          highlightedIndex != null &&
          highlightedIndex >= 0 &&
          predictions?.[highlightedIndex];

        if (hasHighlight) {
          e.preventDefault();
          handleSelect(predictions[highlightedIndex]);
        }
        return;
      }

      if (isOpen && isCloseKey(e.key)) {
        if (e.key === 'Escape') e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }
    },
    [isOpen, predictions, highlightedIndex, handleSelect]
  );

  // Close dropdown on overlay click
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsFocused(false);
    isFocusedRef.current = false;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
      isFocusedRef.current = false;
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
          onBlur={handleBlur}
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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <DropdownOverlay
        visible={isOpen}
        anchor={anchor}
        onClose={handleClose}
      >
        {fetchError ? (
          <View style={styles.messageContainer}>
            <Text style={styles.errorMessage}>{fetchError}</Text>
          </View>
        ) : predictions.length === 0 ? (
          <View style={styles.messageContainer}>
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
                  index === highlightedIndex && styles.itemHighlighted,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => handleSelect(item)}
                // @ts-ignore - web-only props
                onMouseDown={(e: any) => {
                  // FLICKER FIX: Prevent input blur when clicking option
                  e.preventDefault();
                  console.log('[AddressAutocomplete] Option mousedown - preventing blur');
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                accessibilityRole={Platform.OS === 'web' ? 'option' : undefined}
              >
                {item.structured_formatting ? (
                  <>
                    <Text style={styles.mainText}>
                      {item.structured_formatting.main_text}
                    </Text>
                    <Text style={styles.secondaryText}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </>
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
  itemHighlighted: {
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
  messageContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
  },
});
