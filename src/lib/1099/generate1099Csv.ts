/**
 * Generate CSV export for 1099-NEC preparation
 * CPA-friendly format with all subcontractor details
 */

import type { Subcontractor1099Total } from '../../hooks/use1099Totals';

/**
 * Generate CSV for all subcontractors with 1099 totals
 */
export function generate1099Csv(subcontractors: Subcontractor1099Total[], taxYear: number): string {
  const headers = [
    'Subcontractor ID',
    'Name',
    'Legal Name',
    'Email',
    'E-Delivery Email',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Postal Code',
    'Country',
    'TIN Type',
    'TIN Last 4',
    'W-9 Status',
    'E-Delivery Consent',
    'Tax Year',
    'Gig Count',
    'Total Paid',
    'Requires 1099',
    'Last Email Sent',
  ];

  const rows = subcontractors.map(sub => [
    sub.subcontractor_id,
    sub.name,
    sub.legal_name || '',
    sub.email || '',
    sub.edelivery_email || '',
    sub.address_line1 || '',
    sub.address_line2 || '',
    sub.city || '',
    sub.state || '',
    sub.postal_code || '',
    sub.country || 'US',
    sub.tax_id_type || '',
    sub.tax_id_last4 || '',
    sub.w9_status,
    sub.edelivery_consent ? 'Yes' : 'No',
    taxYear.toString(),
    sub.gig_count.toString(),
    sub.total_paid.toFixed(2),
    sub.requires_1099 ? 'Yes' : 'No',
    sub.last_1099_email_sent_at ? new Date(sub.last_1099_email_sent_at).toLocaleDateString() : '',
  ]);

  // Escape CSV fields
  const escapeCsvField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvLines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map(row => row.map(escapeCsvField).join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Download CSV file
 */
export function download1099Csv(subcontractors: Subcontractor1099Total[], taxYear: number): void {
  const csv = generate1099Csv(subcontractors, taxYear);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `1099_Subcontractors_${taxYear}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Generate CSV for subcontractors requiring 1099 only (>= $600)
 */
export function generate1099RequiredCsv(subcontractors: Subcontractor1099Total[], taxYear: number): string {
  const filtered = subcontractors.filter(sub => sub.requires_1099);
  return generate1099Csv(filtered, taxYear);
}

/**
 * Download CSV for subcontractors requiring 1099 only
 */
export function download1099RequiredCsv(subcontractors: Subcontractor1099Total[], taxYear: number): void {
  const csv = generate1099RequiredCsv(subcontractors, taxYear);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `1099_Required_${taxYear}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
}
