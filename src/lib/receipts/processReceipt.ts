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
  };
  suggestion?: {
    category: string;
    confidence: number;
  };
  duplicate_suspected?: boolean;
  provider?: string;
}

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
