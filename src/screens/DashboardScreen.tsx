import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { useUser } from '../contexts/UserContext';
import { PayersScreen } from './PayersScreen';
import { GigsScreen } from './GigsScreen';
import { ExpensesScreen } from './ExpensesScreen';
import { MileageScreen } from './MileageScreen';
import { ExportsScreen } from './ExportsScreen';
import { AccountScreen } from './AccountScreen';
import { SubscriptionScreen } from './SubscriptionScreen';
import { InvoicesScreen } from './InvoicesScreen';
import { AddGigModal } from '../components/AddGigModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { useDateRange } from '../hooks/useDateRange';
import { EnhancedDashboard } from '../components/dashboard/EnhancedDashboard';
import { Toast } from '../components/Toast';
import { TaxProfileBanner } from '../components/TaxProfileBanner';
import { RangePopover } from '../components/RangePopover';
import type { DateRange } from '../hooks/useDashboardData';
import { perf } from '../lib/performance';
import { H1, Text, Button } from '../ui';
import { colors, spacing, typography, radius } from '../styles/theme';
import { AppShell } from '../components/layout/AppShell';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type Tab = 'dashboard' | 'payers' | 'gigs' | 'expenses' | 'mileage' | 'invoices' | 'exports' | 'subscription' | 'account';

interface DashboardScreenProps {
  onNavigateToBusinessStructures?: () => void;
}

export function DashboardScreen({ onNavigateToBusinessStructures }: DashboardScreenProps = {}) {
  const { isMobile, width } = useResponsive();
  const isDesktopWidth = Platform.OS === 'web' && width >= 768;
  
  // Use shared user context instead of individual queries
  const { profile, taxProfile } = useUser();
  
  // Mark dashboard mount
  useEffect(() => {
    console.log('🔵 [DashboardScreen] Component mounted');
    perf.mark('dashboard-mounted');
  }, []);

  // Simple check: if we have profile, render dashboard
  // Don't wait for loading states - just render with what we have
  console.log('🔵 [DashboardScreen] Profile:', !!profile, 'TaxProfile:', !!taxProfile);

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
  const [showOnboardingToast, setShowOnboardingToast] = useState(false);

  // Check if we should show onboarding completion toast and set tab to dashboard
  useEffect(() => {
    if (Platform.OS === 'web') {
      const justCompletedOnboarding = sessionStorage.getItem('onboarding_just_completed');
      if (justCompletedOnboarding === 'true') {
        setShowOnboardingToast(true);
        setActiveTab('dashboard'); // Ensure we're on dashboard after onboarding
        sessionStorage.removeItem('onboarding_just_completed');
        // Clear the saved tab so we start fresh on dashboard
        localStorage.removeItem('activeTab');
      }
    }
  }, []);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (Platform.OS === 'web') {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  // Update document title based on active tab
  const pageTitle = getPageTitle();
  useDocumentTitle(pageTitle);

  function getPageTitle() {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'payers': return 'Payers';
      case 'gigs': return 'Gigs';
      case 'expenses': return 'Expenses';
      case 'mileage': return 'Mileage';
      case 'invoices': return 'Invoices';
      case 'exports': return 'Exports';
      case 'subscription': return 'Subscription';
      case 'account': return 'Account';
      default: return 'Dashboard';
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'payers':
        return <PayersScreen />;
      case 'gigs':
        return <GigsScreen onNavigateToSubscription={() => setActiveTab('subscription')} />;
      case 'expenses':
        return <ExpensesScreen />;
      case 'mileage':
        return <MileageScreen />;
      case 'invoices':
        return <InvoicesScreen 
          onNavigateToAccount={() => setActiveTab('account')} 
          onNavigateToSubscription={() => setActiveTab('subscription')}
        />;
      case 'exports':
        return <ExportsScreen />;
      case 'subscription':
        return <SubscriptionScreen />;
      case 'account':
        return <AccountScreen onNavigateToBusinessStructures={onNavigateToBusinessStructures} />;
      default:
        return (
          <EnhancedDashboard
            dateRange={range}
            customStart={customStart}
            customEnd={customEnd}
            onDateRangeChange={setRange}
            onCustomRangeChange={setCustomRange}
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
    console.log('🔴 Sign Out button clicked');
    try {
      console.log('🔴 Calling supabase.auth.signOut()');
      await supabase.auth.signOut();
      console.log('🔴 Sign out successful');
      // Auth state change will be handled by App.tsx
    } catch (error) {
      console.error('🔴 Error signing out:', error);
    }
  };

  return (
    <AppShell
      activeRoute={activeTab}
      onNavigate={(route) => setActiveTab(route)}
      pageTitle={pageTitle}
      userName={profile?.full_name || undefined}
      onSignOut={handleSignOut}
      pageActions={
        activeTab === 'dashboard' ? (
          <>
            <Button 
              variant="primary"
              size="sm"
              onPress={() => setShowAddGigModal(true)}
            >
              + Add Gig
            </Button>
            <Button 
              variant="secondary"
              size="sm"
              onPress={() => setShowAddExpenseModal(true)}
            >
              Add Expense
            </Button>
            <Button 
              variant="secondary"
              size="sm"
              onPress={() => setActiveTab('exports')}
            >
              Export
            </Button>
            {isDesktopWidth && (
              <RangePopover
                value={range}
                onChange={setRange}
                options={[
                  { value: 'ytd' as DateRange, label: 'YTD' },
                  { value: 'last30' as DateRange, label: 'Last 30 Days' },
                  { value: 'last90' as DateRange, label: 'Last 90 Days' },
                  { value: 'lastYear' as DateRange, label: 'Last Year' },
                ]}
              />
            )}
          </>
        ) : undefined
      }
      headerActions={
        isMobile ? (
          <Button 
            variant="ghost"
            size="sm"
            onPress={handleSignOut}
          >
            Sign Out
          </Button>
        ) : (
          <>
            <Button 
              variant="secondary"
              size="sm"
              onPress={() => setActiveTab('account')}
            >
              Account
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              onPress={handleSignOut}
            >
              Sign Out
            </Button>
          </>
        )
      }
    >
      {/* Show tax profile banner on dashboard tab if state is null */}
      {activeTab === 'dashboard' && taxProfile && !taxProfile.state && (
        <View style={styles.bannerContainer}>
          <TaxProfileBanner
            onNavigateToTaxSettings={() => setActiveTab('account')}
          />
        </View>
      )}

      {renderContent()}

      <AddGigModal
        visible={showAddGigModal}
        onClose={() => setShowAddGigModal(false)}
        onNavigateToSubscription={() => {
          setShowAddGigModal(false);
          setActiveTab('subscription');
        }}
      />

      <AddExpenseModal
        visible={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
      />

      <Toast
        message="You're set. Add gigs as you go and we'll keep your year in tune."
        visible={showOnboardingToast}
        onHide={() => setShowOnboardingToast(false)}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: parseInt(spacing[5]),
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + parseInt(spacing[4]),
    paddingBottom: parseInt(spacing[4]),
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  tabBar: {
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: parseInt(spacing[1]),
  },
  bannerContainer: {
    paddingHorizontal: parseInt(spacing[5]),
    paddingTop: parseInt(spacing[4]),
  },
  tab: {
    paddingVertical: parseInt(spacing[3]) + 2,
    paddingHorizontal: parseInt(spacing[4]),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 80,
  },
  tabActive: {
    borderBottomColor: colors.brand.DEFAULT,
  },
  tabText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  tabTextActive: {
    color: colors.brand.DEFAULT,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
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
