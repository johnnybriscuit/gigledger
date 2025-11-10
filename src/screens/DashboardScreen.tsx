import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { PayersScreen } from './PayersScreen';
import { GigsScreen } from './GigsScreen';
import { ExpensesScreen } from './ExpensesScreen';
import { MileageScreen } from './MileageScreen';
import { ExportsScreen } from './ExportsScreen';
import { AccountScreen } from './AccountScreen';
import { SubscriptionScreen } from './SubscriptionScreen';
import { AddGigModal } from '../components/AddGigModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { TaxProfileOnboarding } from '../components/TaxProfileOnboarding';
import { useQuery } from '@tanstack/react-query';
import { useDateRange } from '../hooks/useDateRange';
import { useHasTaxProfile } from '../hooks/useTaxProfile';
import { EnhancedDashboard } from '../components/dashboard/EnhancedDashboard';
import { Toast } from '../components/Toast'; // Import Toast component

type Tab = 'dashboard' | 'payers' | 'gigs' | 'expenses' | 'mileage' | 'exports' | 'subscription' | 'account';

export function DashboardScreen() {
  // Load active tab from localStorage on mount
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem('activeTab');
      return (saved as Tab) || 'dashboard';
    }
    return 'dashboard';
  });
  const { range, customStart, customEnd, setRange, setCustomRange } = useDateRange();
  const [showAddGigModal, setShowAddGigModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showTaxOnboarding, setShowTaxOnboarding] = useState(false);
  const [showOnboardingToast, setShowOnboardingToast] = useState(false);
  
  // Check if user has tax profile
  const { hasProfile, isLoading: isLoadingTaxProfile } = useHasTaxProfile();

  // Check if we should show onboarding completion toast
  useEffect(() => {
    if (Platform.OS === 'web') {
      const justCompletedOnboarding = sessionStorage.getItem('onboarding_just_completed');
      if (justCompletedOnboarding === 'true') {
        setShowOnboardingToast(true);
        sessionStorage.removeItem('onboarding_just_completed');
      }
    }
  }, []);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (Platform.OS === 'web') {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  // Show tax onboarding if user doesn't have a profile
  useEffect(() => {
    if (!isLoadingTaxProfile && !hasProfile) {
      setShowTaxOnboarding(true);
    }
  }, [hasProfile, isLoadingTaxProfile]);

  // Fetch user profile
  const { data: profile } = useQuery<{ full_name: string } | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (error) return null;
      return data;
    },
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'payers':
        return <PayersScreen />;
      case 'gigs':
        return <GigsScreen />;
      case 'expenses':
        return <ExpensesScreen />;
      case 'mileage':
        return <MileageScreen />;
      case 'exports':
        return <ExportsScreen />;
      case 'subscription':
        return <SubscriptionScreen />;
      case 'account':
        return <AccountScreen />;
      default:
        return (
          <EnhancedDashboard
            dateRange={range}
            customStart={customStart}
            customEnd={customEnd}
            onDateRangeChange={setRange}
            onCustomRangeChange={setCustomRange}
            onAddGig={() => setShowAddGigModal(true)}
            onAddExpense={() => setShowAddExpenseModal(true)}
            onExport={() => setActiveTab('exports')}
            onNavigateToExpenses={() => setActiveTab('expenses')}
            onNavigateToGigs={(payerFilter) => {
              // TODO: Pass payer filter to GigsScreen
              setActiveTab('gigs');
            }}
          />
        );
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Auth state change will be handled by App.tsx
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GigLedger</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.addGigButton}
            onPress={() => setShowAddGigModal(true)}
          >
            <Text style={styles.addGigButtonText}>+ Add Gig</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.accountButton}
            onPress={() => setActiveTab('account')}
          >
            <Text style={styles.accountButtonText}>Account</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payers' && styles.tabActive]}
          onPress={() => setActiveTab('payers')}
        >
          <Text style={[styles.tabText, activeTab === 'payers' && styles.tabTextActive]}>
            Payers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gigs' && styles.tabActive]}
          onPress={() => setActiveTab('gigs')}
        >
          <Text style={[styles.tabText, activeTab === 'gigs' && styles.tabTextActive]}>
            Gigs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.tabActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mileage' && styles.tabActive]}
          onPress={() => setActiveTab('mileage')}
        >
          <Text style={[styles.tabText, activeTab === 'mileage' && styles.tabTextActive]}>
            Mileage
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'exports' && styles.tabActive]}
          onPress={() => setActiveTab('exports')}
        >
          <Text style={[styles.tabText, activeTab === 'exports' && styles.tabTextActive]}>
            Exports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscription' && styles.tabActive]}
          onPress={() => setActiveTab('subscription')}
        >
          <Text style={[styles.tabText, activeTab === 'subscription' && styles.tabTextActive]}>
            Subscription
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'account' && styles.tabActive]}
          onPress={() => setActiveTab('account')}
        >
          <Text style={[styles.tabText, activeTab === 'account' && styles.tabTextActive]}>
            Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {renderContent()}

      <AddGigModal
        visible={showAddGigModal}
        onClose={() => setShowAddGigModal(false)}
      />

      <AddExpenseModal
        visible={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
      />

      <TaxProfileOnboarding
        visible={showTaxOnboarding}
        onComplete={() => setShowTaxOnboarding(false)}
      />

      <Toast
        message="You're set. Add gigs as you go and we'll keep your year in tune."
        visible={showOnboardingToast}
        onHide={() => setShowOnboardingToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  accountButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 80,
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  dashboardContent: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: '#1e40af',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bfdbfe',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  negativeValue: {
    color: '#fca5a5',
  },
  heroSubtext: {
    fontSize: 14,
    color: '#dbeafe',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statDetail: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  incomeValue: {
    color: '#059669',
  },
  tipsValue: {
    color: '#f59e0b',
  },
  feesValue: {
    color: '#ef4444',
  },
  deductionValue: {
    color: '#8b5cf6',
  },
  expenseValue: {
    color: '#ef4444',
  },
  mileageValue: {
    color: '#3b82f6',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  taxCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taxMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  taxMainLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  taxMainValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f59e0b',
  },
  taxBreakdown: {
    marginBottom: 16,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  taxLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  taxValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  taxLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  taxValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  taxDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  taxNote: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  taxNoteText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
  },
  taxPlanningNote: {
    backgroundColor: '#dbeafe',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  taxPlanningNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  taxPlanningNoteText: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 20,
  },
  addGigButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addGigButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
