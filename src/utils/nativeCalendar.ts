/**
 * Native calendar integration for mobile (React Native)
 * Uses expo-calendar to add events to the device calendar
 */

import { Platform, Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import type { CalendarEventData } from './calendar';

/**
 * Request calendar permissions
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Calendar Permission Required',
        'Bozzy needs access to your calendar to add gig reminders. Please enable calendar access in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
}

/**
 * Get the default calendar for the device
 */
async function getDefaultCalendar(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    // Try to find the default calendar
    const defaultCalendar = calendars.find((cal: any) => cal.allowsModifications && cal.isPrimary);
    if (defaultCalendar) {
      return defaultCalendar.id;
    }
    
    // Fallback to first modifiable calendar
    const modifiableCalendar = calendars.find((cal: any) => cal.allowsModifications);
    if (modifiableCalendar) {
      return modifiableCalendar.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting default calendar:', error);
    return null;
  }
}

/**
 * Parse date and time into a Date object
 */
function parseDateTime(date: string, time?: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time ? time.split(':').map(Number) : [19, 0]; // Default to 7pm
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Add a gig to the native device calendar
 * @returns The calendar event ID if successful, null otherwise
 */
export async function addGigToCalendar(event: CalendarEventData): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.warn('addGigToCalendar is only supported on mobile');
    return null;
  }

  try {
    // Request permissions
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get default calendar
    const calendarId = await getDefaultCalendar();
    if (!calendarId) {
      Alert.alert('Error', 'No calendar available to add the event.');
      return null;
    }

    // Parse dates
    const startDate = parseDateTime(event.date, event.startTime);
    const endDate = event.endTime 
      ? parseDateTime(event.date, event.endTime)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    // Build notes/description
    const notesParts: string[] = [];
    if (event.payerName) {
      notesParts.push(`Payer: ${event.payerName}`);
    }
    if (event.payAmount !== undefined) {
      notesParts.push(`Pay: $${event.payAmount.toFixed(2)}`);
    }
    if (event.notes) {
      notesParts.push(`Notes: ${event.notes}`);
    }
    if (event.description) {
      notesParts.push(event.description);
    }

    // Create the event
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate,
      endDate,
      location: event.location || '',
      notes: notesParts.join('\n'),
      alarms: [
        { relativeOffset: -120 }, // 2 hours before
        { relativeOffset: -1440 }, // 1 day before
      ],
    });

    return eventId;
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    Alert.alert('Error', 'Failed to add event to calendar. Please try again.');
    return null;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  calendarEventId: string,
  event: CalendarEventData
): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.warn('updateCalendarEvent is only supported on mobile');
    return false;
  }

  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      return false;
    }

    const startDate = parseDateTime(event.date, event.startTime);
    const endDate = event.endTime 
      ? parseDateTime(event.date, event.endTime)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const notesParts: string[] = [];
    if (event.payerName) {
      notesParts.push(`Payer: ${event.payerName}`);
    }
    if (event.payAmount !== undefined) {
      notesParts.push(`Pay: $${event.payAmount.toFixed(2)}`);
    }
    if (event.notes) {
      notesParts.push(`Notes: ${event.notes}`);
    }
    if (event.description) {
      notesParts.push(event.description);
    }

    await Calendar.updateEventAsync(calendarEventId, {
      title: event.title,
      startDate,
      endDate,
      location: event.location || '',
      notes: notesParts.join('\n'),
    });

    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(calendarEventId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.warn('deleteCalendarEvent is only supported on mobile');
    return false;
  }

  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      return false;
    }

    await Calendar.deleteEventAsync(calendarEventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}
