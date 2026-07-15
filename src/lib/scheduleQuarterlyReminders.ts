import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const NOTIFICATION_TITLE = 'Quarterly tax payment coming up';

export interface QuarterDeadline {
  quarter: number;
  date: Date;
}

export function getQuarterlyDeadlines(year: number): QuarterDeadline[] {
  return [
    { quarter: 1, date: new Date(year, 3, 15) },   // Apr 15
    { quarter: 2, date: new Date(year, 5, 15) },   // Jun 15
    { quarter: 3, date: new Date(year, 8, 15) },   // Sep 15
    { quarter: 4, date: new Date(year + 1, 0, 15) }, // Jan 15 next year
  ];
}

/**
 * Schedules push notifications 30 days before each remaining quarterly
 * tax deadline for the current year. Safe to call on app launch —
 * skips deadlines where a matching notification is already scheduled.
 * Never throws — all errors are silent and non-blocking.
 */
export async function scheduleQuarterlyReminders(
  estimatedQuarterlyAmount: number
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const now = new Date();
    const year = now.getFullYear();
    const deadlines = getQuarterlyDeadlines(year);

    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledTitles = existing.map(n => n.content.title);

    for (const { quarter, date } of deadlines) {
      const triggerDate = new Date(date);
      triggerDate.setDate(triggerDate.getDate() - 30);

      if (triggerDate <= now) continue;

      if (scheduledTitles.includes(NOTIFICATION_TITLE)) continue;

      const amount = Math.round(estimatedQuarterlyAmount);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: NOTIFICATION_TITLE,
          body: `Your Q${quarter} estimated tax payment of ~$${amount} is due in 30 days. Check your tax bucket in Bozzy.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  } catch {
    // Non-blocking — notification failure must never affect the UI
  }
}
