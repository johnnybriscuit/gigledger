import { useWindowDimensions, Platform } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  const isMobileWeb = Platform.OS === 'web' && width < 768;
  const isTablet = Platform.OS === 'web' && width >= 768 && width < 1024;
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const isMobile = width < 768; // Generic mobile (includes native apps)
  
  return {
    width,
    height,
    isMobileWeb,
    isTablet,
    isDesktop,
    isMobile,
    breakpoint: width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
  };
}
