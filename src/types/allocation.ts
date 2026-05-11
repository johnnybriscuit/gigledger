export type BucketType = 
  | 'federal_tax' 
  | 'state_tax' 
  | 'retirement' 
  | 'emergency_fund' 
  | 'debt' 
  | 'goal' 
  | 'spendable';

export interface AllocationBucket {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  bucket_type: BucketType;
  percentage: number;
  color: string;
  goal_amount: number | null;
  goal_name: string | null;
  goal_date: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AllocationTransaction {
  id: string;
  user_id: string;
  gig_id: string | null;
  bucket_id: string;
  gross_amount: number;
  allocated_amount: number;
  percentage_used: number;
  transaction_date: string;
  created_at: string;
}

export interface FinancialTipDismissed {
  id: string;
  user_id: string;
  tip_key: string;
  dismissed_at: string;
}

export interface RateBenchmark {
  id: string;
  gig_type: string;
  market_tier: 'major' | 'mid' | 'small';
  rate_low: number;
  rate_high: number;
  rate_unit: 'hour' | 'day' | 'gig' | 'song' | 'month';
  notes: string | null;
  last_updated: string;
}

export interface AllocationResult {
  bucket: AllocationBucket;
  allocatedAmount: number;
  percentage: number;
}

export interface BucketValidation {
  valid: boolean;
  total: number;
  difference: number;
}

export interface BucketYTDTotal {
  bucket_id: string;
  total: number;
}
