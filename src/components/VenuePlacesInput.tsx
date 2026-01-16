/**
 * VenuePlacesInput Component
 * Wrapper around react-native-google-places-textinput
 * Provides a stable, flicker-free autocomplete experience
 */

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import GooglePlacesTextInput, {
  type GooglePlacesTextInputStyles,
} from 'react-native-google-places-textinput';
import { Text } from '../ui';
import { colors } from '../styles/theme';
import Constants from 'expo-constants';

interface VenuePlacesInputProps {
  label: string;
  placeholder?: string;
  types?: 'establishment' | '(cities)' | 'address';
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: { description: string; place_id: string }) => void;
  disabled?: boolean;
  error?: string;
  locationBias?: { lat: number; lng: number };
}

export function VenuePlacesInput({
  label,
  placeholder,
  types = 'establishment',
  value,
  onChange,
  onSelect,
  disabled = false,
  error,
  locationBias,
}: VenuePlacesInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const isTypingRef = React.useRef(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get API key from environment
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || 
                 process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handlePlaceSelect = (place: any) => {
    console.log('[VenuePlacesInput] Place selected:', place.structuredFormat?.mainText?.text);
    
    // Extract description from the place object
    // The library returns place.text.text (full address) or place.structuredFormat.mainText.text (venue name only)
    const description = place.text?.text || 
                       place.structuredFormat?.mainText?.text || 
                       place.description || 
                       '';
    
    if (!description) {
      console.error('[VenuePlacesInput] Could not extract description from place object:', place);
      return;
    }
    
    // Mark as not typing since this is a selection
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Update internal value
    setInternalValue(description);
    
    // Call parent onChange
    onChange(description);
    
    // Call parent onSelect
    onSelect({
      description: description,
      place_id: place.placeId,
    });
  };

  const handleTextChange = (text: string) => {
    // Mark as actively typing
    isTypingRef.current = true;
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to mark typing as finished after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 1000);
    
    setInternalValue(text);
    onChange(text);
  };

  // Sync external value changes ONLY when not actively typing
  // This prevents the input from resetting while user is typing
  React.useEffect(() => {
    if (!isTypingRef.current && value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Map types to Google Places API types
  const getPlaceTypes = () => {
    switch (types) {
      case 'establishment':
        return ['establishment'];
      case '(cities)':
        return ['(cities)'];
      case 'address':
        return ['address'];
      default:
        return ['establishment'];
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <GooglePlacesTextInput
        apiKey={apiKey || ''}
        value={internalValue}
        onTextChange={handleTextChange}
        onPlaceSelect={handlePlaceSelect}
        placeHolderText={placeholder || 'Search...'}
        editable={!disabled}
        fetchDetails={false}
        debounceDelay={300}
        minCharsToFetch={2}
        types={getPlaceTypes()}
        locationBias={locationBias ? {
          circle: {
            center: {
              latitude: locationBias.lat,
              longitude: locationBias.lng,
            },
            radius: 50000,
          },
        } : undefined}
        style={{
          ...placesStyles,
          input: [
            placesStyles.input,
            error && { borderColor: colors.error.DEFAULT },
            disabled && { backgroundColor: colors.surface.muted, color: colors.text.muted },
          ],
          placeholder: {
            color: colors.text.muted,
          },
        }}
        showClearButton={true}
        showLoadingIndicator={true}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// Explicit styles for Google Places autocomplete dropdown
// Ensures fully opaque white background with no translucency
const placesStyles: GooglePlacesTextInputStyles = {
  container: {
    width: '100%',
    zIndex: 50, // Dropdown sits above the form
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF', // 🔒 Solid input background
    ...Platform.select({
      web: {
        // @ts-ignore - web-only property
        outlineStyle: 'none',
      },
    }),
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF', // 🔒 FULLY OPAQUE - no alpha channel
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 60, // Above everything else
    overflow: 'hidden',
    ...Platform.select({
      web: {
        // @ts-ignore - web-only properties
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
        backdropFilter: 'none', // No blur effects
        WebkitBackdropFilter: 'none',
      },
    }),
  },
  suggestionsList: {
    backgroundColor: '#FFFFFF', // 🔒 List itself also solid
  },
  suggestionItem: {
    backgroundColor: '#FFFFFF', // 🔒 Each row solid white
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    main: {
      fontSize: 16,
      color: '#111827',
      fontWeight: '500' as any,
    },
    secondary: {
      fontSize: 13,
      color: '#6B7280',
    },
  },
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
    zIndex: 40, // Wrapper sits above form but below dropdown
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as any,
    color: colors.text.DEFAULT,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    marginTop: 8,
  },
});
