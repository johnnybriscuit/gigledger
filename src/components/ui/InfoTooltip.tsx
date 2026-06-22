import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={() => setVisible(v => !v)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
        accessibilityLabel="More information"
        accessibilityRole="button"
      >
        <Text style={styles.icon}>ⓘ</Text>
      </TouchableOpacity>
      {visible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{text}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  icon: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 20,
    left: -100,
    zIndex: 2000,
  },
  bubble: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 10,
    maxWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  bubbleText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#F9FAFB',
  },
});
