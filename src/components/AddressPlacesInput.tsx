/**
 * AddressPlacesInput Component
 * Wrapper around react-native-google-places-textinput for address autocomplete
 * Provides a stable, flicker-free autocomplete experience with opaque dropdown
 * Based on VenuePlacesInput implementation
 */

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import GooglePlacesTextInput, {
  type GooglePlacesTextInputStyles,
} from 'react-native-google-places-textinput';
import { Text } from '../ui';
import { colors } from '../styles/theme';
import Constants from 'expo-constants';

interface AddressPlacesInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: { 
    description: string; 
    place_id: string; 
    name?: string; 
    formatted_address?: string;
    lat?: number;
    lng?: number;
  }) => void;
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

export function AddressPlacesInput({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  disabled = false,
  error,
  helperText,
}: AddressPlacesInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [hasSelected, setHasSelected] = useState(false);
  const isTypingRef = React.useRef(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get API key from environment
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || 
                 process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handlePlaceSelect = (place: any) => {
    // Extract place details
    const placeName = place.structuredFormat?.mainText?.text || place.name || '';
    const formattedAddress = place.text?.text || place.formattedAddress || place.description || '';
    const placeId = place.placeId || '';
    
    // Determine if this is an establishment (venue) or just an address
    const isEstablishment = place.types?.includes('establishment') || 
                           place.types?.includes('point_of_interest');
    
    // Format display value:
    // - For establishments: "Venue Name — Full Address"
    // - For addresses: "Full Address"
    let displayValue = formattedAddress;
    if (isEstablishment && placeName && placeName !== formattedAddress) {
      displayValue = `${placeName} — ${formattedAddress}`;
    }
    
    // Mark as not typing since this is a selection
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Mark that user has selected from suggestions
    setHasSelected(true);
    
    // Update internal value
    setInternalValue(displayValue);
    
    // Call parent onChange
    onChange(displayValue);
    
    // Immediately call onSelect with placeId (field is now valid)
    // Coordinates will be fetched asynchronously
    onSelect({
      description: displayValue,
      place_id: placeId,
      name: placeName,
      formatted_address: formattedAddress,
    });
    
    // Fetch coordinates using Google Maps JS SDK PlacesService (browser-safe, no CORS)
    if (placeId && Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      const service = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails(
        {
          placeId: placeId,
          fields: ['geometry', 'formatted_address', 'name'],
        },
        (placeResult: any, status: any) => {
          if (status === 'OK' && placeResult?.geometry?.location) {
            const lat = placeResult.geometry.location.lat();
            const lng = placeResult.geometry.location.lng();
            console.log(`[AddressPlacesInput] Selected placeId=${placeId} resolved coords=(${lat},${lng}) using JS PlacesService`);
            
            // Call onSelect again with coordinates
            onSelect({
              description: displayValue,
              place_id: placeId,
              name: placeName,
              formatted_address: formattedAddress,
              lat,
              lng,
            });
          } else {
            console.error(`[AddressPlacesInput] Failed to fetch coordinates for placeId=${placeId}, status=${status}`);
          }
        }
      );
    } else {
      console.warn('[AddressPlacesInput] Google Maps JS SDK not available, coordinates will not be fetched');
    }
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
    
    // Reset selection state when user types
    setHasSelected(false);
    
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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <GooglePlacesTextInput
        apiKey={apiKey || ''}
        value={internalValue}
        onTextChange={handleTextChange}
        onPlaceSelect={handlePlaceSelect}
        placeHolderText={placeholder || 'Search for an address...'}
        editable={!disabled}
        fetchDetails={true}
        debounceDelay={300}
        minCharsToFetch={2}
        types={['establishment', 'geocode']}
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
      {!error && helperText && !hasSelected && internalValue ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

// Explicit styles for Google Places autocomplete dropdown
// Ensures fully opaque white background with no translucency
// Identical to VenuePlacesInput for consistent UX
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
  helperText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic' as any,
  },
});
