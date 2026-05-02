/**
 * Calendar integration utilities
 * Generates .ics files for web and handles native calendar integration for mobile
 */

import { Platform } from 'react-native';

export interface CalendarEventData {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format (24-hour)
  endTime?: string; // HH:MM format (24-hour)
  location?: string;
  description?: string;
  payerName?: string;
  payAmount?: number;
  notes?: string;
}

/**
 * Format a date and time into ISO 8601 format for .ics files
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM format (24-hour), optional
 * @returns ISO 8601 formatted string (YYYYMMDDTHHMMSS)
 */
function formatICSDateTime(date: string, time?: string): string {
  const [year, month, day] = date.split('-');
  const [hours, minutes] = time ? time.split(':') : ['19', '00']; // Default to 7pm if no time
  return `${year}${month}${day}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
}

/**
 * Calculate end time (2 hours after start if not provided)
 */
function getEndTime(date: string, startTime?: string, endTime?: string): string {
  if (endTime) {
    return formatICSDateTime(date, endTime);
  }
  
  const [hours, minutes] = startTime ? startTime.split(':').map(Number) : [19, 0];
  const endHours = (hours + 2) % 24;
  const endTimeStr = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return formatICSDateTime(date, endTimeStr);
}

/**
 * Generate .ics file content for a gig
 */
export function generateICSFile(event: CalendarEventData): string {
  const startDateTime = formatICSDateTime(event.date, event.startTime);
  const endDateTime = getEndTime(event.date, event.startTime, event.endTime);
  
  // Build description
  const descriptionParts: string[] = [];
  if (event.payerName) {
    descriptionParts.push(`Payer: ${event.payerName}`);
  }
  if (event.payAmount !== undefined) {
    descriptionParts.push(`Pay: $${event.payAmount.toFixed(2)}`);
  }
  if (event.notes) {
    descriptionParts.push(`Notes: ${event.notes}`);
  }
  if (event.description) {
    descriptionParts.push(event.description);
  }
  
  const description = descriptionParts.join('\\n').replace(/\n/g, '\\n');
  const location = event.location || '';
  
  // Generate unique UID based on gig ID
  const uid = `gig-${event.id}@bozzygigs.com`;
  
  // Create .ics content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bozzy//Gig Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDateTime(new Date().toISOString().split('T')[0])}`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${event.title}`,
    location ? `LOCATION:${location}` : '',
    description ? `DESCRIPTION:${description}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Gig in 2 hours',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Gig tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(line => line).join('\r\n');
  
  return icsContent;
}

/**
 * Download .ics file (web only)
 */
export function downloadICSFile(icsContent: string, filename: string): void {
  if (Platform.OS !== 'web') {
    console.warn('downloadICSFile is only supported on web');
    return;
  }
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a safe filename for the .ics file
 */
export function generateICSFilename(title: string, date: string): string {
  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${safeTitle}_${date}.ics`;
}
