/**
 * PlaceAutocomplete Component
 * Accessible combobox for Google Places Autocomplete
 * Requires confirmed selection (no free text)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
import { createPortal } from 'react-dom';

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
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [hasConfirmedSelection, setHasConfirmedSelection] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken] = useState(() => generateSessionToken());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<TextInput>(null);
  const containerRef = useRef<View>(null);
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

  // Update dropdown position when opening (web only)
  const updateDropdownPosition = useCallback(() => {
    if (Platform.OS === 'web' && containerRef.current) {
      // @ts-ignore - web-only method
      const rect = containerRef.current.getBoundingClientRect?.();
      if (rect) {
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  }, []);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen && Platform.OS === 'web') {
      updateDropdownPosition();
      // Update on scroll/resize
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen, updateDropdownPosition]);

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

  // Render dropdown content
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <View 
        style={[
          styles.dropdown,
          Platform.OS === 'web' && {
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          },
        ]}
        // @ts-ignore - web-only props
        id={Platform.OS === 'web' ? listId : undefined}
        role={Platform.OS === 'web' ? 'listbox' : undefined}
      >
        {isLoading && predictions.length === 0 ? (
          <View style={styles.loadingItem}>
            <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
            <Text style={styles.secondaryText}>Searching...</Text>
          </View>
        ) : predictions.length === 0 ? (
          <View style={styles.emptyItem}>
            <Text style={styles.secondaryText}>No matches found</Text>
          </View>
        ) : (
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item, index }) => (
              <View
                // @ts-ignore - web-only props
                onMouseEnter={() => Platform.OS === 'web' && setHoveredIndex(index)}
                onMouseLeave={() => Platform.OS === 'web' && setHoveredIndex(-1)}
              >
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    index === activeIndex && styles.dropdownItemActive,
                    index === hoveredIndex && styles.dropdownItemHovered,
                    index === predictions.length - 1 && styles.dropdownItemLast,
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
              </View>
            )}
            style={styles.dropdownList}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    );

    // On web, render in portal to escape modal overlay
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return createPortal(dropdownContent, document.body);
    }

    return dropdownContent;
  };

  return (
    <View style={[styles.container, isOpen && styles.containerActive]}>
      <Text style={styles.label}>{label}</Text>
      
      <View ref={containerRef} style={styles.inputContainer}>
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

      {/* Render dropdown via portal on web, inline on native */}
      {renderDropdown()}
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
    backgroundColor: '#ffffff', // Fully opaque white
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 288, // max-h-72
    ...Platform.select({
      web: {
        // @ts-ignore - web-only styles
        zIndex: 2000, // Higher than modal (modal is typically 1000-1500)
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        overflowY: 'auto',
        // Ensure no transparency
        opacity: 1,
        backdropFilter: 'none',
      },
      default: {
        zIndex: 10000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
      },
    }),
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9', // slate-100
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  dropdownItemHovered: {
    backgroundColor: '#f1f5f9', // slate-100
  },
  dropdownItemActive: {
    backgroundColor: '#eef2ff', // indigo-50
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  mainText: {
    fontSize: 14,
    color: '#0f172a', // slate-900
    fontWeight: '500',
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 12,
    color: '#64748b', // slate-500
  },
  loadingItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    opacity: 0.6,
  },
});
