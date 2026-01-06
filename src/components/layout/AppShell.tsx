import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, Text } from 'react-native';
import { colors, spacingNum } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';

type Route = 'dashboard' | 'payers' | 'gigs' | 'expenses' | 'mileage' | 'invoices' | 'exports' | 'subscription' | 'account';

interface NavItem {
  id: Route;
  label: string;
  icon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'payers', label: 'Payers', icon: '👥' },
  { id: 'gigs', label: 'Gigs', icon: '🎵' },
  { id: 'expenses', label: 'Expenses', icon: '💰' },
  { id: 'mileage', label: 'Mileage', icon: '🚗' },
  { id: 'invoices', label: 'Invoices', icon: '🧾' },
  { id: 'exports', label: 'Exports', icon: '📤' },
  { id: 'subscription', label: 'Subscription', icon: '⭐' },
  { id: 'account', label: 'Account', icon: '⚙️' },
];

interface AppShellProps {
  activeRoute: Route;
  onNavigate: (route: Route) => void;
  children: React.ReactNode;
  pageTitle?: string;
  pageActions?: React.ReactNode;
  headerActions?: React.ReactNode;
  userName?: string;
  onSignOut?: () => void;
}

export function AppShell({
  activeRoute,
  onNavigate,
  children,
  pageTitle,
  pageActions,
  headerActions,
  userName,
  onSignOut,
}: AppShellProps) {
  const { isMobile, width } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /*
   * REGRESSION PREVENTION:
   * - Desktop sidebar (width >= 768) must ALWAYS remain visible
   * - Mobile (width < 768) uses hamburger menu + drawer overlay
   * - DO NOT hide sidebar with display:none or CSS @media queries
   * - Use useWindowDimensions for responsive behavior, NOT Platform.OS checks
   */
  useEffect(() => {
    if (!isMobile && __DEV__) {
      // Dev-only assertion: desktop sidebar should always render
      console.log('[AppShell] Desktop mode - sidebar visible');
    }
  }, [isMobile]);

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      {/* Logo */}
      <TouchableOpacity 
        style={styles.logoContainer}
        onPress={() => onNavigate('dashboard')}
      >
        <Image 
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>GigLedger</Text>
      </TouchableOpacity>

      {/* Navigation */}
      <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              activeRoute === item.id && styles.navItemActive,
            ]}
            onPress={() => {
              onNavigate(item.id);
              if (isMobile) setMobileMenuOpen(false);
            }}
          >
            {item.icon && <Text style={styles.navIcon}>{item.icon}</Text>}
            <Text
              style={[
                styles.navLabel,
                activeRoute === item.id && styles.navLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mobile: Account + Sign Out at bottom of drawer */}
      {isMobile && (
        <View style={styles.drawerFooter}>
          <TouchableOpacity
            style={styles.drawerFooterButton}
            onPress={() => {
              onNavigate('account');
              setMobileMenuOpen(false);
            }}
          >
            <Text style={styles.drawerFooterIcon}>⚙️</Text>
            <Text style={styles.drawerFooterLabel}>Account</Text>
          </TouchableOpacity>
          {onSignOut && (
            <TouchableOpacity
              style={styles.drawerFooterButton}
              onPress={() => {
                setMobileMenuOpen(false);
                onSignOut();
              }}
            >
              <Text style={styles.drawerFooterIcon}>🚪</Text>
              <Text style={styles.drawerFooterLabel}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Desktop (≥768px): Always show fixed sidebar */}
      {!isMobile && renderSidebar()}

      {/* Mobile (<768px): Hamburger menu + drawer */}
      {isMobile && (
        <>
          <View style={styles.mobileHeader}>
            <TouchableOpacity
              style={styles.hamburger}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
            <Image 
              source={require('../../../assets/icon.png')}
              style={styles.mobileHeaderLogo}
              resizeMode="contain"
            />
            <Text style={styles.mobileTitle}>GigLedger</Text>
          </View>
          {mobileMenuOpen && (
            <>
              {/* Backdrop overlay */}
              <TouchableOpacity
                style={styles.drawerBackdrop}
                activeOpacity={1}
                onPress={() => setMobileMenuOpen(false)}
              />
              {/* Drawer panel */}
              <View style={styles.drawerPanel}>
                {renderSidebar()}
              </View>
            </>
          )}
        </>
      )}

      {/* Main content area */}
      <View style={[styles.mainContainer, isMobile && styles.mainContainerMobile]}>
        {/* Header with page title and actions */}
        {(pageTitle || headerActions) && (
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <View style={styles.headerLeft}>
              {pageTitle && (
                <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>
                  {pageTitle}
                </Text>
              )}
            </View>
            <View style={styles.headerRight}>{headerActions}</View>
          </View>
        )}

        {/* Action bar directly under page title */}
        {pageActions && (
          <View style={[styles.actionBar, isMobile && styles.actionBarMobile]}>
            {pageActions}
          </View>
        )}

        {/* Content with max width constraint */}
        <ScrollView 
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentInner, isMobile && styles.contentInnerMobile]}>
            {children}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const SIDEBAR_WIDTH = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fafbfc',
    width: '100%',
    minWidth: 0,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingVertical: spacingNum[8],
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.02), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingNum[6],
    paddingBottom: spacingNum[8],
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: spacingNum[6],
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: spacingNum[3],
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: spacingNum[3],
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNum[3],
    paddingHorizontal: spacingNum[4],
    borderRadius: 10,
    marginBottom: spacingNum[2],
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
  },
  navIcon: {
    fontSize: 18,
    marginRight: spacingNum[2],
  },
  navLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  mobileHeader: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingNum[4],
    zIndex: 1001,
  },
  mobileHeaderLogo: {
    width: 28,
    height: 28,
    marginRight: spacingNum[2],
  },
  hamburger: {
    padding: spacingNum[2],
    marginRight: spacingNum[4],
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#111827',
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawerPanel: {
    position: 'absolute',
    top: 60,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#ffffff',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: spacingNum[3],
    paddingVertical: spacingNum[4],
    gap: spacingNum[2],
  },
  drawerFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNum[3],
    paddingHorizontal: spacingNum[4],
    borderRadius: 10,
  },
  drawerFooterIcon: {
    fontSize: 18,
    marginRight: spacingNum[2],
  },
  drawerFooterLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  mainContainer: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    ...Platform.select({
      web: {
        marginLeft: SIDEBAR_WIDTH,
      },
    }),
  },
  mainContainerMobile: {
    marginLeft: 0,
    width: '100%',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: spacingNum[10],
    paddingVertical: spacingNum[8],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        zIndex: 10,
        position: 'relative' as any,
      },
    }),
  },
  headerMobile: {
    paddingHorizontal: spacingNum[4],
    paddingVertical: spacingNum[5],
  },
  headerLeft: {
    flex: 1,
    minWidth: 0, // Allow flex child to shrink below content size
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNum[3],
    flexShrink: 0, // Prevent buttons from shrinking
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap' as any,
      },
    }),
  },
  pageTitleMobile: {
    fontSize: 22,
    flexShrink: 1, // Allow title to shrink on mobile if needed
  },
  actionBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: spacingNum[10],
    paddingVertical: spacingNum[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNum[3],
  },
  actionBarMobile: {
    paddingHorizontal: spacingNum[4],
  },
  contentScroll: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  contentContainer: {
    flexGrow: 1,
  },
  contentInner: {
    maxWidth: 1280,
    width: '100%',
    minWidth: 0,
    alignSelf: 'center',
    paddingHorizontal: Platform.select({
      web: spacingNum[10],
      default: spacingNum[5],
    }),
    paddingVertical: Platform.select({
      web: spacingNum[10],
      default: spacingNum[6],
    }),
  },
  contentInnerMobile: {
    maxWidth: '100%',
    paddingHorizontal: spacingNum[4],
    paddingVertical: spacingNum[5],
  },
});
