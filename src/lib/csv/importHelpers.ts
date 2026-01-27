/**
 * Import Helper Functions
 * Payer matching, duplicate detection, row combining
 */

import { NormalizedGigRow } from './csvParser';

export interface PayerMatch {
  csvName: string;
  existingPayerId?: string;
  existingPayerName?: string;
  confidence: 'exact' | 'fuzzy' | 'none';
  action: 'use_existing' | 'create_new';
}

export interface DuplicateGroup {
  existingGigId?: string;
  importRows: number[]; // Row indices
  key: string; // Date+Payer+Gross+Title
  confidence: 'high' | 'medium';
}

export interface CombinedGig extends NormalizedGigRow {
  combinedFromRows: number[];
  isCombined: boolean;
}

/**
 * Simple fuzzy string matching (Levenshtein distance)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1)
 */
function similarityScore(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Match CSV payers to existing payers
 */
export function matchPayers(
  csvPayers: string[],
  existingPayers: Array<{ id: string; name: string }>
): PayerMatch[] {
  const matches: PayerMatch[] = [];
  
  for (const csvName of csvPayers) {
    const csvNameLower = csvName.toLowerCase().trim();
    
    // Try exact match first (case-insensitive)
    const exactMatch = existingPayers.find(
      p => p.name.toLowerCase().trim() === csvNameLower
    );
    
    if (exactMatch) {
      matches.push({
        csvName,
        existingPayerId: exactMatch.id,
        existingPayerName: exactMatch.name,
        confidence: 'exact',
        action: 'use_existing',
      });
      continue;
    }
    
    // Try fuzzy match (similarity > 0.8)
    let bestMatch: { payer: typeof existingPayers[0]; score: number } | null = null;
    
    for (const payer of existingPayers) {
      const score = similarityScore(csvName, payer.name);
      if (score > 0.8 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { payer, score };
      }
    }
    
    if (bestMatch) {
      matches.push({
        csvName,
        existingPayerId: bestMatch.payer.id,
        existingPayerName: bestMatch.payer.name,
        confidence: 'fuzzy',
        action: 'use_existing',
      });
    } else {
      matches.push({
        csvName,
        confidence: 'none',
        action: 'create_new',
      });
    }
  }
  
  return matches;
}

/**
 * Detect duplicate gigs
 */
export function detectDuplicates(
  normalizedRows: NormalizedGigRow[],
  existingGigs: Array<{
    id: string;
    date: string;
    payer_id: string;
    payer_name: string;
    gross: number;
    title?: string;
  }>
): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = [];
  
  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    if (row.errors.length > 0) continue; // Skip invalid rows
    
    const gross = row.gross || row.netTotal || 0;
    
    // Check against existing gigs
    for (const existing of existingGigs) {
      const dateMatch = existing.date === row.date;
      const payerMatch = existing.payer_name.toLowerCase() === row.payer.toLowerCase();
      const grossMatch = Math.abs(existing.gross - gross) < 0.01;
      
      if (dateMatch && payerMatch && grossMatch) {
        // High confidence duplicate
        const titleMatch = !row.title || !existing.title || 
          existing.title.toLowerCase() === row.title.toLowerCase();
        
        duplicates.push({
          existingGigId: existing.id,
          importRows: [row.rowIndex],
          key: `${row.date}|${row.payer}|${gross}|${row.title || ''}`,
          confidence: titleMatch ? 'high' : 'medium',
        });
        break;
      } else if (dateMatch && payerMatch) {
        // Medium confidence (same date + payer, different amount)
        duplicates.push({
          existingGigId: existing.id,
          importRows: [row.rowIndex],
          key: `${row.date}|${row.payer}`,
          confidence: 'medium',
        });
        break;
      }
    }
  }
  
  return duplicates;
}

/**
 * Combine rows that look like the same gig
 */
export function combineRows(
  normalizedRows: NormalizedGigRow[],
  combineEnabled: boolean
): CombinedGig[] {
  if (!combineEnabled) {
    return normalizedRows.map(row => ({
      ...row,
      combinedFromRows: [row.rowIndex],
      isCombined: false,
    }));
  }
  
  const combined: CombinedGig[] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < normalizedRows.length; i++) {
    if (processed.has(i)) continue;
    
    const row = normalizedRows[i];
    const group: NormalizedGigRow[] = [row];
    processed.add(i);
    
    // Find matching rows
    for (let j = i + 1; j < normalizedRows.length; j++) {
      if (processed.has(j)) continue;
      
      const other = normalizedRows[j];
      
      // Combine key: Date + Payer + Title (or just Date + Payer if no title)
      const sameDate = row.date === other.date;
      const samePayer = row.payer.toLowerCase() === other.payer.toLowerCase();
      const sameTitle = !row.title || !other.title || 
        row.title.toLowerCase() === other.title.toLowerCase();
      
      if (sameDate && samePayer && sameTitle) {
        group.push(other);
        processed.add(j);
      }
    }
    
    if (group.length > 1) {
      // Combine the group
      const combinedRow: CombinedGig = {
        ...row,
        gross: group.reduce((sum, r) => sum + (r.gross || 0), 0),
        tips: group.reduce((sum, r) => sum + (r.tips || 0), 0),
        fees: group.reduce((sum, r) => sum + (r.fees || 0), 0),
        perDiem: group.reduce((sum, r) => sum + (r.perDiem || 0), 0),
        otherIncome: group.reduce((sum, r) => sum + (r.otherIncome || 0), 0),
        taxesWithheld: group.reduce((sum, r) => sum + (r.taxesWithheld || 0), 0),
        notes: group.map(r => r.notes).filter(Boolean).join(' | '),
        combinedFromRows: group.map(r => r.rowIndex),
        isCombined: true,
        warnings: [
          ...row.warnings,
          `Combined from ${group.length} rows: ${group.map(r => r.rowIndex).join(', ')}`,
        ],
      };
      
      combined.push(combinedRow);
    } else {
      combined.push({
        ...row,
        combinedFromRows: [row.rowIndex],
        isCombined: false,
      });
    }
  }
  
  return combined;
}

/**
 * Get unique payer names from normalized rows
 */
export function getUniquePayers(rows: NormalizedGigRow[]): string[] {
  const payers = new Set<string>();
  
  for (const row of rows) {
    if (row.payer && row.errors.length === 0) {
      payers.add(row.payer);
    }
  }
  
  return Array.from(payers).sort();
}

/**
 * Calculate import summary statistics
 */
export function calculateImportSummary(rows: NormalizedGigRow[] | CombinedGig[]) {
  const validRows = rows.filter(r => r.errors.length === 0);
  
  return {
    totalRows: rows.length,
    validRows: validRows.length,
    errorRows: rows.length - validRows.length,
    totalGross: validRows.reduce((sum, r) => sum + (r.gross || r.netTotal || 0), 0),
    totalTips: validRows.reduce((sum, r) => sum + (r.tips || 0), 0),
    totalFees: validRows.reduce((sum, r) => sum + (r.fees || 0), 0),
    totalPerDiem: validRows.reduce((sum, r) => sum + (r.perDiem || 0), 0),
    totalOtherIncome: validRows.reduce((sum, r) => sum + (r.otherIncome || 0), 0),
    totalTaxesWithheld: validRows.reduce((sum, r) => sum + (r.taxesWithheld || 0), 0),
  };
}
