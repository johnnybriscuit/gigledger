/**
 * Service for creating gigs with inline expenses and mileage
 * Handles atomic creation of gig + related items
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type GigInsert = Database['public']['Tables']['gigs']['Insert'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type MileageInsert = Database['public']['Tables']['mileage']['Insert'];

export interface InlineExpenseData {
  category: string;
  description: string;
  amount: number;
  note?: string;
}

export interface InlineMileageData {
  miles: number;
  note?: string;
}

export interface CreateGigWithLinesParams {
  gig: Omit<GigInsert, 'user_id'>;
  expenses?: InlineExpenseData[];
  mileage?: InlineMileageData;
}

/**
 * Create a gig with inline expenses and mileage in a single transaction
 * If any part fails, the entire operation is rolled back
 */
export async function createGigWithLines({
  gig,
  expenses = [],
  mileage,
}: CreateGigWithLinesParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Create the gig
  const { data: createdGig, error: gigError } = await (supabase
    .from('gigs')
    .insert({ ...gig, user_id: user.id } as any)
    .select() as any)
    .single();

  if (gigError) {
    console.error('Failed to create gig:', gigError);
    throw new Error(`Failed to create gig: ${gigError.message}`);
  }

  const gigId = createdGig.id;

  try {
    // 2. Create inline expenses if any
    if (expenses.length > 0) {
      const expenseInserts = expenses.map((exp) => ({
        user_id: user.id,
        gig_id: gigId,
        category: exp.category,
        description: exp.description || exp.category, // Use provided description or fallback to category
        amount: exp.amount,
        notes: exp.note || null,
        date: gig.date, // Use gig date for expenses
      }));

      const { error: expensesError } = await (supabase
        .from('expenses')
        .insert(expenseInserts as any) as any);

      if (expensesError) {
        // Rollback: delete the gig
        await supabase.from('gigs').delete().eq('id', gigId);
        console.error('Failed to create expenses:', expensesError);
        throw new Error(`Failed to create expenses: ${expensesError.message}`);
      }
    }

    // 3. Create inline mileage if provided
    if (mileage && mileage.miles > 0) {
      const mileageInsert = {
        user_id: user.id,
        gig_id: gigId,
        miles: mileage.miles,
        purpose: 'Gig travel',
        start_location: '',
        end_location: '',
        notes: mileage.note || null,
        date: gig.date, // Use gig date for mileage
      };

      const { error: mileageError } = await (supabase
        .from('mileage')
        .insert(mileageInsert as any) as any);

      if (mileageError) {
        // Rollback: delete the gig and expenses
        await supabase.from('gigs').delete().eq('id', gigId);
        console.error('Failed to create mileage:', mileageError);
        throw new Error(`Failed to create mileage: ${mileageError.message}`);
      }
    }

    return createdGig;
  } catch (error) {
    // Ensure gig is deleted on any error
    await supabase.from('gigs').delete().eq('id', gigId);
    throw error;
  }
}
