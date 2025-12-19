import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, Text } from 'react-native';
import { colors, spacingNum } from '../../styles/theme';

type Route = 'dashboard' | 'payers' | 'gigs' | 'expenses' | 'mileage' | 'exports' | 'subscription' | 'account';

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
  { id: 'exports', label: 'Exports', icon: '📤' },
  { id: 'subscription', label: 'Subscription', icon: '⭐' },
  { id: 'account', label: 'Account', icon: '⚙️' },
];

interface AppShellProps {
  activeRoute: Route;
  onNavigate: (route: Route) => void;
  children: React.ReactNode;
  pageTitle?: string;
  headerActions?: React.ReactNode;
  userName?: string;
  onSignOut?: () => void;
}

export function AppShell({
  activeRoute,
  onNavigate,
  children,
  pageTitle,
  headerActions,
  userName,
  onSignOut,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isWeb = Platform.OS === 'web';

  const renderSidebar = () => (
    <View style={[styles.sidebar, !isWeb && mobileMenuOpen && styles.sidebarMobile]}>
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
              if (!isWeb) setMobileMenuOpen(false);
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

      {/* User info at bottom */}
      {userName && (
        <View style={styles.userSection}>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
          {onSignOut && (
            <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Desktop: Always show sidebar */}
      {isWeb && renderSidebar()}

      {/* Mobile: Hamburger menu */}
      {!isWeb && (
        <>
          <View style={styles.mobileHeader}>
            <TouchableOpacity
              style={styles.hamburger}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.mobileTitle}>GigLedger</Text>
          </View>
          {mobileMenuOpen && (
            <View style={styles.mobileMenuOverlay}>
              {renderSidebar()}
            </View>
          )}
        </>
      )}

      {/* Main content area */}
      <View style={styles.mainContainer}>
        {/* Header with page title and actions */}
        {(pageTitle || headerActions) && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {pageTitle && <Text style={styles.pageTitle}>{pageTitle}</Text>}
            </View>
            <View style={styles.headerRight}>{headerActions}</View>
          </View>
        )}

        {/* Content with max width constraint */}
        <ScrollView 
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentInner}>
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
    backgroundColor: '#f9fafb',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingVertical: spacingNum[6],
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      },
    }),
  },
  sidebarMobile: {
    position: 'absolute',
    left: 0,
    top: 60,
    bottom: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingNum[6],
    paddingBottom: spacingNum[6],
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: spacingNum[4],
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: spacingNum[2],
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: spacingNum[2],
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNum[2],
    paddingHorizontal: spacingNum[4],
    borderRadius: 8,
    marginBottom: spacingNum[1],
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
  userSection: {
    paddingHorizontal: spacingNum[6],
    paddingTop: spacingNum[4],
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: spacingNum[4],
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacingNum[2],
  },
  signOutButton: {
    paddingVertical: spacingNum[1],
  },
  signOutText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  mobileHeader: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingNum[4],
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
  mobileMenuOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  mainContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        marginLeft: SIDEBAR_WIDTH,
      },
    }),
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: spacingNum[8],
    paddingVertical: spacingNum[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNum[4],
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  contentInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.select({
      web: spacingNum[8],
      default: spacingNum[4],
    }),
    paddingVertical: spacingNum[8],
  },
});
