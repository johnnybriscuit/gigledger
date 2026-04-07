import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceFormData, InvoiceStatus } from '../types/invoice';
import { useUserId } from './useCurrentUser';
import { calculateInvoiceTotals, getEffectiveInvoiceStatus, roundCurrencyAmount } from '../utils/invoiceCalculations';
import { getTodayDateString, parseStoredDate } from '../lib/date';

export function useInvoices() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const { data: invoices = [], isLoading: loading, error } = useQuery({
    queryKey: ['invoices', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data: invoicesData, error: fetchError } = await supabase
        .from('invoices' as any)
        .select(`
          id,
          invoice_number,
          client_id,
          client_name,
          client_email,
          client_company,
          client_address,
          invoice_date,
          due_date,
          status,
          subtotal,
          total_amount,
          tax_amount,
          tax_rate,
          discount_amount,
          currency,
          notes,
          private_notes,
          payment_terms,
          accepted_payment_methods,
          sent_at,
          viewed_at,
          paid_at,
          created_at,
          updated_at,
          line_items:invoice_line_items(id, description, quantity, rate, amount, sort_order),
          payments:invoice_payments(id, amount, payment_date, payment_method, reference_number, notes, created_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const invoicesWithCalculations = (invoicesData || []).map((invoice: any) => {
        const lineItems = [...(invoice.line_items || [])].sort(
          (a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
        );
        const payments = [...(invoice.payments || [])].sort((a: any, b: any) => {
          const dateDiff = parseStoredDate(b.payment_date).getTime() - parseStoredDate(a.payment_date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const totalPaid = roundCurrencyAmount(
          payments.reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0)
        );
        const balanceDue = roundCurrencyAmount(Number(invoice.total_amount ?? 0) - totalPaid);
        const status = getEffectiveInvoiceStatus({
          status: invoice.status,
          due_date: invoice.due_date,
          total_amount: Number(invoice.total_amount ?? 0),
          total_paid: totalPaid,
          balance_due: balanceDue,
        });

        return {
          ...invoice,
          status,
          line_items: lineItems,
          payments,
          total_paid: totalPaid,
          balance_due: balanceDue,
        };
      });

      return invoicesWithCalculations as Invoice[];
    },
    enabled: !!userId,
    staleTime: 60000, // 60 seconds - invoices don't change that frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    // refetchOnMount defaults to true, which respects staleTime
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const fetchInvoices = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['invoices', userId] }),
      queryClient.invalidateQueries({ queryKey: ['invoices_aggregated', userId] }),
    ]);
  };

  const createInvoice = async (formData: InvoiceFormData, invoiceNumber: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const lineItems = formData.line_items.map((item, index) => ({
        description: item.description,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: roundCurrencyAmount(Number(item.quantity) * Number(item.rate)),
        sort_order: index
      }));

      const totals = calculateInvoiceTotals(lineItems, formData.tax_rate, formData.discount_amount);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices' as any)
        .insert({
          user_id: user.id,
          client_id: formData.client_id,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_company: formData.client_company,
          client_address: formData.client_address,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          status: 'draft',
          subtotal: totals.subtotal,
          tax_rate: formData.tax_rate,
          tax_amount: totals.taxAmount,
          discount_amount: totals.discountAmount,
          total_amount: totals.totalAmount,
          currency: formData.currency ?? 'USD',
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          private_notes: formData.private_notes,
          accepted_payment_methods: formData.accepted_payment_methods
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;
      const invoice = invoiceData as any;

      const lineItemsWithInvoiceId = lineItems.map(item => ({
        ...item,
        invoice_id: invoice.id
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsWithInvoiceId as any);

      if (lineItemsError) {
        await supabase
          .from('invoices' as any)
          .delete()
          .eq('id', invoice.id)
          .eq('user_id', user.id);
        throw lineItemsError;
      }

      await fetchInvoices();
      
      // Invalidate entitlements cache to update invoice count
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      
      // Track analytics
      const { trackInvoiceCreated } = await import('../lib/analytics');
      trackInvoiceCreated({ entity_id: invoice.id, source: 'invoice_form' });
      
      return invoice;
    } catch (err) {
      console.error('Error creating invoice:', err);
      throw err;
    }
  };

  const updateInvoice = async (invoiceId: string, formData: Partial<InvoiceFormData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existingLineItems, error: existingLineItemsError } = await supabase
        .from('invoice_line_items' as any)
        .select('description, quantity, rate, amount, sort_order')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true });

      if (existingLineItemsError) throw existingLineItemsError;

      let updateData: any = {
        client_id: formData.client_id,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_company: formData.client_company,
        client_address: formData.client_address,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        private_notes: formData.private_notes,
        tax_rate: formData.tax_rate,
        discount_amount: formData.discount_amount,
        accepted_payment_methods: formData.accepted_payment_methods,
        currency: formData.currency,
      };

      if (formData.line_items) {
        const { error: deleteLineItemsError } = await supabase
          .from('invoice_line_items' as any)
          .delete()
          .eq('invoice_id', invoiceId);

        if (deleteLineItemsError) {
          throw deleteLineItemsError;
        }

        const lineItems = formData.line_items.map((item, index) => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          amount: roundCurrencyAmount(Number(item.quantity) * Number(item.rate)),
          sort_order: index
        }));

        const totals = calculateInvoiceTotals(lineItems, formData.tax_rate, formData.discount_amount);

        updateData.subtotal = totals.subtotal;
        updateData.tax_amount = totals.taxAmount;
        updateData.discount_amount = totals.discountAmount;
        updateData.total_amount = totals.totalAmount;

        const { error: insertLineItemsError } = await supabase
          .from('invoice_line_items' as any)
          .insert(lineItems);

        if (insertLineItemsError) {
          if (existingLineItems && existingLineItems.length > 0) {
            const restorePayload = existingLineItems.map((item: any) => ({
              invoice_id: invoiceId,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              sort_order: item.sort_order,
            }));

            await supabase
              .from('invoice_line_items' as any)
              .insert(restorePayload);
          }

          throw insertLineItemsError;
        }
      }

      const { error: updateError } = await supabase
        .from('invoices' as any)
        .update(updateData)
        .eq('id', invoiceId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchInvoices();
    } catch (err) {
      console.error('Error updating invoice:', err);
      throw err;
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      console.log('🗑️ Attempting to delete invoice:', invoiceId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      console.log('✓ User authenticated:', user.id);

      console.log('Deleting invoice with params:', { id: invoiceId, user_id: user.id });
      const { data, error: deleteError } = await supabase
        .from('invoices' as any)
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .select();

      console.log('Delete response:', { data, error: deleteError });

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        throw deleteError;
      }

      console.log('✓ Invoice deleted successfully');
      // Invalidate query to refetch invoices
      await fetchInvoices();
    } catch (err) {
      console.error('❌ Error deleting invoice:', err);
      throw err;
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = { status };

      if (status === 'sent' && !invoices.find(i => i.id === invoiceId)?.sent_at) {
        updateData.sent_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('invoices' as any)
        .update(updateData)
        .eq('id', invoiceId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Track analytics
      const { trackInvoiceSent, trackInvoiceMarkedPaid } = await import('../lib/analytics');
      if (status === 'sent') {
        trackInvoiceSent({ entity_id: invoiceId, source: 'invoice_screen' });
      } else if (status === 'paid') {
        trackInvoiceMarkedPaid({ entity_id: invoiceId, source: 'invoice_screen' });
      }

      await fetchInvoices();
    } catch (err) {
      console.error('Error updating invoice status:', err);
      throw err;
    }
  };

  const recordPayment = async (
    invoiceId: string,
    paymentData: {
      payment_date: string;
      amount: number;
      payment_method: string;
      reference_number?: string;
      notes?: string;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Inserting payment record:', {
        invoice_id: invoiceId,
        ...paymentData
      });

      const { data, error: paymentError } = await supabase
        .from('invoice_payments' as any)
        .insert({
          invoice_id: invoiceId,
          ...paymentData,
          amount: roundCurrencyAmount(paymentData.amount),
        })
        .select();

      if (paymentError) {
        console.error('Payment insert error:', paymentError);
        throw new Error(paymentError.message || 'Failed to record payment');
      }

      console.log('Payment recorded successfully:', data);
      await fetchInvoices();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      throw new Error(err.message || 'Failed to record payment');
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Deleting payment:', paymentId);

      const { error: deleteError } = await supabase
        .from('invoice_payments' as any)
        .delete()
        .eq('id', paymentId);

      if (deleteError) {
        console.error('Payment delete error:', deleteError);
        throw new Error(deleteError.message || 'Failed to delete payment');
      }

      console.log('Payment deleted successfully');
      await fetchInvoices();
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      throw new Error(err.message || 'Failed to delete payment');
    }
  };

  const duplicateInvoice = async (invoiceId: string) => {
    try {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      const today = getTodayDateString();
      let dueDate = today;

      if (invoice.invoice_date && invoice.due_date) {
        const originalInvoiceDate = parseStoredDate(invoice.invoice_date);
        const originalDueDate = parseStoredDate(invoice.due_date);
        const deltaDays = Math.round((originalDueDate.getTime() - originalInvoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        const nextDueDate = parseStoredDate(today);
        nextDueDate.setDate(nextDueDate.getDate() + deltaDays);
        const year = nextDueDate.getFullYear();
        const month = String(nextDueDate.getMonth() + 1).padStart(2, '0');
        const day = String(nextDueDate.getDate()).padStart(2, '0');
        dueDate = `${year}-${month}-${day}`;
      }

      const formData: InvoiceFormData = {
        client_id: invoice.client_id,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_company: invoice.client_company,
        client_address: invoice.client_address,
        invoice_date: today,
        due_date: dueDate,
        payment_terms: invoice.payment_terms,
        notes: invoice.notes,
        private_notes: invoice.private_notes,
        tax_rate: invoice.tax_rate,
        discount_amount: invoice.discount_amount,
        accepted_payment_methods: invoice.accepted_payment_methods,
        line_items: invoice.line_items?.map(item => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate
        })) || []
      };

      return formData;
    } catch (err) {
      console.error('Error duplicating invoice:', err);
      throw err;
    }
  };

  return {
    invoices,
    loading,
    error,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    updateInvoiceStatus,
    recordPayment,
    deletePayment,
    duplicateInvoice,
    refetch: fetchInvoices
  };
}
