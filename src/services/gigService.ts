/**
 * Service for creating gigs with inline expenses and mileage
 * Handles atomic creation of gig + related items
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { FREE_GIG_LIMIT } from '../config/plans';

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

export interface UpdateGigWithLinesParams {
  gigId: string;
  gig: Partial<Omit<GigInsert, 'user_id'>>;
  expenses?: InlineExpenseData[];
  mileage?: InlineMileageData;
}

/**
 * Update a gig and its inline expenses/mileage
 * Replaces all existing gig-related expenses and mileage with the new ones
 */
export async function updateGigWithLines({
  gigId,
  gig,
  expenses = [],
  mileage,
}: UpdateGigWithLinesParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Update the gig
  const { error: gigError } = await supabase
    .from('gigs')
    .update(gig as any)
    .eq('id', gigId)
    .eq('user_id', user.id);

  if (gigError) {
    console.error('Failed to update gig:', gigError);
    throw new Error(`Failed to update gig: ${gigError.message}`);
  }

  // 2. Delete existing gig-related expenses
  const { error: deleteExpensesError } = await supabase
    .from('expenses')
    .delete()
    .eq('gig_id', gigId)
    .eq('user_id', user.id);

  if (deleteExpensesError) {
    console.error('Failed to delete old expenses:', deleteExpensesError);
    throw new Error(`Failed to delete old expenses: ${deleteExpensesError.message}`);
  }

  // 3. Create new inline expenses if any
  if (expenses.length > 0) {
    const expenseInserts = expenses.map((exp) => ({
      user_id: user.id,
      gig_id: gigId,
      category: exp.category,
      description: exp.description || exp.category,
      amount: exp.amount,
      notes: exp.note || null,
      date: gig.date || new Date().toISOString().split('T')[0], // Use gig date or today
    }));

    const { error: expensesError } = await supabase
      .from('expenses')
      .insert(expenseInserts as any);

    if (expensesError) {
      console.error('Failed to create expenses:', expensesError);
      throw new Error(`Failed to create expenses: ${expensesError.message}`);
    }
  }

  // 4. Delete existing gig-related mileage
  const { error: deleteMileageError } = await supabase
    .from('mileage')
    .delete()
    .eq('gig_id', gigId)
    .eq('user_id', user.id);

  if (deleteMileageError) {
    console.error('Failed to delete old mileage:', deleteMileageError);
    throw new Error(`Failed to delete old mileage: ${deleteMileageError.message}`);
  }

  // 5. Create new inline mileage if provided
  if (mileage && mileage.miles > 0) {
    const mileageInsert = {
      user_id: user.id,
      gig_id: gigId,
      miles: mileage.miles,
      purpose: 'Gig travel',
      start_location: '',
      end_location: '',
      notes: mileage.note || null,
      date: gig.date || new Date().toISOString().split('T')[0],
    };

    const { error: mileageError } = await supabase
      .from('mileage')
      .insert(mileageInsert as any);

    if (mileageError) {
      console.error('Failed to create mileage:', mileageError);
      throw new Error(`Failed to create mileage: ${mileageError.message}`);
    }
  }

  return { id: gigId };
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

  // Check user's plan and gig count
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan || 'free';

  // If free plan, check gig limit
  if (plan === 'free') {
    const { count } = await supabase
      .from('gigs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count !== null && count >= FREE_GIG_LIMIT) {
      const error: any = new Error('Free plan limit reached');
      error.code = 'FREE_PLAN_LIMIT_REACHED';
      throw error;
    }
  }

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
