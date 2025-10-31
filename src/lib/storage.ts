import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const RECEIPTS_BUCKET = 'receipts';

export interface UploadReceiptParams {
  userId: string;
  file: {
    uri: string;
    name: string;
    type: string;
  };
}

export async function uploadReceipt({ userId, file }: UploadReceiptParams): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  let fileData: ArrayBuffer | Blob;

  if (Platform.OS === 'web') {
    // Web: fetch the blob
    const response = await fetch(file.uri);
    fileData = await response.blob();
  } else {
    // Mobile: read file as base64 and convert to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    fileData = bytes.buffer;
  }

  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(fileName, fileData, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data.path;
}

export async function getReceiptSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function deleteReceipt(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
