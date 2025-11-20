/**
 * Test screen for PlaceAutocomplete component
 * Temporary - for testing Phase 1
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { PlaceAutocomplete } from '../components/PlaceAutocomplete';
import { H1, H2, Text, Card } from '../ui';
import { colors, spacing } from '../styles/theme';

export function PlacesTestScreen() {
  const [venueValue, setVenueValue] = useState('');
  const [venueSelection, setVenueSelection] = useState<any>(null);
  const [venueDetails, setVenueDetails] = useState<any>(null);

  const [cityValue, setCityValue] = useState('');
  const [citySelection, setCitySelection] = useState<any>(null);
  const [cityDetails, setCityDetails] = useState<any>(null);

  const [addressValue, setAddressValue] = useState('');
  const [addressSelection, setAddressSelection] = useState<any>(null);
  const [addressDetails, setAddressDetails] = useState<any>(null);

  const fetchDetails = async (placeId: string, type: 'venue' | 'city' | 'address') => {
    try {
      const response = await fetch(`/api/places/details?place_id=${placeId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch details');
      }

      const data = await response.json();
      
      if (type === 'venue') {
        setVenueDetails(data);
      } else if (type === 'city') {
        setCityDetails(data);
      } else {
        setAddressDetails(data);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <H1>Places Autocomplete Test</H1>
        <Text style={styles.subtitle}>Test the Google Places integration</Text>

        {/* Venue Test */}
        <Card variant="elevated" style={styles.section}>
          <H2>Venue (Establishment)</H2>
          <PlaceAutocomplete
            label="Venue Name"
            placeholder="Search for a venue..."
            types="establishment"
            value={venueValue}
            onChange={setVenueValue}
            onSelect={(item) => {
              setVenueSelection(item);
              fetchDetails(item.place_id, 'venue');
            }}
            locationBias={cityDetails?.location}
          />

          {venueSelection && (
            <View style={styles.result}>
              <Text semibold>Selected:</Text>
              <Text>{venueSelection.description}</Text>
              <Text muted>Place ID: {venueSelection.place_id}</Text>
            </View>
          )}

          {venueDetails && (
            <View style={styles.result}>
              <Text semibold>Details:</Text>
              <Text>Name: {venueDetails.name}</Text>
              <Text>Address: {venueDetails.formatted_address}</Text>
              {venueDetails.location && (
                <Text>
                  Location: {venueDetails.location.lat}, {venueDetails.location.lng}
                </Text>
              )}
              <Text muted style={styles.json}>
                {JSON.stringify(venueDetails.parts, null, 2)}
              </Text>
            </View>
          )}
        </Card>

        {/* City Test */}
        <Card variant="elevated" style={styles.section}>
          <H2>City</H2>
          <PlaceAutocomplete
            label="City"
            placeholder="Search for a city..."
            types="(cities)"
            value={cityValue}
            onChange={setCityValue}
            onSelect={(item) => {
              setCitySelection(item);
              fetchDetails(item.place_id, 'city');
            }}
          />

          {citySelection && (
            <View style={styles.result}>
              <Text semibold>Selected:</Text>
              <Text>{citySelection.description}</Text>
              <Text muted>Place ID: {citySelection.place_id}</Text>
            </View>
          )}

          {cityDetails && (
            <View style={styles.result}>
              <Text semibold>Details:</Text>
              <Text>Name: {cityDetails.name}</Text>
              <Text>Address: {cityDetails.formatted_address}</Text>
              {cityDetails.location && (
                <Text>
                  Location: {cityDetails.location.lat}, {cityDetails.location.lng}
                </Text>
              )}
              <Text muted style={styles.json}>
                {JSON.stringify(cityDetails.parts, null, 2)}
              </Text>
            </View>
          )}
        </Card>

        {/* Address Test */}
        <Card variant="elevated" style={styles.section}>
          <H2>Home Address</H2>
          <PlaceAutocomplete
            label="Address"
            placeholder="Search for an address..."
            types="address"
            value={addressValue}
            onChange={setAddressValue}
            onSelect={(item) => {
              setAddressSelection(item);
              fetchDetails(item.place_id, 'address');
            }}
          />

          {addressSelection && (
            <View style={styles.result}>
              <Text semibold>Selected:</Text>
              <Text>{addressSelection.description}</Text>
              <Text muted>Place ID: {addressSelection.place_id}</Text>
            </View>
          )}

          {addressDetails && (
            <View style={styles.result}>
              <Text semibold>Details:</Text>
              <Text>Name: {addressDetails.name}</Text>
              <Text>Address: {addressDetails.formatted_address}</Text>
              {addressDetails.location && (
                <Text>
                  Location: {addressDetails.location.lat}, {addressDetails.location.lng}
                </Text>
              )}
              <Text muted style={styles.json}>
                {JSON.stringify(addressDetails.parts, null, 2)}
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.instructions}>
          <Text semibold>Testing Instructions:</Text>
          <Text>1. Type at least 2 characters to see suggestions</Text>
          <Text>2. Use arrow keys (↑/↓) to navigate</Text>
          <Text>3. Press Enter or click to select</Text>
          <Text>4. Try typing without selecting - should show error</Text>
          <Text>5. Test location bias: Select a city first, then search for venues</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
  content: {
    padding: parseInt(spacing[4]),
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  subtitle: {
    color: colors.text.muted,
    marginBottom: parseInt(spacing[6]),
  },
  section: {
    marginBottom: parseInt(spacing[4]),
    padding: parseInt(spacing[4]),
  },
  result: {
    marginTop: parseInt(spacing[3]),
    padding: parseInt(spacing[3]),
    backgroundColor: colors.surface.muted,
    borderRadius: 8,
  },
  json: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: parseInt(spacing[2]),
  },
  instructions: {
    marginTop: parseInt(spacing[6]),
    padding: parseInt(spacing[4]),
    backgroundColor: colors.brand.muted,
    borderRadius: 8,
  },
});
