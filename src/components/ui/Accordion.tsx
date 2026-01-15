import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { colors, spacing, typography } from '../../styles/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function Accordion({ title, description, children, defaultExpanded = false }: AccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>{title}</Text>
          {description && !expanded && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
        <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: parseInt(spacing[3]),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    backgroundColor: colors.surface.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: parseInt(spacing[4]),
  },
  headerContent: {
    flex: 1,
    marginRight: parseInt(spacing[2]),
  },
  title: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 12,
    color: colors.text.muted,
  },
  content: {
    padding: parseInt(spacing[4]),
    paddingTop: 0,
  },
});
