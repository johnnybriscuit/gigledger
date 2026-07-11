// @ts-nocheck
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
  ScrollView,
  Pressable,
  LogBox,
} from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import DropdownOverlay from './DropdownOverlay';
import { useAnchorLayout } from '../hooks/useAnchorLayout';
import { isPrintableKey, isNavKey, isCloseKey } from '../lib/keyboard';

// Autocomplete is a progressive enhancement: prediction-fetch failures are
// expected (e.g. no network, proxy misconfigured) and are handled inline via
// fetchError below, so they should never interrupt the user with LogBox's
// dev-mode error banner. The failure is still logged to the console for
// debugging.
LogBox.ignoreLogs(['[PlaceAutocomplete] Error fetching predictions']);

// Lazy-load createPortal so native bundles never import react-dom
let createPortal: any = null;
if (typeof document !== 'undefined') {
  createPortal = require('react-dom').createPortal;
}

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
  onFocus?: () => void;
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
  onFocus,
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
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const anchorRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Delayed blur to prevent race with click
  const isFocusedRef = useRef(false); // ref for async checks

  const { anchor, measure } = useAnchorLayout(anchorRef);

  // Measure the input's viewport rect for the fixed-position portal (web only)
  const measureInputPosition = useCallback(() => {
    if (Platform.OS === 'web' && inputRef.current) {
      const domNode = inputRef.current as unknown as HTMLElement;
      if (domNode?.getBoundingClientRect) {
        const rect = domNode.getBoundingClientRect();
        setDropdownStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width });
      }
    }
  }, []);

  // Generate a session token for billing optimization
  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fetch predictions with proper error handling
  const fetchPredictions = useCallback(
    async (query: string) => {
      const trimmed = query.trim();

      // Don't fire requests for very short queries
      if (trimmed.length < 2) {
        setPredictions([]);
        setActiveIndex(-1);
        // If we're not focused anymore, make sure dropdown stays closed
        if (!isFocusedRef.current) {
          setIsOpen(false);
        }
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
          q: trimmed,
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
        const newPredictions: PlacePrediction[] = data.predictions || [];
        setPredictions(newPredictions);
        setActiveIndex(newPredictions.length > 0 ? 0 : -1);


        // Only open dropdown if input is STILL focused when the async call resolves
        if (isFocusedRef.current && newPredictions.length > 0) {
          measure();
          setIsOpen(true);
        } else if (!newPredictions.length) {
          // No predictions: keep dropdown closed unless it was already open
          setIsOpen(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }

        console.error('[PlaceAutocomplete] Error fetching predictions:', err);
        setFetchError("Couldn't load suggestions");
        setPredictions([]);
        setActiveIndex(-1);

        // If we've already blurred, don't pop the dropdown back open
        if (!isFocusedRef.current) {
          setIsOpen(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [types, sessionToken, locationBias, measure]
  );

  // Debounced input change handler
  const handleInputChange = (text: string) => {
    measureInputPosition();
    onChange(text);
    setHasConfirmedSelection(false);
    setShowError(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce 300ms - feels more stable, like Google autocomplete
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  // Handle selection
  const handleSelect = useCallback((prediction: PlacePrediction) => {
    
    // Clear blur timeout to prevent it from interfering
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    
    onChange(prediction.description);
    setHasConfirmedSelection(true);
    setShowError(false);
    setIsOpen(false);
    setPredictions([]);
    setActiveIndex(-1);
    onSelect(prediction);
  }, [onChange, onSelect]);

  // Delayed blur handler
  const handleBlur = () => {

    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
      isFocusedRef.current = false;
      setIsOpen(false);
      setActiveIndex(-1);
    }, 150);
  };

  // Focus handler - only open if we have predictions
  const handleFocus = () => {
    measureInputPosition();
    onFocus?.();

    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    setIsFocused(true);
    isFocusedRef.current = true;

    // Only reopen if dropdown is currently closed AND we have predictions
    // This prevents focus/blur loops when Modal opens
    if (predictions.length > 0 && !isOpen) {
      measure();
      setIsOpen(true);
    }
  };

  // Keyboard navigation using shared utilities
  const handleKeyDown = useCallback(
    (e: any) => {
      // Printable keys (including Space) should always type into the input
      if (isPrintableKey(e)) return;

      // Navigation keys - only when menu is open
      if (isOpen && isNavKey(e.key)) {
        e.preventDefault();
        setActiveIndex((prev) => {
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

      // Enter - only select if something is highlighted
      if (isOpen && e.key === 'Enter') {
        const hasHighlight =
          activeIndex != null &&
          activeIndex >= 0 &&
          predictions?.[activeIndex];

        if (hasHighlight) {
          e.preventDefault();
          handleSelect(predictions[activeIndex]);
        }
        return;
      }

      // Esc/Tab: close the menu; let Tab move focus naturally
      if (isOpen && isCloseKey(e.key)) {
        if (e.key === 'Escape') e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        return;
      }
    },
    [isOpen, predictions, activeIndex, handleSelect]
  );

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

  const displayError = error || ''; // No forced selection error

  // Shared dropdown content — used in both web inline and native Modal paths
  const dropdownContent = fetchError ? (
    <View style={styles.errorContainer}>
      <Text style={styles.errorMessage}>{fetchError}</Text>
    </View>
  ) : predictions.length === 0 ? (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No matches found</Text>
    </View>
  ) : (
    <ScrollView
      keyboardShouldPersistTaps="always"
      nestedScrollEnabled
    >
      {predictions.map((item, index) => (
        <Pressable
          key={item.place_id}
          style={({ pressed }) => [
            styles.item,
            index === activeIndex && styles.itemActive,
            pressed && styles.itemPressed,
          ]}
          onPressIn={() => {
            // Cancel blur timeout before onBlur can fire (mobile fix)
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
          }}
          onPress={() => handleSelect(item)}
          // @ts-ignore - web-only props
          onMouseDown={(e: any) => {
            // Prevent input blur on click (web fix)
            e.preventDefault();
          }}
          onMouseEnter={() => setActiveIndex(index)}
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
      ))}
    </ScrollView>
  );

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

      {Platform.OS === 'web' ? (
        // Web: portal to document.body — escapes Modal stacking context entirely
        isOpen && dropdownStyle && createPortal ? createPortal(
          <View
            style={{
              // @ts-ignore - position fixed is valid in RNW
              position: 'fixed',
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              maxHeight: 320,
              zIndex: 2147483647,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
              overflow: 'hidden',
              // @ts-ignore
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            {dropdownContent}
          </View>,
          document.body
        ) : null
      ) : (
        // Native: Modal-based overlay (position:absolute is clipped by ScrollView on native)
        <DropdownOverlay
          visible={isOpen}
          anchor={anchor}
          onClose={() => {
            setIsOpen(false);
            setActiveIndex(-1);
          }}
        >
          {dropdownContent}
        </DropdownOverlay>
      )}
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
  dropdown: {
    zIndex: 9999,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    maxHeight: 320,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 12,
      },
      web: {
        // @ts-ignore
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
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
