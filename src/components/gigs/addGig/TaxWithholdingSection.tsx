import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Accordion } from '../../ui/Accordion';
import { spacing } from '../../../styles/theme';

interface TaxWithholdingSectionProps {
  children: React.ReactNode;
}

export function TaxWithholdingSection({ children }: TaxWithholdingSectionProps) {
  return (
    <Accordion title="Tax & withholding" description="Tax treatment overrides and withholding details">
      <View style={styles.content}>{children}</View>
    </Accordion>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: parseInt(spacing[4]),
  },
});
