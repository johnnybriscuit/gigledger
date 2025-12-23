import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceFormData, InvoiceLineItem, InvoiceStatus } from '../types/invoice';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: invoicesData, error: fetchError } = await supabase
        .from('invoices' as any)
        .select(`
          *,
          line_items:invoice_line_items(*),
          payments:invoice_payments(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const invoicesWithCalculations = (invoicesData || []).map((invoice: any) => {
        const totalPaid = invoice.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
        return {
          ...invoice,
          total_paid: totalPaid,
          balance_due: parseFloat(invoice.total_amount) - totalPaid
        };
      });

      setInvoices(invoicesWithCalculations);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (formData: InvoiceFormData, invoiceNumber: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const lineItems = formData.line_items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
        sort_order: index
      }));

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = formData.tax_rate ? subtotal * (formData.tax_rate / 100) : 0;
      const totalAmount = subtotal + taxAmount - (formData.discount_amount || 0);

      const { data: invoice, error: invoiceError } = await supabase
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
          subtotal,
          tax_rate: formData.tax_rate,
          tax_amount: taxAmount,
          discount_amount: formData.discount_amount,
          total_amount: totalAmount,
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          private_notes: formData.private_notes,
          accepted_payment_methods: formData.accepted_payment_methods
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const lineItemsWithInvoiceId = lineItems.map(item => ({
        ...item,
        invoice_id: invoice.id
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsWithInvoiceId as any);

      if (lineItemsError) throw lineItemsError;

      await fetchInvoices();
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
        accepted_payment_methods: formData.accepted_payment_methods
      };

      if (formData.line_items) {
        await supabase
          .from('invoice_line_items' as any)
          .delete()
          .eq('invoice_id', invoiceId);

        const lineItems = formData.line_items.map((item, index) => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
          sort_order: index
        }));

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = formData.tax_rate ? subtotal * (formData.tax_rate / 100) : 0;
        const totalAmount = subtotal + taxAmount - (formData.discount_amount || 0);

        updateData.subtotal = subtotal;
        updateData.tax_amount = taxAmount;
        updateData.total_amount = totalAmount;

        await supabase
          .from('invoice_line_items' as any)
          .insert(lineItems);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('invoices' as any)
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      await fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
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

      const { error: paymentError } = await supabase
        .from('invoice_payments' as any)
        .insert({
          invoice_id: invoiceId,
          ...paymentData
        });

      if (paymentError) throw paymentError;

      await fetchInvoices();
    } catch (err) {
      console.error('Error recording payment:', err);
      throw err;
    }
  };

  const duplicateInvoice = async (invoiceId: string) => {
    try {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const formData: InvoiceFormData = {
        client_id: invoice.client_id,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_company: invoice.client_company,
        client_address: invoice.client_address,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: invoice.due_date,
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
    duplicateInvoice,
    refetch: fetchInvoices
  };
}
