/**
 * Generate 1099-NEC Prep Summary PDF
 * This is a preparation summary, NOT an official IRS form
 */

import type { Subcontractor1099Total } from '../../hooks/use1099Totals';

export interface Payer1099Info {
  businessName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  ein?: string;
}

export interface Generate1099PdfOptions {
  subcontractor: Subcontractor1099Total;
  payer: Payer1099Info;
  taxYear: number;
}

/**
 * Generate 1099-NEC Prep Summary PDF
 * Returns a Blob that can be downloaded or emailed
 */
export async function generate1099PrepPdf(options: Generate1099PdfOptions): Promise<Blob> {
  const { subcontractor, payer, taxYear } = options;

  // Create HTML content for PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>1099-NEC Prep Summary - ${taxYear}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
      margin: 15px 0;
    }
    .info-label {
      font-weight: bold;
      color: #555;
    }
    .info-value {
      color: #333;
    }
    .amount-box {
      background: #f5f5f5;
      border: 2px solid #333;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .amount-box .label {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .amount-box .amount {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .disclaimer {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .disclaimer strong {
      color: #856404;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>1099-NEC Preparation Summary</h1>
    <p>Tax Year ${taxYear}</p>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="disclaimer">
    <strong>IMPORTANT:</strong> This is a preparation summary for your records. 
    This is NOT an official IRS Form 1099-NEC. Your payer will file the official form with the IRS.
  </div>

  <div class="section">
    <h2>Payer Information</h2>
    <div class="info-grid">
      <div class="info-label">Business Name:</div>
      <div class="info-value">${escapeHtml(payer.businessName)}</div>
      
      <div class="info-label">Address:</div>
      <div class="info-value">
        ${escapeHtml(payer.addressLine1)}<br>
        ${payer.addressLine2 ? escapeHtml(payer.addressLine2) + '<br>' : ''}
        ${escapeHtml(payer.city)}, ${escapeHtml(payer.state)} ${escapeHtml(payer.postalCode)}
      </div>
      
      ${payer.ein ? `
      <div class="info-label">EIN:</div>
      <div class="info-value">${escapeHtml(payer.ein)}</div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <h2>Recipient Information</h2>
    <div class="info-grid">
      <div class="info-label">Name:</div>
      <div class="info-value">${escapeHtml(subcontractor.legal_name || subcontractor.name)}</div>
      
      ${subcontractor.address_line1 ? `
      <div class="info-label">Address:</div>
      <div class="info-value">
        ${escapeHtml(subcontractor.address_line1)}<br>
        ${subcontractor.address_line2 ? escapeHtml(subcontractor.address_line2) + '<br>' : ''}
        ${subcontractor.city ? escapeHtml(subcontractor.city) + ', ' : ''}
        ${subcontractor.state ? escapeHtml(subcontractor.state) + ' ' : ''}
        ${subcontractor.postal_code ? escapeHtml(subcontractor.postal_code) : ''}
      </div>
      ` : ''}
      
      ${subcontractor.tax_id_last4 ? `
      <div class="info-label">TIN (last 4):</div>
      <div class="info-value">***-**-${escapeHtml(subcontractor.tax_id_last4)}</div>
      ` : ''}
    </div>
  </div>

  <div class="amount-box">
    <div class="label">Box 1: Nonemployee Compensation</div>
    <div class="amount">$${subcontractor.total_paid.toFixed(2)}</div>
  </div>

  <div class="section">
    <h2>Payment Summary</h2>
    <div class="info-grid">
      <div class="info-label">Tax Year:</div>
      <div class="info-value">${taxYear}</div>
      
      <div class="info-label">Number of Gigs:</div>
      <div class="info-value">${subcontractor.gig_count}</div>
      
      <div class="info-label">Total Paid:</div>
      <div class="info-value">$${subcontractor.total_paid.toFixed(2)}</div>
      
      <div class="info-label">Threshold Status:</div>
      <div class="info-value">${subcontractor.requires_1099 ? 'Requires 1099-NEC (≥ $600)' : 'Below threshold (< $600)'}</div>
    </div>
  </div>

  <div class="disclaimer">
    <strong>What to do with this summary:</strong><br>
    • Keep this for your records<br>
    • Use this to prepare your tax return<br>
    • Report this income on Schedule C (Form 1040) if you're self-employed<br>
    • Consult a tax professional if you have questions
  </div>

  <div class="footer">
    <p>Generated by Bozzy - Self-Employed Income & Tax Tracking</p>
    <p>https://bozzygigs.com</p>
  </div>
</body>
</html>
  `;

  // Convert HTML to PDF using browser's print functionality
  // In a real implementation, you might use a library like jsPDF or pdfmake
  // For now, we'll create a simple blob that can be used with window.print()
  const blob = new Blob([html], { type: 'text/html' });
  return blob;
}

/**
 * Download 1099 prep PDF
 */
export async function download1099PrepPdf(options: Generate1099PdfOptions): Promise<void> {
  const blob = await generate1099PrepPdf(options);
  const url = URL.createObjectURL(blob);
  
  // Open in new window for printing
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Helper to escape HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
