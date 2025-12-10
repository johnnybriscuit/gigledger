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

  // Get API key from environment
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || 
                 process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handlePlaceSelect = (place: any) => {
    console.log('[VenuePlacesInput] Place selected - FULL OBJECT:', JSON.stringify(place, null, 2));
    console.log('[VenuePlacesInput] place.text:', place.text);
    console.log('[VenuePlacesInput] place.structuredFormat:', place.structuredFormat);
    console.log('[VenuePlacesInput] place.description:', place.description);
    
    // Extract description from the place object
    // Try multiple possible locations for the text
    let description = '';
    
    if (place.text?.text) {
      description = place.text.text;
      console.log('[VenuePlacesInput] Using place.text.text:', description);
    } else if (place.text) {
      description = place.text;
      console.log('[VenuePlacesInput] Using place.text:', description);
    } else if (place.structuredFormat?.mainText?.text) {
      description = place.structuredFormat.mainText.text;
      console.log('[VenuePlacesInput] Using place.structuredFormat.mainText.text:', description);
    } else if (place.description) {
      description = place.description;
      console.log('[VenuePlacesInput] Using place.description:', description);
    } else {
      console.error('[VenuePlacesInput] Could not extract description from place object!');
    }
    
    console.log('[VenuePlacesInput] Final description:', description);
    console.log('[VenuePlacesInput] Setting internalValue to:', description);
    
    // Update internal value
    setInternalValue(description);
    
    // Call parent onChange
    onChange(description);
    
    // Call parent onSelect
    onSelect({
      description: description,
      place_id: place.placeId,
    });
    
    console.log('[VenuePlacesInput] After setState - internalValue should be:', description);
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
