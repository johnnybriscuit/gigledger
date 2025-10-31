import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gig } from '../types';

interface GigCardProps {
  gig: Gig;
  onPress?: () => void;
}

export const GigCard: React.FC<GigCardProps> = ({ gig, onPress }) => {
  const getStatusColor = (status: Gig['status']) => {
    switch (status) {
      case 'paid':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'overdue':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{gig.clientName}</Text>
          <Text style={styles.projectName}>{gig.projectName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(gig.status) }]}>
          <Text style={styles.statusText}>{gig.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.amount}>${gig.amount.toFixed(2)}</Text>
        <Text style={styles.date}>{formatDate(gig.date)}</Text>
      </View>
      
      {gig.description && (
        <Text style={styles.description} numberOfLines={2}>
          {gig.description}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
    lineHeight: 20,
  },
});
