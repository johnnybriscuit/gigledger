import { Invoice, InvoiceSettings, formatCurrency } from '../types/invoice';
import { PaymentMethodDetail } from '../hooks/usePaymentMethodDetails';

// HTML sanitization helper to prevent injection attacks
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function generateInvoicePDF(invoice: Invoice, settings: InvoiceSettings, paymentMethodDetails?: PaymentMethodDetail[]): string {
  const getColorScheme = () => {
    switch (settings.color_scheme) {
      case 'blue': return { primary: '#2563eb', secondary: '#dbeafe' };
      case 'green': return { primary: '#059669', secondary: '#d1fae5' };
      case 'purple': return { primary: '#7c3aed', secondary: '#ede9fe' };
      case 'gray': return { primary: '#4b5563', secondary: '#f3f4f6' };
      default: return { primary: '#2563eb', secondary: '#dbeafe' };
    }
  };

  const colors = getColorScheme();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #111827;
      padding: 40px;
      background: white;
    }
    
    .invoice {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      margin-bottom: 30px;
    }
    
    .business-name {
      font-size: 28px;
      font-weight: 700;
      color: ${colors.primary};
      margin-bottom: 10px;
    }
    
    .contact-info {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
    }
    
    .divider {
      height: 2px;
      background-color: ${colors.primary};
      margin: 20px 0;
    }
    
    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      text-align: center;
      color: ${colors.primary};
      margin: 20px 0;
    }
    
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .info-label {
      font-weight: 500;
      color: #6b7280;
    }
    
    .info-value {
      font-weight: 600;
      color: #111827;
    }
    
    .bill-to {
      margin-bottom: 30px;
    }
    
    .bill-to-label {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 10px;
    }
    
    .client-name {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    
    .client-info {
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    thead {
      background-color: ${colors.secondary};
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      color: #111827;
    }
    
    th.right {
      text-align: right;
    }
    
    th.center {
      text-align: center;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
      color: #374151;
    }
    
    td.right {
      text-align: right;
      font-weight: 600;
    }
    
    td.center {
      text-align: center;
    }
    
    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .totals {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 20px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      min-width: 300px;
      margin-bottom: 10px;
    }
    
    .total-label {
      font-size: 15px;
      color: #374151;
    }
    
    .total-value {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
    }
    
    .grand-total {
      border-top: 2px solid ${colors.primary};
      padding-top: 12px;
      margin-top: 8px;
    }
    
    .grand-total-label {
      font-size: 18px;
      font-weight: 700;
      color: ${colors.primary};
    }
    
    .grand-total-value {
      font-size: 22px;
      font-weight: 700;
      color: ${colors.primary};
    }
    
    .terms-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    
    .terms-label {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 6px;
    }
    
    .terms-text {
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      font-style: italic;
    }
    
    .paid-stamp {
      position: fixed;
      top: 40%;
      left: 25%;
      transform: rotate(-25deg);
      border: 6px solid #059669;
      border-radius: 8px;
      padding: 20px 40px;
      opacity: 0.3;
      font-size: 64px;
      font-weight: 900;
      color: #059669;
      pointer-events: none;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .paid-stamp {
        position: absolute;
      }
    }
  </style>
</head>
<body>
  <div class="invoice">
    ${invoice.status === 'paid' ? '<div class="paid-stamp">PAID</div>' : ''}
    
    <div class="header">
      <div class="business-name">${settings.business_name}</div>
      <div class="contact-info">
        ${settings.email ? `${settings.email}<br>` : ''}
        ${settings.phone ? `${settings.phone}<br>` : ''}
        ${settings.address ? `${settings.address}<br>` : ''}
        ${settings.website ? `${settings.website}<br>` : ''}
        ${settings.tax_id ? `Tax ID: ${settings.tax_id}` : ''}
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div class="invoice-title">INVOICE</div>
    
    <div class="invoice-info">
      <div>
        <div class="info-row">
          <span class="info-label">Invoice #:</span>
          <span class="info-value">${invoice.invoice_number}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${new Date(invoice.invoice_date).toLocaleDateString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Due Date:</span>
          <span class="info-value">${new Date(invoice.due_date).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    
    <div class="bill-to">
      <div class="bill-to-label">Bill To:</div>
      <div class="client-name">${invoice.client_name}</div>
      ${invoice.client_company ? `<div class="client-info">${invoice.client_company}</div>` : ''}
      ${invoice.client_address ? `<div class="client-info">${invoice.client_address}</div>` : ''}
      ${invoice.client_email ? `<div class="client-info">${invoice.client_email}</div>` : ''}
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="center">Qty</th>
          <th class="right">Rate</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.line_items?.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${formatCurrency(item.rate, invoice.currency)}</td>
            <td class="right">${formatCurrency(item.amount, invoice.currency)}</td>
          </tr>
        `).join('') || ''}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="total-row">
        <span class="total-label">Subtotal:</span>
        <span class="total-value">${formatCurrency(invoice.subtotal, invoice.currency)}</span>
      </div>
      
      ${invoice.tax_rate && invoice.tax_amount ? `
        <div class="total-row">
          <span class="total-label">Tax (${invoice.tax_rate}%):</span>
          <span class="total-value">${formatCurrency(invoice.tax_amount, invoice.currency)}</span>
        </div>
      ` : ''}
      
      ${invoice.discount_amount && invoice.discount_amount > 0 ? `
        <div class="total-row">
          <span class="total-label">Discount:</span>
          <span class="total-value">-${formatCurrency(invoice.discount_amount, invoice.currency)}</span>
        </div>
      ` : ''}
      
      <div class="total-row grand-total">
        <span class="grand-total-label">TOTAL DUE:</span>
        <span class="grand-total-value">${formatCurrency(invoice.total_amount, invoice.currency)}</span>
      </div>
    </div>
    
    <div class="terms-section">
      ${invoice.payment_terms ? `
        <div class="terms-label">Payment Terms:</div>
        <div class="terms-text">${invoice.payment_terms}</div>
      ` : ''}
      
      ${invoice.accepted_payment_methods && invoice.accepted_payment_methods.length > 0 ? `
        <div class="terms-label">Payment Methods Accepted:</div>
        <div class="terms-text">
          ${invoice.accepted_payment_methods.map(pm => {
            const methodKey = pm.method.toLowerCase().replace(/\s+/g, '');
            const detail = paymentMethodDetails?.find(pmd => pmd.method === methodKey);
            const detailText = detail?.enabled && detail?.details?.trim() 
              ? escapeHtml(detail.details) 
              : '(details not provided)';
            return `• ${escapeHtml(pm.method)}: ${detailText}`;
          }).join('<br>')}
        </div>
      ` : ''}
      
      ${invoice.notes ? `
        <div class="terms-label">Notes:</div>
        <div class="terms-text">${invoice.notes}</div>
      ` : ''}
    </div>
    
    <div class="footer">
      Thank you for your business!
    </div>
  </div>
</body>
</html>
  `;

  return htmlContent;
}

export function downloadInvoiceHTML(invoice: Invoice, settings: InvoiceSettings, paymentMethodDetails?: PaymentMethodDetail[]) {
  const html = generateInvoicePDF(invoice, settings, paymentMethodDetails);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice-${invoice.invoice_number}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printInvoice(invoice: Invoice, settings: InvoiceSettings, paymentMethodDetails?: PaymentMethodDetail[]) {
  const html = generateInvoicePDF(invoice, settings, paymentMethodDetails);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
