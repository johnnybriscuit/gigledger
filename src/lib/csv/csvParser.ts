/**
 * CSV Parser for Gig Import
 * Handles flexible column mapping, normalization, and validation
 */

export interface ParsedCSVRow {
  [key: string]: string;
}

export interface NormalizedGigRow {
  // Required
  date: string; // YYYY-MM-DD
  payer: string;
  
  // Amount (at least one required)
  gross?: number;
  netTotal?: number;
  
  // Optional
  title?: string;
  venue?: string;
  city?: string;
  state?: string;
  tips?: number;
  fees?: number;
  perDiem?: number;
  otherIncome?: number;
  paymentMethod?: string;
  paid?: boolean;
  taxesWithheld?: number;
  notes?: string;
  
  // Metadata
  rowIndex: number;
  warnings: string[];
  errors: string[];
}

export interface ColumnMapping {
  date?: string;
  payer?: string;
  title?: string;
  venue?: string;
  city?: string;
  state?: string;
  gross?: string;
  netTotal?: string;
  tips?: string;
  fees?: string;
  perDiem?: string;
  otherIncome?: string;
  paymentMethod?: string;
  paid?: string;
  taxesWithheld?: string;
  notes?: string;
}

/**
 * Parse CSV text into rows
 */
export function parseCSV(csvText: string): ParsedCSVRow[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows: ParsedCSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue;
    
    const row: ParsedCSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse a single CSV line (handles quoted fields)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Auto-detect column mappings from headers
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Date synonyms
  const dateIndex = normalizedHeaders.findIndex(h => 
    h === 'date' || h === 'gig date' || h === 'gigdate' || h === 'event date'
  );
  if (dateIndex !== -1) mapping.date = headers[dateIndex];
  
  // Payer synonyms
  const payerIndex = normalizedHeaders.findIndex(h => 
    h === 'payer' || h === 'venue' || h === 'client' || h === 'customer' || h === 'company'
  );
  if (payerIndex !== -1) mapping.payer = headers[payerIndex];
  
  // Title synonyms
  const titleIndex = normalizedHeaders.findIndex(h => 
    h === 'title' || h === 'description' || h === 'event' || h === 'gig title' || h === 'event name'
  );
  if (titleIndex !== -1) mapping.title = headers[titleIndex];
  
  // Venue (separate from payer)
  const venueIndex = normalizedHeaders.findIndex(h => 
    h === 'venue' || h === 'location' || h === 'venue name'
  );
  if (venueIndex !== -1 && venueIndex !== payerIndex) mapping.venue = headers[venueIndex];
  
  // City
  const cityIndex = normalizedHeaders.findIndex(h => h === 'city');
  if (cityIndex !== -1) mapping.city = headers[cityIndex];
  
  // State
  const stateIndex = normalizedHeaders.findIndex(h => h === 'state');
  if (stateIndex !== -1) mapping.state = headers[stateIndex];
  
  // Gross amount
  const grossIndex = normalizedHeaders.findIndex(h => 
    h === 'gross' || h === 'amount' || h === 'total' || h === 'paid' || h === 'payment' || h === 'gross amount'
  );
  if (grossIndex !== -1) mapping.gross = headers[grossIndex];
  
  // Net total
  const netIndex = normalizedHeaders.findIndex(h => 
    h === 'net' || h === 'net total' || h === 'net amount' || h === 'nettotal'
  );
  if (netIndex !== -1) mapping.netTotal = headers[netIndex];
  
  // Tips
  const tipsIndex = normalizedHeaders.findIndex(h => h === 'tips' || h === 'tip');
  if (tipsIndex !== -1) mapping.tips = headers[tipsIndex];
  
  // Fees
  const feesIndex = normalizedHeaders.findIndex(h => h === 'fees' || h === 'fee');
  if (feesIndex !== -1) mapping.fees = headers[feesIndex];
  
  // Per Diem
  const perDiemIndex = normalizedHeaders.findIndex(h => 
    h === 'per diem' || h === 'perdiem' || h === 'per-diem'
  );
  if (perDiemIndex !== -1) mapping.perDiem = headers[perDiemIndex];
  
  // Other Income
  const otherIndex = normalizedHeaders.findIndex(h => 
    h === 'other' || h === 'other income' || h === 'misc' || h === 'miscellaneous'
  );
  if (otherIndex !== -1) mapping.otherIncome = headers[otherIndex];
  
  // Payment Method
  const methodIndex = normalizedHeaders.findIndex(h => 
    h === 'payment method' || h === 'method' || h === 'paymentmethod'
  );
  if (methodIndex !== -1) mapping.paymentMethod = headers[methodIndex];
  
  // Paid status
  const paidIndex = normalizedHeaders.findIndex(h => 
    h === 'paid' || h === 'paid?' || h === 'status'
  );
  if (paidIndex !== -1) mapping.paid = headers[paidIndex];
  
  // Taxes Withheld
  const taxesIndex = normalizedHeaders.findIndex(h => 
    h === 'taxes withheld' || h === 'withholding' || h === 'taxes' || h === 'tax withheld'
  );
  if (taxesIndex !== -1) mapping.taxesWithheld = headers[taxesIndex];
  
  // Notes
  const notesIndex = normalizedHeaders.findIndex(h => 
    h === 'notes' || h === 'memo' || h === 'comments'
  );
  if (notesIndex !== -1) mapping.notes = headers[notesIndex];
  
  return mapping;
}

/**
 * Normalize date to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): { value: string | null; error?: string } {
  if (!dateStr || !dateStr.trim()) {
    return { value: null, error: 'Date is required' };
  }
  
  const cleaned = dateStr.trim();
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return { value: cleaned };
  }
  
  // Try MM/DD/YYYY
  const mmddyyyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    return { value: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
  }
  
  // Try M/D/YY
  const mdyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyy) {
    const [, month, day, year] = mdyy;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return { value: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
  }
  
  return { value: null, error: `Invalid date format: ${cleaned}` };
}

/**
 * Normalize currency amount
 */
export function normalizeAmount(amountStr: string): { value: number | null; error?: string } {
  if (!amountStr || !amountStr.trim()) {
    return { value: null };
  }
  
  // Remove $, commas, spaces
  const cleaned = amountStr.trim().replace(/[$,\s]/g, '');
  
  // Handle negative amounts (in parentheses)
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const numberStr = isNegative ? cleaned.slice(1, -1) : cleaned;
  
  const num = parseFloat(numberStr);
  
  if (isNaN(num)) {
    return { value: null, error: `Invalid amount: ${amountStr}` };
  }
  
  return { value: isNegative ? -num : num };
}

/**
 * Normalize boolean
 */
export function normalizeBoolean(boolStr: string): boolean | null {
  if (!boolStr || !boolStr.trim()) return null;
  
  const cleaned = boolStr.trim().toLowerCase();
  
  if (cleaned === 'yes' || cleaned === 'y' || cleaned === 'true' || cleaned === '1') {
    return true;
  }
  
  if (cleaned === 'no' || cleaned === 'n' || cleaned === 'false' || cleaned === '0') {
    return false;
  }
  
  return null;
}

/**
 * Normalize payment method to enum
 */
export function normalizePaymentMethod(methodStr: string): string | null {
  if (!methodStr || !methodStr.trim()) return null;
  
  const cleaned = methodStr.trim().toLowerCase();
  
  const mapping: { [key: string]: string } = {
    'direct deposit': 'Direct Deposit',
    'directdeposit': 'Direct Deposit',
    'dd': 'Direct Deposit',
    'ach': 'Direct Deposit',
    'cash': 'Cash',
    'venmo': 'Venmo',
    'cashapp': 'Cash App',
    'cash app': 'Cash App',
    'check': 'Check',
    'cheque': 'Check',
    'paypal': 'PayPal',
    'zelle': 'Zelle',
    'other': 'Other',
  };
  
  return mapping[cleaned] || 'Other';
}

/**
 * Normalize state to 2-letter abbreviation
 */
export function normalizeState(stateStr: string): string | null {
  if (!stateStr || !stateStr.trim()) return null;
  
  const cleaned = stateStr.trim().toUpperCase();
  
  // If already 2 letters, return as-is
  if (/^[A-Z]{2}$/.test(cleaned)) return cleaned;
  
  // State name to abbreviation mapping
  const stateMap: { [key: string]: string } = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC',
  };
  
  return stateMap[cleaned] || null;
}

/**
 * Normalize a single row using column mapping
 */
export function normalizeRow(
  row: ParsedCSVRow,
  mapping: ColumnMapping,
  rowIndex: number
): NormalizedGigRow {
  const normalized: NormalizedGigRow = {
    date: '',
    payer: '',
    rowIndex,
    warnings: [],
    errors: [],
  };
  
  // Date (required)
  if (mapping.date && row[mapping.date]) {
    const dateResult = normalizeDate(row[mapping.date]);
    if (dateResult.value) {
      normalized.date = dateResult.value;
    } else if (dateResult.error) {
      normalized.errors.push(dateResult.error);
    }
  } else {
    normalized.errors.push('Date is required');
  }
  
  // Payer (required)
  if (mapping.payer && row[mapping.payer]) {
    normalized.payer = row[mapping.payer].trim();
  } else {
    normalized.errors.push('Payer is required');
  }
  
  // Amount (at least one required)
  let hasAmount = false;
  
  if (mapping.gross && row[mapping.gross]) {
    const grossResult = normalizeAmount(row[mapping.gross]);
    if (grossResult.value !== null) {
      normalized.gross = grossResult.value;
      hasAmount = true;
    } else if (grossResult.error) {
      normalized.errors.push(grossResult.error);
    }
  }
  
  if (mapping.netTotal && row[mapping.netTotal]) {
    const netResult = normalizeAmount(row[mapping.netTotal]);
    if (netResult.value !== null) {
      normalized.netTotal = netResult.value;
      hasAmount = true;
      if (!normalized.gross) {
        normalized.warnings.push('Net Total provided without Gross - will be imported as Gross');
      }
    } else if (netResult.error) {
      normalized.errors.push(netResult.error);
    }
  }
  
  if (!hasAmount) {
    normalized.errors.push('At least one amount (Gross or Net Total) is required');
  }
  
  // Optional fields
  if (mapping.title && row[mapping.title]) {
    normalized.title = row[mapping.title].trim();
  }
  
  if (mapping.venue && row[mapping.venue]) {
    normalized.venue = row[mapping.venue].trim();
  }
  
  if (mapping.city && row[mapping.city]) {
    normalized.city = row[mapping.city].trim();
  }
  
  if (mapping.state && row[mapping.state]) {
    const state = normalizeState(row[mapping.state]);
    if (state) {
      normalized.state = state;
    }
  }
  
  if (mapping.tips && row[mapping.tips]) {
    const tipsResult = normalizeAmount(row[mapping.tips]);
    if (tipsResult.value !== null) {
      normalized.tips = tipsResult.value;
    }
  }
  
  if (mapping.fees && row[mapping.fees]) {
    const feesResult = normalizeAmount(row[mapping.fees]);
    if (feesResult.value !== null) {
      normalized.fees = feesResult.value;
    }
  }
  
  if (mapping.perDiem && row[mapping.perDiem]) {
    const perDiemResult = normalizeAmount(row[mapping.perDiem]);
    if (perDiemResult.value !== null) {
      normalized.perDiem = perDiemResult.value;
    }
  }
  
  if (mapping.otherIncome && row[mapping.otherIncome]) {
    const otherResult = normalizeAmount(row[mapping.otherIncome]);
    if (otherResult.value !== null) {
      normalized.otherIncome = otherResult.value;
    }
  }
  
  if (mapping.paymentMethod && row[mapping.paymentMethod]) {
    const method = normalizePaymentMethod(row[mapping.paymentMethod]);
    if (method) {
      normalized.paymentMethod = method;
    }
  }
  
  if (mapping.paid && row[mapping.paid]) {
    const paid = normalizeBoolean(row[mapping.paid]);
    if (paid !== null) {
      normalized.paid = paid;
    }
  }
  
  if (mapping.taxesWithheld && row[mapping.taxesWithheld]) {
    // Try boolean first (Yes/No, Y/N, true/false, 1/0)
    const boolValue = normalizeBoolean(row[mapping.taxesWithheld]);
    if (boolValue !== null) {
      normalized.taxesWithheld = boolValue ? 1 : 0; // Store as 1/0 for boolean
    } else {
      // Try parsing as numeric amount
      const taxesResult = normalizeAmount(row[mapping.taxesWithheld]);
      if (taxesResult.value !== null && taxesResult.value > 0) {
        normalized.taxesWithheld = taxesResult.value;
        normalized.warnings.push(`Taxes withheld amount $${taxesResult.value.toFixed(2)} detected - storing as boolean true. Note: Current schema only supports boolean, not amount.`);
      }
    }
  }
  
  if (mapping.notes && row[mapping.notes]) {
    normalized.notes = row[mapping.notes].trim();
  }
  
  return normalized;
}

/**
 * Normalize all rows
 */
export function normalizeRows(
  rows: ParsedCSVRow[],
  mapping: ColumnMapping
): NormalizedGigRow[] {
  return rows.map((row, index) => normalizeRow(row, mapping, index + 1));
}
