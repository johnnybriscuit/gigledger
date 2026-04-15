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
import { SecuritySettingsScreen } from './SecuritySettingsScreen';
// ToursScreen removed - now accessed from within Gigs page
import { AddGigModal } from '../components/AddGigModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { useDateRange } from '../hooks/useDateRange';
import { EnhancedDashboard } from '../components/dashboard/EnhancedDashboard';
import { PayerFilter } from '../components/PayerFilter';
import { usePayers } from '../hooks/usePayers';
import { Toast } from '../components/Toast';
import { TaxProfileBanner } from '../components/TaxProfileBanner';
import { RangePopover } from '../components/RangePopover';
import type { DateRange } from '../hooks/useDashboardData';
import { perf } from '../lib/performance';
import { H1, Text, Button } from '../ui';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { colors, spacing, typography, radius } from '../styles/theme';
import { AppShell } from '../components/layout/AppShell';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { DashboardTour } from '../components/DashboardTour';
import { isMFAEnabled } from '../lib/mfa';

type Tab = 'dashboard' | 'payers' | 'gigs' | 'expenses' | 'mileage' | 'invoices' | 'exports' | 'subscription' | 'account';

interface DashboardScreenProps {
  onNavigateToBusinessStructures?: () => void;
  onNavigateToMFASetup?: () => void;
}

export function DashboardScreen({ onNavigateToBusinessStructures, onNavigateToMFASetup }: DashboardScreenProps = {}) {
  const { isMobile, width } = useResponsive();
  const isDesktopWidth = Platform.OS === 'web' && width >= 768;
  
  // Use shared user context instead of individual queries
  const { profile, taxProfile, user } = useUser();
  
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
  const [showTour, setShowTour] = useState(false);
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  
  // Fetch payers for filter
  const { data: payers = [] } = usePayers();

  // Check if we should show onboarding completion toast and tour
  useEffect(() => {
    if (Platform.OS === 'web') {
      const checkTourStatus = async () => {
        const justCompletedOnboarding = sessionStorage.getItem('onboarding_just_completed');
        const shouldShowTour = sessionStorage.getItem('show_dashboard_tour');
        
        // Check URL query params for tour=true (manual replay)
        const urlParams = new URLSearchParams(window.location.search);
        const tourParam = urlParams.get('tour') === 'true';
        
        if (justCompletedOnboarding === 'true') {
          setShowOnboardingToast(true);
          setActiveTab('dashboard');
          sessionStorage.removeItem('onboarding_just_completed');
          localStorage.removeItem('activeTab');
        }
        
        // If tour is manually requested via URL param, show it
        if (tourParam) {
          console.log('✅ Starting tour (manual request)...');
          setTimeout(() => {
            setShowTour(true);
            window.history.replaceState({}, '', '/dashboard');
          }, 500);
          return;
        }
        
        // Check database for tour completion status
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          const { data: settings } = await supabase
            .from('user_settings')
            .select('dashboard_tour_completed')
            .eq('user_id', user.id)
            .single();
          
          // If tour already completed in database, don't show
          if (settings?.dashboard_tour_completed) {
            console.log('❌ Tour not shown - already completed in database');
            return;
          }
          
          // Check if user has any existing gigs (indicates they're not truly new)
          const { count: gigCount } = await supabase
            .from('gigs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          console.log('🎯 Tour decision logic:', {
            tourCompleted: settings?.dashboard_tour_completed,
            gigCount,
            shouldShowTour,
            isNewUser: gigCount === 0
          });
          
          // Only show tour for truly new users (no gigs) OR if explicitly requested
          if (shouldShowTour === 'true' && gigCount === 0) {
            console.log('✅ Starting tour for new user...');
            setTimeout(() => {
              setShowTour(true);
              sessionStorage.removeItem('show_dashboard_tour');
            }, 500);
          } else {
            console.log('❌ Tour not shown - user has existing data or tour not requested');
          }
        } catch (error) {
          console.error('Error checking tour status:', error);
        }
      };
      
      checkTourStatus();
    }
  }, []);

  useEffect(() => {
    const loadMfaStatus = async () => {
      try {
        const enabled = await isMFAEnabled();
        setMfaEnabled(enabled);
      } catch (error) {
        console.error('Error loading MFA status:', error);
      }
    };

    void loadMfaStatus();
  }, [activeTab]);

  const handleTourComplete = async () => {
    setShowTour(false);
    
    // Mark tour v2 as completed in localStorage
    if (Platform.OS === 'web') {
      localStorage.setItem('onboarding_v2_completed', 'true');
    }
    
    // Also mark in user settings for cross-device tracking (optional)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            dashboard_tour_completed: true,
            tour_completed_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
      }
    } catch (error) {
      console.error('Error marking tour as completed:', error);
    }
  };

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
      case 'payers': return 'Contacts';
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

  const TABS_WITH_DATE_FILTER: Tab[] = ['dashboard', 'gigs', 'expenses', 'mileage', 'invoices', 'exports'];
  const showDateFilter = TABS_WITH_DATE_FILTER.includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'payers':
        return <PayersScreen />;
      case 'gigs':
        return (
          <GigsScreen
            onNavigateToSubscription={() => setActiveTab('subscription')}
          />
        );
      case 'expenses':
        return (
          <ExpensesScreen
            onNavigateToSubscription={() => setActiveTab('subscription')}
          />
        );
      case 'mileage':
        return (
          <MileageScreen
            onNavigateToAccount={() => setActiveTab('account')}
          />
        );
      case 'invoices':
        return (
          <InvoicesScreen
            onNavigateToAccount={() => setActiveTab('account')}
            onNavigateToSubscription={() => setActiveTab('subscription')}
          />
        );
      case 'exports':
        return (
          <ExportsScreen
            dateRange={range}
            customStart={customStart}
            customEnd={customEnd}
          />
        );
      case 'subscription':
        return <SubscriptionScreen />;
      case 'account':
        if (showSecuritySettings) {
          return (
            <SecuritySettingsScreen
              onBack={() => setShowSecuritySettings(false)}
              onNavigateToMFASetup={() => onNavigateToMFASetup?.()}
            />
          );
        }
        return <AccountScreen
          onNavigateToBusinessStructures={onNavigateToBusinessStructures}
          onNavigateToInvoices={() => setActiveTab('invoices')}
          onNavigateToSecuritySettings={() => setShowSecuritySettings(true)}
        />;
      default:
        return (
          <EnhancedDashboard
            dateRange={range}
            customStart={customStart}
            customEnd={customEnd}
            payerId={selectedPayerId}
            onDateRangeChange={setRange}
            onCustomRangeChange={setCustomRange}
            onPayerChange={setSelectedPayerId}
            onNavigateToExpenses={() => setActiveTab('expenses')}
            onNavigateToGigs={(payerFilter) => {
              // TODO: Pass payer filter to GigsScreen
              setActiveTab('gigs');
            }}
            onNavigateToPayers={() => setActiveTab('payers')}
            onAddGig={() => setShowAddGigModal(true)}
            onAddExpense={() => setShowAddExpenseModal(true)}
            onExport={() => setActiveTab('exports')}
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

  const LIST_TABS = ['gigs', 'expenses', 'mileage', 'payers', 'invoices'];
  const isListTab = LIST_TABS.includes(activeTab);

  return (
    <AppShell
      activeRoute={activeTab}
      onNavigate={(route) => setActiveTab(route)}
      pageTitle={pageTitle}
      userName={profile?.full_name || undefined}
      userEmail={user?.email || undefined}
      onSignOut={handleSignOut}
      disableScroll={isListTab}
      headerRight={
        showDateFilter ? (
          <DateRangeFilter
            selected={range}
            onSelect={setRange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomRangeChange={setCustomRange}
          />
        ) : undefined
      }
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
              <>
                <PayerFilter
                  value={selectedPayerId}
                  onChange={setSelectedPayerId}
                  payers={payers.map(p => ({ id: p.id, name: p.name }))}
                />
                <RangePopover
                  value={range}
                  onChange={setRange}
                  onCustomRangeChange={setCustomRange}
                  customStart={customStart}
                  customEnd={customEnd}
                  options={[
                    { value: 'ytd' as DateRange, label: 'YTD' },
                    { value: 'last30' as DateRange, label: 'Last 30 Days' },
                    { value: 'last90' as DateRange, label: 'Last 90 Days' },
                    { value: 'lastYear' as DateRange, label: 'Last Year' },
                  ]}
                />
              </>
            )}
          </>
        ) : undefined
      }
      headerActions={
        !isMobile ? (
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
        ) : undefined
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

      {activeTab === 'dashboard' && !mfaEnabled && (
        <View style={styles.bannerContainer}>
          <View style={styles.securityBanner}>
            <View style={styles.securityBannerText}>
              <Text style={styles.securityBannerTitle}>Protect your account with 2-step verification.</Text>
              <Text style={styles.securityBannerBody}>You can finish it in about 30 seconds from Security Settings.</Text>
            </View>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => onNavigateToMFASetup?.()}
            >
              Enable 2FA
            </Button>
          </View>
        </View>
      )}

      {renderContent()}

      <AddGigModal
        visible={showAddGigModal}
        onClose={() => setShowAddGigModal(false)}
        onNavigateToExpenses={() => {
          setShowAddGigModal(false);
          setActiveTab('expenses');
        }}
        onNavigateToMileage={() => {
          setShowAddGigModal(false);
          setActiveTab('mileage');
        }}
        onNavigateToSubscription={() => {
          setShowAddGigModal(false);
          setActiveTab('subscription');
        }}
        source="dashboard"
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

      {Platform.OS === 'web' && (
        <DashboardTour
          show={showTour}
          onComplete={handleTourComplete}
          onNavigateToGigs={() => setActiveTab('gigs')}
          onOpenAddGigModal={() => setShowAddGigModal(true)}
        />
      )}
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
  securityBanner: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radius.lg ? parseInt(radius.lg) : 16,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: parseInt(spacing[4]),
    flexDirection: 'row',
    gap: parseInt(spacing[4]),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityBannerText: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  securityBannerTitle: {
    color: colors.text.DEFAULT,
    fontWeight: '600',
  },
  securityBannerBody: {
    color: colors.text.muted,
    fontSize: 14,
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
    marginHorizontal: 10,
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
    fontSize: Platform.OS === 'web' ? 48 : 32,
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
    marginHorizontal: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
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
    marginHorizontal: 10,
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
    marginHorizontal: 10,
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
    marginHorizontal: 10,
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
