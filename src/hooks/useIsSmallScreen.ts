import { useWindowDimensions } from 'react-native';

export function useIsSmallScreen(): boolean {
  const { width } = useWindowDimensions();
  return width < 380;
}
