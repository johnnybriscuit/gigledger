/**
 * LoadingScreen Component
 * 
 * Branded loading screen shown during app bootstrap.
 * Provides clear feedback to user that app is loading.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { H1, Text } from '../ui';
import { colors, spacingNum } from '../styles/theme';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading your dashboard...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <H1 style={styles.title}>GigLedger</H1>
        <ActivityIndicator size="large" color={colors.brand.DEFAULT} style={styles.spinner} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    paddingHorizontal: spacingNum[6],
  },
  title: {
    marginBottom: spacingNum[10],
    color: colors.brand.DEFAULT,
  },
  spinner: {
    marginBottom: spacingNum[6],
  },
  message: {
    textAlign: 'center',
    color: colors.text.muted,
  },
});
