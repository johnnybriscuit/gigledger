import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, Text, Animated, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacingNum } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import {
  House,
  CalendarCheck,
  Receipt,
  FileText,
  Users,
  NavigationArrow,
  DownloadSimple,
  GearSix,
  CreditCard,
  SignOut as SignOutIcon,
} from 'phosphor-react-native';

type Route = 'dashboard' | 'payers' | 'gigs' | 'expenses' | 'mileage' | 'invoices' | 'exports' | 'subscription' | 'account';

interface NavItem {
  id: Route;
  label: string;
  IconComponent: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', IconComponent: House, iconColor: '#2D5BE3', iconBg: '#EEF2FF' },
  { id: 'payers', label: 'Contacts', IconComponent: Users, iconColor: '#D97706', iconBg: '#FFFBEB' },
  { id: 'gigs', label: 'Gigs', IconComponent: CalendarCheck, iconColor: '#7C3AED', iconBg: '#F3F0FF' },
  { id: 'expenses', label: 'Expenses', IconComponent: Receipt, iconColor: '#E11D48', iconBg: '#FFF1F2' },
  { id: 'mileage', label: 'Mileage', IconComponent: NavigationArrow, iconColor: '#0D9488', iconBg: '#F0FDFA' },
  { id: 'invoices', label: 'Invoices', IconComponent: FileText, iconColor: '#059669', iconBg: '#ECFDF5' },
  { id: 'exports', label: 'Exports', IconComponent: DownloadSimple, iconColor: '#475569', iconBg: '#F8FAFC' },
  { id: 'subscription', label: 'Subscription', IconComponent: CreditCard, iconColor: '#CA8A04', iconBg: '#FEFCE8' },
  { id: 'account', label: 'Account Settings', IconComponent: GearSix, iconColor: '#78716C', iconBg: '#F5F5F4' },
];

interface AppShellProps {
  activeRoute: Route;
  onNavigate: (route: Route) => void;
  children: React.ReactNode;
  pageTitle?: string;
  pageActions?: React.ReactNode;
  headerActions?: React.ReactNode;
  headerRight?: React.ReactNode;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  disableScroll?: boolean;
}

export function AppShell({
  activeRoute,
  onNavigate,
  children,
  pageTitle,
  pageActions,
  headerActions,
  headerRight,
  userName,
  userEmail,
  onSignOut,
  disableScroll = false,
}: AppShellProps) {
  const { width } = useResponsive();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const isDesktopWeb = isWeb && width >= 768;
  const isMobileWeb = isWeb && width < 768;
  const isMobile = width < 768; // Generic mobile (includes native apps)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Animated hamburger → ✕
  const line1Rot = useRef(new Animated.Value(0)).current;
  const line1Y = useRef(new Animated.Value(0)).current;
  const line2Opacity = useRef(new Animated.Value(1)).current;
  const line2Scale = useRef(new Animated.Value(1)).current;
  const line3Rot = useRef(new Animated.Value(0)).current;
  const line3Y = useRef(new Animated.Value(0)).current;
  // Drawer slide
  const drawerTranslate = useRef(new Animated.Value(-280)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setMobileMenuOpen(true);
    Animated.parallel([
      Animated.timing(line1Y, { toValue: 7, duration: 250, useNativeDriver: true }),
      Animated.timing(line1Rot, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(line2Opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(line2Scale, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(line3Y, { toValue: -7, duration: 250, useNativeDriver: true }),
      Animated.timing(line3Rot, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(drawerTranslate, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(line1Y, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(line1Rot, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(line2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(line2Scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(line3Y, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(line3Rot, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(drawerTranslate, { toValue: -280, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setMobileMenuOpen(false));
  };

  const toggleDrawer = () => {
    if (mobileMenuOpen) closeDrawer(); else openDrawer();
  };

  const DRAWER_SECTIONS = [
    {
      label: 'MAIN',
      items: [
        { id: 'dashboard' as Route, label: 'Home', IconComponent: House, iconColor: '#2D5BE3', iconBg: '#EEF2FF' },
        { id: 'gigs' as Route, label: 'Gigs', IconComponent: CalendarCheck, iconColor: '#7C3AED', iconBg: '#F3F0FF' },
        { id: 'expenses' as Route, label: 'Expenses', IconComponent: Receipt, iconColor: '#E11D48', iconBg: '#FFF1F2' },
        { id: 'invoices' as Route, label: 'Invoices', IconComponent: FileText, iconColor: '#059669', iconBg: '#ECFDF5' },
      ],
    },
    {
      label: 'TOOLS',
      items: [
        { id: 'payers' as Route, label: 'Contacts', IconComponent: Users, iconColor: '#D97706', iconBg: '#FFFBEB' },
        { id: 'mileage' as Route, label: 'Mileage', IconComponent: NavigationArrow, iconColor: '#0D9488', iconBg: '#F0FDFA' },
        { id: 'exports' as Route, label: 'Exports', IconComponent: DownloadSimple, iconColor: '#475569', iconBg: '#F8FAFC' },
      ],
    },
    {
      label: 'ACCOUNT',
      items: [
        { id: 'account' as Route, label: 'Account Settings', IconComponent: GearSix, iconColor: '#78716C', iconBg: '#F5F5F4' },
        { id: 'subscription' as Route, label: 'Subscription', IconComponent: CreditCard, iconColor: '#CA8A04', iconBg: '#FEFCE8' },
      ],
    },
  ];

  /*
   * STRUCTURAL LAYOUT RULES (NO STYLE HACKS):
   * 
   * Desktop web (isDesktopWeb):
   *   - Render sidebar as in-flow sibling (first child in flex row)
   *   - Main content has marginLeft: SIDEBAR_WIDTH
   *   - Sidebar always visible
   * 
   * Mobile web (isMobileWeb):
   *   - Single column layout: header + content
   *   - Sidebar NOT rendered in DOM when hamburger closed
   *   - When hamburger open: sidebar renders as absolute/fixed overlay
   *   - Main content: width 100%, marginLeft 0, no sidebar spacing
   * 
   * Native (isNative):
   *   - Hamburger drawer replaces bottom tab bar
   *   - Drawer slides in from left with animated backdrop
   * 
   * NO CSS @media queries in StyleSheet.create()
   * Use explicit Platform.OS and width checks only
   */
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  // Runtime assertion: mobile web with closed hamburger should have NO sidebar in DOM
  useEffect(() => {
    if (__DEV__ && isMobileWeb && !mobileMenuOpen) {
      console.log('✅ Mobile Web Layout (Hamburger CLOSED):', {
        width,
        isMobileWeb,
        mobileMenuOpen,
        sidebarInDOM: false,
        expectedMarginLeft: 0,
      });
    }
    
    if (__DEV__ && isMobileWeb && mobileMenuOpen) {
      console.log('📱 Mobile Web Layout (Hamburger OPEN):', {
        width,
        mobileMenuOpen,
        sidebarRenderedAsOverlay: true,
      });
    }
  }, [isMobileWeb, width, mobileMenuOpen]);

  const renderSidebar = () => {
    const sidebarContent = (
      <View style={styles.sidebar}>
        {/* Logo */}
        <TouchableOpacity 
          style={styles.logoContainer}
          onPress={() => onNavigate('dashboard')}
        >
          <Image 
            source={require('../../../assets/logo-mark-64.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>Bozzy</Text>
        </TouchableOpacity>

        {/* Navigation */}
        <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
          {NAV_ITEMS.map((item) => {
            const navContent = (
              <TouchableOpacity
                style={[
                  styles.navItem,
                  activeRoute === item.id && styles.navItemActive,
                ]}
                onPress={() => {
                  onNavigate(item.id);
                  if (isMobile) setMobileMenuOpen(false);
                }}
              >
                <View style={[styles.navIconWrap, { backgroundColor: item.iconBg }]}>
                  <item.IconComponent size={18} weight="duotone" color={item.iconColor} />
                </View>
                <Text
                  style={[
                    styles.navLabel,
                    activeRoute === item.id && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );

            return (
              <View
                key={item.id}
                {...(Platform.OS === 'web' ? ({
                  'data-nav-id': item.id,
                  className: `nav-item nav-${item.id}`,
                } as any) : {})}
              >
                {navContent}
              </View>
            );
          })}
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

    return sidebarContent;
  };

  return (
    <View 
      style={[
        styles.container,
        (isMobileWeb || isNative) && styles.containerMobile,
      ]}
      onLayout={(e) => {
        if (__DEV__ && isMobileWeb) {
          console.log('📐 [AppShell] Root container width:', e.nativeEvent.layout.width);
          console.log('📐 [AppShell] flexDirection:', isMobileWeb ? 'column' : 'row');
        }
      }}
    >
      {/* DESKTOP WEB: Render sidebar as in-flow sibling */}
      {isDesktopWeb && renderSidebar()}

      {/* MOBILE WEB: Top header + conditional overlay drawer */}
      {isMobileWeb && (
        <>
          <View style={styles.mobileHeader}>
            <TouchableOpacity
              style={styles.hamburger}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
            <Image 
              source={require('../../../assets/logo-mark-64.png')}
              style={styles.mobileHeaderLogo}
              resizeMode="contain"
            />
            <Text style={styles.mobileTitle}>Bozzy</Text>
          </View>
          
          {/* Only render sidebar when hamburger is OPEN - as overlay, not in-flow */}
          {mobileMenuOpen && (
            <>
              {/* Backdrop overlay */}
              <TouchableOpacity
                style={styles.drawerBackdrop}
                activeOpacity={1}
                onPress={() => setMobileMenuOpen(false)}
              />
              {/* Drawer panel - absolute positioned overlay */}
              <View style={styles.drawerPanel}>
                {renderSidebar()}
              </View>
            </>
          )}
        </>
      )}

      {/* NATIVE: Top header bar with hamburger */}
      {isNative && (
        <View style={[styles.nativeHeader, { paddingTop: insets.top + 4 }]}>
          {/* Left: hamburger + title */}
          <View style={styles.nativeHeaderLeft}>
            <TouchableOpacity
              style={styles.nativeHamburger}
              onPress={toggleDrawer}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View
                style={[
                  styles.hamburgerLine,
                  {
                    transform: [
                      { translateY: line1Y },
                      {
                        rotate: line1Rot.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '45deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.hamburgerLine,
                  { opacity: line2Opacity, transform: [{ scaleX: line2Scale }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.hamburgerLine,
                  {
                    transform: [
                      { translateY: line3Y },
                      {
                        rotate: line3Rot.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '-45deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </TouchableOpacity>
            <Text style={styles.nativeHeaderTitle}>{pageTitle || 'Bozzy'}</Text>
          </View>
          {/* Right: headerRight slot (e.g. period pill) */}
          {headerRight && (
            <View style={styles.nativeHeaderRight}>{headerRight}</View>
          )}
        </View>
      )}

      {/* NATIVE: Drawer (Modal for proper overlay + animation) */}
      {isNative && mobileMenuOpen && (
        <Modal
          visible={mobileMenuOpen}
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
          statusBarTranslucent
        >
          {/* Backdrop */}
          <Animated.View
            style={[styles.drawerBackdropNative, { opacity: backdropOpacity }]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={closeDrawer}
            />
          </Animated.View>

          {/* Drawer panel */}
          <Animated.View
            style={[
              styles.drawerPanelNative,
              { paddingTop: insets.top, transform: [{ translateX: drawerTranslate }] },
            ]}
          >
            {/* Drawer header */}
            <View style={styles.drawerHeaderNative}>
              <Text style={styles.drawerAppName}>Bozzy</Text>
              {userEmail ? (
                <Text style={styles.drawerUserEmail}>{userEmail}</Text>
              ) : userName ? (
                <Text style={styles.drawerUserEmail}>{userName}</Text>
              ) : null}
            </View>

            {/* Sections */}
            <ScrollView style={styles.drawerScrollNative} showsVerticalScrollIndicator={false}>
              {DRAWER_SECTIONS.map((section) => (
                <View key={section.label}>
                  <Text style={styles.drawerSectionLabel}>{section.label}</Text>
                  {section.items.map((item) => {
                    const isActive = activeRoute === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.drawerItemNative,
                          isActive && styles.drawerItemActive,
                        ]}
                        onPress={() => {
                          closeDrawer();
                          setTimeout(() => onNavigate(item.id), 50);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.drawerItemIcon,
                          { backgroundColor: isActive ? '#FFFFFF' : item.iconBg },
                        ]}>
                          <item.IconComponent size={22} weight="duotone" color={item.iconColor} />
                        </View>
                        <Text style={[
                          styles.drawerItemLabel,
                          isActive && styles.drawerItemLabelActive,
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Footer: Sign Out */}
            <View style={[styles.drawerFooterNative, { paddingBottom: Math.max(insets.bottom + 16, 40) }]}>
              {onSignOut && (
                <TouchableOpacity
                  style={styles.drawerSignOutRow}
                  onPress={() => {
                    closeDrawer();
                    setTimeout(() => onSignOut(), 300);
                  }}
                  activeOpacity={0.7}
                >
                  <SignOutIcon size={15} weight="regular" color="#B0ADA8" />
                  <Text style={styles.drawerSignOut}>Sign Out</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Main content area */}
      <View 
        style={[
          styles.mainContainer,
          // Desktop web: apply sidebar margin (sidebar is in-flow sibling)
          isDesktopWeb && styles.mainContainerDesktop,
          // Mobile web: NO sidebar margin (sidebar is overlay when open, not in DOM when closed)
          isMobileWeb && styles.mainContainerMobile,
          // Native: leave room for bottom tab bar
          isNative && styles.mainContainerNative,
        ]}
        onLayout={(e) => {
          if (__DEV__ && isMobileWeb) {
            console.log('📐 [AppShell] Main container width:', e.nativeEvent.layout.width);
          }
        }}
      >
        {/* Header with page title and actions */}
        {/* On mobile the title is already in the native header bar — only show it on desktop web */}
        {((!isMobile && pageTitle) || headerActions) && (
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <View style={styles.headerLeft}>
              {!isMobile && pageTitle && (
                <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>
                  {pageTitle}
                </Text>
              )}
            </View>
            <View style={styles.headerRight}>{headerActions}</View>
          </View>
        )}

        {/* Action bar directly under page title - hide on native (shown in header area) */}
        {pageActions && !isNative && (
          <View style={[styles.actionBar, isMobile && styles.actionBarMobile]}>
            {pageActions}
          </View>
        )}
        {/* Native: action bar below header */}
        {pageActions && isNative && (
          <View style={styles.nativeActionBar}>
            {pageActions}
          </View>
        )}

        {/* Content with max width constraint */}
        {disableScroll ? (
          <View
            style={[styles.contentScroll, styles.contentInner, isMobile && styles.contentInnerMobile]}
          >
            {children}
          </View>
        ) : (
          <ScrollView 
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            onLayout={(e) => {
              if (__DEV__ && isMobileWeb) {
                console.log('📐 [AppShell] ScrollView width:', e.nativeEvent.layout.width);
              }
            }}
          >
            <View 
              style={[styles.contentInner, isMobile && styles.contentInnerMobile]}
              onLayout={(e) => {
                if (__DEV__ && isMobileWeb) {
                  console.log('📐 [AppShell] Content inner width:', e.nativeEvent.layout.width);
                }
              }}
            >
              {children}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom tab bar removed — navigation via drawer on native */}
    </View>
  );
}

const SIDEBAR_WIDTH = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', // Desktop: row for sidebar + content
    backgroundColor: '#fafbfc',
    width: '100%',
    minWidth: 0,
  },
  containerMobile: {
    flexDirection: 'column', // Mobile: column for header + content
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
    width: 24,
    height: 24,
    marginRight: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    lineHeight: 24,
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
  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNum[2],
    flexShrink: 0,
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
  },
  mainContainerDesktop: {
    ...Platform.select({
      web: {
        marginLeft: SIDEBAR_WIDTH,
      },
    }),
  },
  mainContainerMobile: {
    marginLeft: 0,
    marginRight: 0,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  mainContainerNative: {
    marginLeft: 0,
    marginBottom: 0,
  },
  nativeHeader: {
    backgroundColor: '#F5F4F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    minHeight: 56,
  },
  nativeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  nativeHeaderRight: {
    flexShrink: 0,
  },
  nativeHamburger: {
    width: 30,
    height: 24,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 5,
  },
  hamburgerLine: {
    width: 22,
    height: 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
  },
  nativeHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  // Native drawer styles
  drawerBackdropNative: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 90,
  },
  drawerPanelNative: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    flexDirection: 'column',
  },
  drawerHeaderNative: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E3DE',
  },
  drawerAppName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  drawerUserEmail: {
    fontSize: 13,
    color: '#B0ADA8',
    marginTop: 4,
  },
  drawerScrollNative: {
    flex: 1,
  },
  drawerSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B0ADA8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 6,
  },
  drawerItemNative: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  drawerItemActive: {
    backgroundColor: '#EEF2FF',
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F4F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  drawerItemIconActive: {
    backgroundColor: '#FFFFFF',
  },
  drawerItemIconText: {
    fontSize: 18,
  },
  drawerItemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  drawerItemLabelActive: {
    fontWeight: '700',
    color: '#2D5BE3',
  },
  drawerFooterNative: {
    borderTopWidth: 1,
    borderTopColor: '#E5E3DE',
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  drawerSignOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerSignOut: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B0ADA8',
  },
  nativeActionBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNum[3],
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
    flexShrink: 1,
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap' as any,
      },
    }),
  },
  pageTitleMobile: {
    fontSize: 22,
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
    alignSelf: 'stretch',
    paddingHorizontal: spacingNum[4],
    paddingVertical: spacingNum[5],
  },
});
