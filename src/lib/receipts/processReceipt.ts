import { supabase } from '../supabase';

export interface ProcessReceiptResponse {
  success: boolean;
  error?: string;
  message?: string;
  extracted?: {
    vendor?: string;
    date?: string;
    total?: number;
    currency?: string;
    rawText?: string;
  };
  suggestion?: {
    category: string;
    confidence: number;
  };
  duplicate_suspected?: boolean;
  provider?: string;
  sha256?: string;
  receipt_storage_path?: string;
  receipt_mime?: string;
}

// Mode 1: Process receipt for existing expense (expenseId mode)
export async function processReceipt(expenseId: string): Promise<ProcessReceiptResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('process-receipt', {
      body: { expenseId }
    });

    if (error) {
      throw error;
    }

    return data as ProcessReceiptResponse;
  } catch (error: any) {
    console.error('Receipt processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process receipt',
      message: 'Unable to scan receipt. You can continue entering expense details manually.'
    };
  }
}

// Mode 2: Process receipt before expense creation (receipt_storage_path mode)
export async function processReceiptBeforeCreation(
  receipt_storage_path: string,
  mimeType?: string
): Promise<ProcessReceiptResponse> {
  try {
    console.log('[Receipt] Calling edge function with:', { receipt_storage_path, mimeType });
    
    const { data, error } = await supabase.functions.invoke('process-receipt', {
      body: { receipt_storage_path, mimeType }
    });

    console.log('[Receipt] Edge function response:', { data, error });

    if (error) {
      console.error('[Receipt] Edge function error:', error);
      throw error;
    }

    // Check if the response indicates an error
    if (data && !data.success && data.error) {
      console.error('[Receipt] Scan failed:', data.error, data.message);
      return data as ProcessReceiptResponse;
    }

    return data as ProcessReceiptResponse;
  } catch (error: any) {
    console.error('[Receipt] Processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process receipt',
      message: 'Unable to scan receipt. You can continue entering expense details manually.'
    };
  }
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.75) return '#10b981'; // green
  if (confidence >= 0.5) return '#f59e0b'; // amber
  return '#6b7280'; // gray
}
