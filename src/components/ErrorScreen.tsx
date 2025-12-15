/**
 * ErrorScreen Component
 * 
 * Friendly error screen with retry functionality.
 * Shown when bootstrap fails or critical errors occur.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { H1, Text, Button } from '../ui';
import { colors, spacingNum } from '../styles/theme';

interface ErrorScreenProps {
  error?: string;
  onRetry: () => void;
}

export function ErrorScreen({ 
  error = 'Something went wrong loading your data.',
  onRetry 
}: ErrorScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <H1 style={styles.title}>Oops!</H1>
        <Text style={styles.message}>{error}</Text>
        <Text style={styles.hint}>
          This might be a temporary network issue. Try refreshing the page or check your connection.
        </Text>
        <Button 
          variant="primary" 
          onPress={onRetry}
          style={styles.button}
        >
          Try Again
        </Button>
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
    paddingHorizontal: spacingNum[6],
  },
  content: {
    alignItems: 'center',
    maxWidth: 500,
  },
  title: {
    marginBottom: spacingNum[4],
    color: colors.error.DEFAULT,
  },
  message: {
    textAlign: 'center',
    marginBottom: spacingNum[4],
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
    color: colors.text.muted,
    marginBottom: spacingNum[10],
    fontSize: 14,
  },
  button: {
    minWidth: 200,
  },
});
