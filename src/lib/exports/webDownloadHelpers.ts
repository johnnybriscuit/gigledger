/**
 * Web-only download helpers (browser Blob + <a download>)
 * Separated from core export logic for potential Expo reuse
 */

export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('downloadTextFile is only available in browser environments');
  }

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

export function downloadBinaryFile(bytes: Uint8Array, filename: string, mimeType: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('downloadBinaryFile is only available in browser environments');
  }

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

export function downloadTXF(content: string, filename: string) {
  downloadTextFile(content, filename, 'text/plain');
}

export function downloadZip(bytes: Uint8Array, filename: string) {
  downloadBinaryFile(bytes, filename, 'application/zip');
}

export function downloadCSV(content: string, filename: string) {
  downloadTextFile(content, filename, 'text/csv');
}

export function downloadJSON(content: string, filename: string) {
  downloadTextFile(content, filename, 'application/json');
}
