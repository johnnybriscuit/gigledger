import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Badge } from '../ui/Badge';

interface ExportCardProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  badge?: 'recommended' | 'tax-ready' | 'new';
  onPress: () => void;
  onHelpPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ExportCard({
  title,
  subtitle,
  icon,
  badge,
  onPress,
  onHelpPress,
  loading = false,
  disabled = false,
}: ExportCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {badge && (
            <Badge
              variant={badge === 'recommended' ? 'success' : 'neutral'}
              size="sm"
            >
              {badge === 'recommended' ? 'Recommended' : badge === 'new' ? 'New' : 'Tax-Ready'}
            </Badge>
          )}
        </View>
        
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>

        <View style={styles.cardFooter}>
          {loading ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <Text style={styles.downloadText}>Download</Text>
          )}
          
          {onHelpPress && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onHelpPress();
              }}
              style={styles.helpButton}
            >
              <Text style={styles.helpText}>How to import</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  icon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  helpButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
});
