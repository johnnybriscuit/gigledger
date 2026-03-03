/**
 * Cross-platform download/share helpers.
 * - Native (iOS/Android): writes to a temp file via expo-file-system, then
 *   opens the system share sheet via expo-sharing.
 * - Web: uses the classic Blob + <a download> approach.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

async function nativeShareText(content: string, filename: string): Promise<void> {
  const path = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { dialogTitle: filename });
}

async function nativeShareBytes(bytes: Uint8Array, filename: string): Promise<void> {
  // Convert Uint8Array → base64 string
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  const path = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(path, { dialogTitle: filename });
}

function webDownloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function webDownloadBytes(bytes: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadTextFile(content: string, filename: string, mimeType = 'text/plain'): Promise<void> {
  if (Platform.OS !== 'web') {
    return nativeShareText(content, filename);
  }
  webDownloadText(content, filename, mimeType);
}

export async function downloadBinaryFile(bytes: Uint8Array, filename: string, mimeType: string): Promise<void> {
  if (Platform.OS !== 'web') {
    return nativeShareBytes(bytes, filename);
  }
  webDownloadBytes(bytes, filename, mimeType);
}

export async function downloadTXF(content: string, filename: string): Promise<void> {
  return downloadTextFile(content, filename, 'text/plain');
}

export async function downloadZip(bytes: Uint8Array, filename: string): Promise<void> {
  return downloadBinaryFile(bytes, filename, 'application/zip');
}

export async function downloadCSV(content: string, filename: string): Promise<void> {
  return downloadTextFile(content, filename, 'text/csv');
}

export async function downloadJSON(content: string, filename: string): Promise<void> {
  return downloadTextFile(content, filename, 'application/json');
}
