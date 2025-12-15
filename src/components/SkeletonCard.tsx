/**
 * SkeletonCard Component
 * 
 * Skeleton placeholder for loading states.
 * Provides visual feedback while data is being fetched.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacingNum, radiusNum } from '../styles/theme';

interface SkeletonCardProps {
  height?: number;
  width?: number | string;
  style?: any;
}

export function SkeletonCard({ height = 100, width = '100%', style }: SkeletonCardProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { height, width, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonText({ width = '100%', style }: { width?: number | string; style?: any }) {
  return <SkeletonCard height={16} width={width} style={[{ borderRadius: 4 }, style]} />;
}

export function SkeletonGigCard() {
  return (
    <View style={styles.gigCard}>
      <View style={styles.gigHeader}>
        <SkeletonText width="60%" />
        <SkeletonText width="30%" />
      </View>
      <SkeletonText width="40%" style={{ marginTop: spacingNum[2] }} />
      <View style={styles.gigFooter}>
        <SkeletonText width="25%" />
        <SkeletonText width="25%" />
        <SkeletonText width="25%" />
      </View>
    </View>
  );
}

export function SkeletonDashboardCard() {
  return (
    <View style={styles.dashboardCard}>
      <SkeletonText width="50%" style={{ marginBottom: spacingNum[4] }} />
      <SkeletonCard height={200} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border.DEFAULT,
    borderRadius: radiusNum.sm,
  },
  gigCard: {
    backgroundColor: colors.surface.DEFAULT,
    padding: spacingNum[4],
    borderRadius: radiusNum.md,
    marginBottom: spacingNum[4],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  gigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gigFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacingNum[4],
  },
  dashboardCard: {
    backgroundColor: colors.surface.DEFAULT,
    padding: spacingNum[6],
    borderRadius: radiusNum.md,
    marginBottom: spacingNum[4],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
});
