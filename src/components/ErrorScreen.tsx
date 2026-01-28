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
  isSessionError?: boolean;
  onSignOut?: () => void;
}

export function ErrorScreen({ 
  error = 'Something went wrong loading your data.',
  onRetry,
  isSessionError = false,
  onSignOut
}: ErrorScreenProps) {
  // Special handling for session/auth errors
  if (isSessionError) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <H1 style={styles.title}>Session Expired</H1>
          <Text style={styles.message}>
            Your account session is no longer valid. This can happen if your account was removed or your session expired.
          </Text>
          <Text style={styles.hint}>
            Please sign in again to continue using Bozzy.
          </Text>
          <Button 
            variant="primary" 
            onPress={onSignOut || onRetry}
            style={styles.button}
          >
            Return to Sign In
          </Button>
        </View>
      </View>
    );
  }

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
