/**
 * Schedule C Summary PDF Generator
 * Generates a printable HTML document that can be saved as PDF
 * Professional layout for CPA review
 */

import type { ScheduleCSummaryRow } from './schemas';

export interface PDFGeneratorInput {
  scheduleCSummary: ScheduleCSummaryRow;
  taxYear: number;
  taxpayerName?: string;
  generatedDate: string;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format filing status for display
 */
function formatFilingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    single: 'Single',
    married_joint: 'Married Filing Jointly',
    married_separate: 'Married Filing Separately',
    head: 'Head of Household',
  };
  return statusMap[status] || status;
}

/**
 * Generate HTML for Schedule C Summary PDF
 */
export function generateScheduleCPDF(input: PDFGeneratorInput): string {
  const { scheduleCSummary, taxYear, taxpayerName, generatedDate } = input;
  const s = scheduleCSummary;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schedule C Summary - ${taxYear} - GigLedger</title>
  <style>
    @media print {
      @page {
        size: letter;
        margin: 0.5in;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      background: #fff;
      padding: 20px;
      max-width: 8.5in;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid #2563eb;
    }

    .header h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 5px;
    }

    .header .subtitle {
      font-size: 14pt;
      color: #666;
      margin-bottom: 10px;
    }

    .header .meta {
      font-size: 10pt;
      color: #888;
    }

    .info-section {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 25px;
      border-left: 4px solid #2563eb;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 10pt;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-label {
      font-weight: 600;
      color: #555;
    }

    .info-value {
      color: #1a1a1a;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 16pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    .line-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    .line-item:hover {
      background: #f8f9fa;
    }

    .line-item.total {
      background: #eff6ff;
      border-top: 2px solid #2563eb;
      border-bottom: 2px solid #2563eb;
      font-weight: 700;
      font-size: 12pt;
      margin-top: 10px;
    }

    .line-item.subtotal {
      background: #f8f9fa;
      font-weight: 600;
      border-top: 1px solid #d1d5db;
    }

    .line-label {
      flex: 1;
      color: #374151;
    }

    .line-code {
      color: #6b7280;
      font-size: 9pt;
      margin-left: 8px;
      font-family: 'Courier New', monospace;
    }

    .line-amount {
      font-weight: 600;
      color: #1a1a1a;
      text-align: right;
      min-width: 120px;
      font-family: 'Courier New', monospace;
    }

    .line-amount.negative {
      color: #dc2626;
    }

    .line-amount.positive {
      color: #059669;
    }

    .tax-estimates {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }

    .tax-estimates .section-title {
      color: #92400e;
      border-bottom-color: #fbbf24;
    }

    .tax-estimates .line-item {
      border-bottom-color: #fde68a;
    }

    .disclaimer {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 15px;
      margin-top: 30px;
      font-size: 9pt;
      color: #0c4a6e;
      line-height: 1.6;
    }

    .disclaimer strong {
      font-weight: 700;
      color: #075985;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9pt;
      color: #888;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    .print-button:hover {
      background: #1d4ed8;
    }

    @media print {
      .print-button {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header">
    <h1>Schedule C Summary</h1>
    <div class="subtitle">Profit or Loss From Business (Sole Proprietorship)</div>
    <div class="meta">
      Tax Year ${taxYear} • Generated by GigLedger on ${generatedDate}
    </div>
  </div>

  <div class="info-section">
    ${taxpayerName ? `<div class="info-row">
      <span class="info-label">Taxpayer Name:</span>
      <span class="info-value">${taxpayerName}</span>
    </div>` : ''}
    <div class="info-row">
      <span class="info-label">Tax Year:</span>
      <span class="info-value">${taxYear}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Filing Status:</span>
      <span class="info-value">${formatFilingStatus(s.filing_status)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">State of Residence:</span>
      <span class="info-value">${s.state_of_residence}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Deduction Method:</span>
      <span class="info-value">${s.standard_or_itemized === 'standard' ? 'Standard Deduction' : 'Itemized Deduction'}</span>
    </div>
  </div>

  <!-- PART I: INCOME -->
  <div class="section">
    <h2 class="section-title">Part I: Income</h2>
    
    <div class="line-item">
      <div class="line-label">
        Gross receipts or sales
        <span class="line-code">Line 1</span>
      </div>
      <div class="line-amount">${formatCurrency(s.gross_receipts)}</div>
    </div>

    ${s.returns_and_allowances > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Returns and allowances
        <span class="line-code">Line 2</span>
      </div>
      <div class="line-amount negative">(${formatCurrency(s.returns_and_allowances)})</div>
    </div>
    ` : ''}

    ${s.other_income > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Other income
        <span class="line-code">Line 6</span>
      </div>
      <div class="line-amount">${formatCurrency(s.other_income)}</div>
    </div>
    ` : ''}

    <div class="line-item total">
      <div class="line-label">
        Gross income
        <span class="line-code">Line 7</span>
      </div>
      <div class="line-amount positive">${formatCurrency(s.total_income)}</div>
    </div>
  </div>

  <!-- PART II: EXPENSES -->
  <div class="section">
    <h2 class="section-title">Part II: Expenses</h2>
    
    ${s.advertising > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Advertising
        <span class="line-code">Line 8</span>
      </div>
      <div class="line-amount">${formatCurrency(s.advertising)}</div>
    </div>
    ` : ''}

    ${s.car_truck > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Car and truck expenses
        <span class="line-code">Line 9</span>
      </div>
      <div class="line-amount">${formatCurrency(s.car_truck)}</div>
    </div>
    ` : ''}

    ${s.commissions > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Commissions and fees
        <span class="line-code">Line 10</span>
      </div>
      <div class="line-amount">${formatCurrency(s.commissions)}</div>
    </div>
    ` : ''}

    ${s.depreciation > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Depreciation
        <span class="line-code">Line 13</span>
      </div>
      <div class="line-amount">${formatCurrency(s.depreciation)}</div>
    </div>
    ` : ''}

    ${s.employee_benefit > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Employee benefit programs
        <span class="line-code">Line 14</span>
      </div>
      <div class="line-amount">${formatCurrency(s.employee_benefit)}</div>
    </div>
    ` : ''}

    ${s.insurance_other > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Insurance (other than health)
        <span class="line-code">Line 15</span>
      </div>
      <div class="line-amount">${formatCurrency(s.insurance_other)}</div>
    </div>
    ` : ''}

    ${s.interest_mortgage > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Interest - Mortgage
        <span class="line-code">Line 16a</span>
      </div>
      <div class="line-amount">${formatCurrency(s.interest_mortgage)}</div>
    </div>
    ` : ''}

    ${s.interest_other > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Interest - Other
        <span class="line-code">Line 16b</span>
      </div>
      <div class="line-amount">${formatCurrency(s.interest_other)}</div>
    </div>
    ` : ''}

    ${s.legal_professional > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Legal and professional services
        <span class="line-code">Line 17</span>
      </div>
      <div class="line-amount">${formatCurrency(s.legal_professional)}</div>
    </div>
    ` : ''}

    ${s.office_expense > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Office expense
        <span class="line-code">Line 18</span>
      </div>
      <div class="line-amount">${formatCurrency(s.office_expense)}</div>
    </div>
    ` : ''}

    ${s.rent_vehicles > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Rent or lease - Vehicles, machinery, equipment
        <span class="line-code">Line 20a</span>
      </div>
      <div class="line-amount">${formatCurrency(s.rent_vehicles)}</div>
    </div>
    ` : ''}

    ${s.rent_other > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Rent or lease - Other business property
        <span class="line-code">Line 20b</span>
      </div>
      <div class="line-amount">${formatCurrency(s.rent_other)}</div>
    </div>
    ` : ''}

    ${s.repairs_maintenance > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Repairs and maintenance
        <span class="line-code">Line 21</span>
      </div>
      <div class="line-amount">${formatCurrency(s.repairs_maintenance)}</div>
    </div>
    ` : ''}

    ${s.supplies > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Supplies
        <span class="line-code">Line 22</span>
      </div>
      <div class="line-amount">${formatCurrency(s.supplies)}</div>
    </div>
    ` : ''}

    ${s.taxes_licenses > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Taxes and licenses
        <span class="line-code">Line 23</span>
      </div>
      <div class="line-amount">${formatCurrency(s.taxes_licenses)}</div>
    </div>
    ` : ''}

    ${s.travel > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Travel
        <span class="line-code">Line 24a</span>
      </div>
      <div class="line-amount">${formatCurrency(s.travel)}</div>
    </div>
    ` : ''}

    ${s.meals_allowed > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Meals (deductible amount after 50% limitation)
        <span class="line-code">Line 24b</span>
      </div>
      <div class="line-amount">${formatCurrency(s.meals_allowed)}</div>
    </div>
    ` : ''}

    ${s.utilities > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Utilities
        <span class="line-code">Line 25</span>
      </div>
      <div class="line-amount">${formatCurrency(s.utilities)}</div>
    </div>
    ` : ''}

    ${s.wages > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Wages
        <span class="line-code">Line 26</span>
      </div>
      <div class="line-amount">${formatCurrency(s.wages)}</div>
    </div>
    ` : ''}

    ${s.other_expenses_total > 0 ? `
    <div class="line-item">
      <div class="line-label">
        Other expenses
        <span class="line-code">Line 27a</span>
      </div>
      <div class="line-amount">${formatCurrency(s.other_expenses_total)}</div>
    </div>
    ` : ''}

    <div class="line-item total">
      <div class="line-label">
        Total expenses
        <span class="line-code">Line 28</span>
      </div>
      <div class="line-amount">${formatCurrency(s.total_expenses)}</div>
    </div>
  </div>

  <!-- NET PROFIT -->
  <div class="section">
    <h2 class="section-title">Net Profit or (Loss)</h2>
    
    <div class="line-item total">
      <div class="line-label">
        Net profit or (loss)
        <span class="line-code">Line 31</span>
      </div>
      <div class="line-amount ${s.net_profit >= 0 ? 'positive' : 'negative'}">
        ${s.net_profit >= 0 ? formatCurrency(s.net_profit) : `(${formatCurrency(Math.abs(s.net_profit))})`}
      </div>
    </div>
  </div>

  <!-- TAX ESTIMATES -->
  <div class="tax-estimates">
    <h2 class="section-title">Estimated Tax Liability (Informational Only)</h2>
    <p style="font-size: 9pt; color: #92400e; margin-bottom: 15px; font-style: italic;">
      These are simplified estimates for planning purposes. Not a substitute for professional tax preparation.
    </p>

    <div class="line-item">
      <div class="line-label">Self-Employment Tax Basis (92.35% of net profit)</div>
      <div class="line-amount">${formatCurrency(s.se_tax_basis)}</div>
    </div>

    <div class="line-item">
      <div class="line-label">Estimated Self-Employment Tax</div>
      <div class="line-amount">${formatCurrency(s.est_se_tax)}</div>
    </div>

    <div class="line-item">
      <div class="line-label">Estimated Federal Income Tax</div>
      <div class="line-amount">${formatCurrency(s.est_federal_income_tax)}</div>
    </div>

    <div class="line-item">
      <div class="line-label">Estimated State Income Tax</div>
      <div class="line-amount">${formatCurrency(s.est_state_income_tax)}</div>
    </div>

    <div class="line-item total">
      <div class="line-label">Total Estimated Tax</div>
      <div class="line-amount">${formatCurrency(s.est_total_tax)}</div>
    </div>

    <div class="line-item subtotal" style="background: #fef3c7; border-top: 2px solid #fbbf24;">
      <div class="line-label">💡 Suggested Amount to Set Aside</div>
      <div class="line-amount" style="color: #92400e;">${formatCurrency(s.set_aside_suggested)}</div>
    </div>
  </div>

  <!-- DISCLAIMER -->
  <div class="disclaimer">
    <strong>Important Disclaimer:</strong> This Schedule C Summary is generated by GigLedger for informational and planning purposes only. 
    It is NOT a substitute for professional tax preparation or advice. Tax estimates are simplified and may not reflect your actual tax liability. 
    Always consult with a qualified tax professional (CPA or EA) for accurate tax preparation and filing. 
    GigLedger is not responsible for any tax-related decisions made based on this document.
  </div>

  <div class="footer">
    Generated by GigLedger • ${generatedDate} • Not for official IRS filing
  </div>
</body>
</html>
  `.trim();
}

/**
 * Open Schedule C PDF in new window for printing
 */
export function openScheduleCPDF(input: PDFGeneratorInput): void {
  const html = generateScheduleCPDF(input);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  } else {
    alert('Please allow popups to generate the PDF');
  }
}

/**
 * Download Schedule C as HTML file (can be opened and printed later)
 */
export function downloadScheduleCHTML(input: PDFGeneratorInput, taxYear: number): void {
  const html = generateScheduleCPDF(input);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `gigledger_${taxYear}_schedule_c_summary.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
