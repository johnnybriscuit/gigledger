/**
 * Service for creating gigs with inline expenses and mileage
 * Handles atomic creation of gig + related items
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { getPlanAndUsage, createGigLimitError } from '../lib/planLimits';

type GigInsert = Database['public']['Tables']['gigs']['Insert'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type MileageInsert = Database['public']['Tables']['mileage']['Insert'];
type SubcontractorPaymentInsert = Database['public']['Tables']['gig_subcontractor_payments']['Insert'];

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

export interface InlineSubcontractorPaymentData {
  subcontractor_id: string;
  amount: number;
  note?: string;
}

export interface CreateGigWithLinesParams {
  gig: Omit<GigInsert, 'user_id'>;
  expenses?: InlineExpenseData[];
  mileage?: InlineMileageData;
  subcontractorPayments?: InlineSubcontractorPaymentData[];
}

export interface UpdateGigWithLinesParams {
  gigId: string;
  gig: Partial<Omit<GigInsert, 'user_id'>>;
  expenses?: InlineExpenseData[];
  mileage?: InlineMileageData;
  subcontractorPayments?: InlineSubcontractorPaymentData[];
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
  subcontractorPayments = [],
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

  // 5. Delete existing gig-related subcontractor payments
  const { error: deletePaymentsError } = await supabase
    .from('gig_subcontractor_payments')
    .delete()
    .eq('gig_id', gigId)
    .eq('user_id', user.id);

  if (deletePaymentsError) {
    console.error('Failed to delete old subcontractor payments:', deletePaymentsError);
    throw new Error(`Failed to delete old subcontractor payments: ${deletePaymentsError.message}`);
  }

  // 6. Create new subcontractor payments if any
  if (subcontractorPayments.length > 0) {
    const paymentInserts = subcontractorPayments
      .filter(payment => payment.subcontractor_id && payment.amount > 0)
      .map((payment) => ({
        user_id: user.id,
        gig_id: gigId,
        subcontractor_id: payment.subcontractor_id,
        amount: payment.amount,
        note: payment.note || null,
      }));

    if (paymentInserts.length > 0) {
      const { error: paymentsError } = await supabase
        .from('gig_subcontractor_payments')
        .insert(paymentInserts as any);

      if (paymentsError) {
        console.error('Failed to create subcontractor payments:', paymentsError);
        throw new Error(`Failed to create subcontractor payments: ${paymentsError.message}`);
      }
    }
  }

  // 7. Create new inline mileage if provided
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
  subcontractorPayments = [],
}: CreateGigWithLinesParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check plan limits using centralized helper
  const planCheck = await getPlanAndUsage(supabase, user.id);
  
  if (!planCheck.canCreateGigs) {
    throw createGigLimitError(planCheck);
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

    // 3. Create subcontractor payments if any
    if (subcontractorPayments.length > 0) {
      const paymentInserts = subcontractorPayments
        .filter(payment => payment.subcontractor_id && payment.amount > 0)
        .map((payment) => ({
          user_id: user.id,
          gig_id: gigId,
          subcontractor_id: payment.subcontractor_id,
          amount: payment.amount,
          note: payment.note || null,
        }));

      if (paymentInserts.length > 0) {
        const { error: paymentsError } = await supabase
          .from('gig_subcontractor_payments')
          .insert(paymentInserts as any);

        if (paymentsError) {
          // Rollback: delete the gig
          await supabase.from('gigs').delete().eq('id', gigId);
          console.error('Failed to create subcontractor payments:', paymentsError);
          throw new Error(`Failed to create subcontractor payments: ${paymentsError.message}`);
        }
      }
    }

    // 4. Create inline mileage if provided
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
