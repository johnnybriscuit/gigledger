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

  const anchorRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const menuRef = useRef<HTMLDivElement | null>(null); // Track dropdown for relatedTarget check
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const ignoreBlurRef = useRef(false); // Prevent blur when clicking inside dropdown

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
        setHighlightedIndex(-1); // Reset highlight
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

  // Handle input change - FREE TYPING, no interception
  const handleInputChange = (text: string) => {
    onChange(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce 300ms - feels more stable, like Google autocomplete
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  // Handle selection from dropdown
  const handleSelect = useCallback((prediction: PlacePrediction) => {
    onChange(prediction.description);
    setIsOpen(false);
    setPredictions([]);
    setHighlightedIndex(-1);
    // Call onSelect callback if provided
    if (onSelect) {
      onSelect({
        description: prediction.description,
        place_id: prediction.place_id,
      });
    }
    // Keep focus on input
    inputRef.current?.focus();
  }, [onChange, onSelect]);

  // Pointer-down pattern: prevents blur-closing during click
  const selectingRef = useRef(false);

  // Handle focus - only open if results already exist
  const handleFocus = () => {
    if (predictions.length > 0) {
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
      setHighlightedIndex((prev) => {
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
      const hasHighlight = highlightedIndex != null && highlightedIndex >= 0 && predictions?.[highlightedIndex];
      if (hasHighlight) {
        e.preventDefault();
        handleSelect(predictions[highlightedIndex]);
      }
      // If no highlight, let the form do its normal thing (no preventDefault)
      return;
    }

    // Esc/Tab: close the menu; let Tab move focus naturally
    if (isOpen && isCloseKey(e.key)) {
      if (e.key === 'Escape') e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }
  }, [isOpen, predictions, highlightedIndex, handleSelect]);

  // Close dropdown on overlay click
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

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
          onBlur={() => {
            // Pointer-down pattern: if selecting, keep open
            if (selectingRef.current) {
              selectingRef.current = false;
              return;
            }
            // Close immediately - no setTimeout
            setIsOpen(false);
            setHighlightedIndex(-1);
          }}
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
        onClose={handleClose}
        menuRef={menuRef}
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
                onPointerDown={() => {
                  // Pointer-down pattern: mark that we're selecting
                  selectingRef.current = true;
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
