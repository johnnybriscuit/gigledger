import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Client-side calculation of next due date
function calculateNextDueDate(
  frequency: 'weekly' | 'monthly' | 'yearly',
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  monthOfYear?: number | null,
  fromDate: Date = new Date()
): string {
  let nextDate = new Date(fromDate);
  
  switch (frequency) {
    case 'weekly':
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay();
        const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
        nextDate.setDate(nextDate.getDate() + (daysUntilTarget || 7));
      }
      break;
      
    case 'monthly':
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
        if (nextDate <= fromDate) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
      }
      break;
      
    case 'yearly':
      if (monthOfYear !== null && monthOfYear !== undefined && dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setMonth(monthOfYear - 1);
        nextDate.setDate(dayOfMonth);
        if (nextDate <= fromDate) {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
      }
      break;
  }
  
  return nextDate.toISOString().split('T')[0];
}

export type RecurringExpense = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  frequency: 'weekly' | 'monthly' | 'yearly';
  day_of_week?: number | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
  next_due_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RecurringExpenseInput = Omit<RecurringExpense, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

// Fetch all recurring expenses
export function useRecurringExpenses() {
  return useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as RecurringExpense[];
    },
  });
}

// Fetch active recurring expenses (for quick-add buttons)
export function useActiveRecurringExpenses() {
  return useQuery({
    queryKey: ['recurring-expenses', 'active'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as RecurringExpense[];
    },
  });
}

// Fetch upcoming recurring expenses (due within next 7 days)
export function useUpcomingRecurringExpenses() {
  return useQuery({
    queryKey: ['recurring-expenses', 'upcoming'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('next_due_date', today)
        .lte('next_due_date', nextWeek)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return data as RecurringExpense[];
    },
  });
}

// Create recurring expense
export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecurringExpenseInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate next due date using client-side function
      const nextDueDate = calculateNextDueDate(
        input.frequency,
        input.day_of_week,
        input.day_of_month,
        input.month_of_year
      );

      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          ...input,
          user_id: user.id,
          next_due_date: nextDueDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data as RecurringExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
  });
}

// Update recurring expense
export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<RecurringExpenseInput> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // If frequency or date fields changed, recalculate next due date
      let nextDueDate: string | undefined;
      if (input.frequency || input.day_of_week !== undefined || input.day_of_month !== undefined || input.month_of_year !== undefined) {
        // Fetch current values
        const { data: current } = await supabase
          .from('recurring_expenses')
          .select('*')
          .eq('id', id)
          .single();

        if (current) {
          nextDueDate = calculateNextDueDate(
            input.frequency || current.frequency,
            input.day_of_week !== undefined ? input.day_of_week : current.day_of_week,
            input.day_of_month !== undefined ? input.day_of_month : current.day_of_month,
            input.month_of_year !== undefined ? input.month_of_year : current.month_of_year
          );
        }
      }

      const updateData = nextDueDate ? { ...input, next_due_date: nextDueDate } : input;

      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
  });
}

// Delete recurring expense
export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
  });
}

// Quick-add: Create expense from recurring template
export function useQuickAddExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recurringExpenseId, date }: { recurringExpenseId: string; date?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch recurring expense template
      const { data: template, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('id', recurringExpenseId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!template) throw new Error('Recurring expense not found');

      // Create expense from template
      const expenseDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          date: expenseDate,
          category: template.category,
          description: template.name,
          amount: template.amount,
          vendor: template.vendor,
          notes: template.notes,
          recurring_expense_id: recurringExpenseId,
          meals_percent_allowed: template.category === 'Meals & Entertainment' ? 0.5 : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update next_due_date on the recurring expense
      const [year, month, day] = expenseDate.split('-').map(Number);
      const fromDate = new Date(year, month - 1, day);
      
      const nextDueDate = calculateNextDueDate(
        template.frequency,
        template.day_of_week,
        template.day_of_month,
        template.month_of_year,
        fromDate
      );

      await supabase
        .from('recurring_expenses')
        .update({ next_due_date: nextDueDate })
        .eq('id', recurringExpenseId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
  });
}
