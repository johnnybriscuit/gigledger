import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const parts = [title, message].filter(Boolean);
    window.alert(parts.join('\n\n'));
    return;
  }

  Alert.alert(title, message);
}

export function confirmDialog(title: string, message?: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const parts = [title, message].filter(Boolean);
    return Promise.resolve(window.confirm(parts.join('\n\n')));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
}
