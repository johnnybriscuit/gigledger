/**
 * VenuePlacesInput Component
 * Wrapper around react-native-google-places-textinput
 * Provides a stable, flicker-free autocomplete experience
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import GooglePlacesTextInput from 'react-native-google-places-textinput';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';
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

  // Get API key from environment
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || 
                 process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handlePlaceSelect = (place: any) => {
    console.log('[VenuePlacesInput] Place selected:', place);
    
    // Update internal value
    setInternalValue(place.description);
    
    // Call parent onChange
    onChange(place.description);
    
    // Call parent onSelect
    onSelect({
      description: place.description,
      place_id: place.placeId,
    });
  };

  const handleTextChange = (text: string) => {
    console.log('[VenuePlacesInput] Text changed:', text);
    setInternalValue(text);
    onChange(text);
  };

  // Sync external value changes
  React.useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

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
          container: styles.autocompleteContainer,
          input: [
            styles.input,
            error && styles.inputError,
            disabled && styles.inputDisabled,
          ],
          suggestionsContainer: styles.suggestionsContainer,
          suggestionsList: styles.suggestionsList,
          suggestionItem: styles.suggestionItem,
          suggestionText: {
            main: styles.suggestionMainText,
            secondary: styles.suggestionSecondaryText,
          },
          placeholder: {
            color: colors.text.muted,
          },
        }}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as any,
    color: colors.text.DEFAULT,
    marginBottom: 8,
  },
  autocompleteContainer: {
    flex: 0,
    zIndex: 1,
    width: '100%',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text.DEFAULT,
    backgroundColor: '#FFFFFF', // Fully opaque white
    ...Platform.select({
      web: {
        // @ts-ignore - web-only property
        outlineStyle: 'none',
      },
    }),
  },
  inputError: {
    borderColor: colors.error.DEFAULT,
  },
  inputDisabled: {
    backgroundColor: colors.surface.muted,
    color: colors.text.muted,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    marginTop: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF', // FULLY OPAQUE WHITE - no alpha channel
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 320,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
      web: {
        // @ts-ignore - web-only properties for solid opaque dropdown
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        opacity: 1,
      },
    }),
  },
  suggestionsList: {
    backgroundColor: '#FFFFFF', // FULLY OPAQUE
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF', // FULLY OPAQUE - each row solid white
  },
  suggestionMainText: {
    fontSize: 16,
    color: colors.text.DEFAULT,
    fontWeight: '500' as any,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 2,
  },
});
