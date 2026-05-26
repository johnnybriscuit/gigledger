import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Schedules a push notification ~2 hours after a gig is marked paid,
 * reminding the user to move the non-spendable allocation to savings.
 * Does nothing if notifications are not permitted or on web.
 * Never throws — notification failure must not affect the core paid-toggle flow.
 */
export async function scheduleTransferReminder(
  gigTitle: string,
  transferAmount: number
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Don't forget your transfer",
        body: `Move $${transferAmount.toFixed(2)} to savings from your ${gigTitle} gig.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 7200,
        repeats: false,
      },
    });
  } catch (error) {
    console.error('[scheduleTransferReminder] Error:', error);
  }
}
