/**
 * Batch Import Service
 * Handles creating payers, importing gigs in bulk, and tracking batches
 */

import { supabase } from '../supabase';
import { CombinedGig } from './importHelpers';
import { PayerMatch } from './importHelpers';

export interface ImportRowResult {
  rowIndex: number;
  status: 'imported' | 'skipped_duplicate' | 'error';
  gigId?: string;
  error?: string;
}

export interface BatchImportResult {
  batchId: string;
  imported: ImportRowResult[];
  skippedDuplicates: ImportRowResult[];
  errors: ImportRowResult[];
  newPayersCreated: string[];
  summary: {
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    totalGross: number;
    totalTips: number;
    totalFees: number;
  };
}

/**
 * Create missing payers from CSV import
 */
export async function createMissingPayers(
  payerMatches: PayerMatch[],
  userId: string,
  batchId: string
): Promise<Map<string, string>> {
  const payerIdMap = new Map<string, string>();
  const newPayersCreated: string[] = [];

  for (const match of payerMatches) {
    if (match.action === 'use_existing' && match.existingPayerId) {
      // Use existing payer
      payerIdMap.set(match.csvName, match.existingPayerId);
    } else if (match.action === 'create_new') {
      // Create new payer with default type and batch tracking
      const { data, error } = await supabase
        .from('payers')
        .insert({
          name: match.csvName,
          payer_type: 'Venue', // Default type for CSV imports
          created_by_import_batch_id: batchId, // Track which batch created this payer
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create payer "${match.csvName}": ${error.message}`);
      }

      if (data) {
        payerIdMap.set(match.csvName, data.id);
        newPayersCreated.push(data.id);
      }
    }
  }

  return payerIdMap;
}

/**
 * Check if a gig is a duplicate
 */
async function isDuplicate(
  row: CombinedGig,
  payerId: string,
  userId: string
): Promise<boolean> {
  const gross = row.gross || row.netTotal || 0;

  // Query for potential duplicates: same date + payer + gross
  const { data, error } = await supabase
    .from('gigs')
    .select('id, title')
    .eq('user_id', userId)
    .eq('payer_id', payerId)
    .eq('date', row.date)
    .eq('gross_amount', gross);

  if (error || !data) return false;

  // If we have a title, check title match too
  if (row.title && data.length > 0) {
    return data.some(g => !g.title || g.title.toLowerCase() === row.title!.toLowerCase());
  }

  return data.length > 0;
}

/**
 * Import a single gig row
 */
async function importGigRow(
  row: CombinedGig,
  payerIdMap: Map<string, string>,
  userId: string,
  batchId: string,
  skipDuplicates: boolean
): Promise<ImportRowResult> {
  // Validate row
  if (row.errors.length > 0) {
    return {
      rowIndex: row.rowIndex,
      status: 'error',
      error: row.errors.join(', '),
    };
  }

  // Get payer ID
  const payerId = payerIdMap.get(row.payer);
  if (!payerId) {
    return {
      rowIndex: row.rowIndex,
      status: 'error',
      error: `Payer "${row.payer}" not found`,
    };
  }

  // Check for duplicates
  if (skipDuplicates) {
    const isDup = await isDuplicate(row, payerId, userId);
    if (isDup) {
      return {
        rowIndex: row.rowIndex,
        status: 'skipped_duplicate',
      };
    }
  }

  // Prepare gig data
  const gross = row.gross || row.netTotal || 0;
  
  // Build notes with warnings
  let notes = row.notes || '';
  if (row.netTotal && !row.gross) {
    notes = notes ? `${notes}\n[Imported from Net Total column]` : '[Imported from Net Total column]';
  }
  if (row.isCombined) {
    notes = notes ? `${notes}\n[Combined from rows: ${row.combinedFromRows.join(', ')}]` : `[Combined from rows: ${row.combinedFromRows.join(', ')}]`;
  }

  // Insert gig (user_id is handled by RLS/trigger)
  const { data, error } = await supabase
    .from('gigs')
    .insert({
      payer_id: payerId,
      date: row.date,
      title: row.title || null,
      location: row.venue || null,
      city: row.city || null,
      state: row.state || null,
      gross_amount: gross,
      tips: row.tips || 0,
      fees: row.fees || 0,
      per_diem: row.perDiem || 0,
      other_income: row.otherIncome || 0,
      payment_method: row.paymentMethod || null,
      paid: row.paid || false,
      notes: notes || null,
      import_batch_id: batchId,
    })
    .select('id')
    .single();

  if (error) {
    return {
      rowIndex: row.rowIndex,
      status: 'error',
      error: error.message,
    };
  }

  return {
    rowIndex: row.rowIndex,
    status: 'imported',
    gigId: data.id,
  };
}

/**
 * Batch import gigs from CSV
 */
export async function batchImportGigs(
  rows: CombinedGig[],
  payerMatches: PayerMatch[],
  userId: string,
  fileName?: string,
  skipDuplicates: boolean = true
): Promise<BatchImportResult> {
  // Create batch record (user_id handled by RLS)
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({
      file_name: fileName || 'import.csv',
      total_rows: rows.length,
      combined_rows: rows.some(r => r.isCombined),
    })
    .select('id')
    .single();

  if (batchError || !batch) {
    throw new Error(`Failed to create import batch: ${batchError?.message}`);
  }

  const batchId = batch.id;

  try {
    // Step 1: Create missing payers (with batch tracking for safe undo)
    const payerIdMap = await createMissingPayers(payerMatches, userId, batchId);
    const newPayersCreated = Array.from(payerIdMap.values()).filter(id =>
      payerMatches.some(m => m.action === 'create_new' && payerIdMap.get(m.csvName) === id)
    );

    // Step 2: Import gigs
    const results: ImportRowResult[] = [];
    
    for (const row of rows) {
      const result = await importGigRow(row, payerIdMap, userId, batchId, skipDuplicates);
      results.push(result);
    }

    // Step 3: Calculate summary
    const imported = results.filter(r => r.status === 'imported');
    const skippedDuplicates = results.filter(r => r.status === 'skipped_duplicate');
    const errors = results.filter(r => r.status === 'error');

    const importedRows = rows.filter(r => 
      imported.some(i => i.rowIndex === r.rowIndex)
    );

    const summary = {
      totalRows: rows.length,
      importedCount: imported.length,
      skippedCount: skippedDuplicates.length,
      errorCount: errors.length,
      totalGross: importedRows.reduce((sum, r) => sum + (r.gross || r.netTotal || 0), 0),
      totalTips: importedRows.reduce((sum, r) => sum + (r.tips || 0), 0),
      totalFees: importedRows.reduce((sum, r) => sum + (r.fees || 0), 0),
    };

    // Step 4: Update batch record with results
    await supabase
      .from('import_batches')
      .update({
        imported_count: summary.importedCount,
        skipped_duplicates: summary.skippedCount,
        error_count: summary.errorCount,
        total_gross: summary.totalGross,
        total_tips: summary.totalTips,
        total_fees: summary.totalFees,
        new_payers_created: newPayersCreated.length,
      })
      .eq('id', batchId);

    return {
      batchId,
      imported,
      skippedDuplicates,
      errors,
      newPayersCreated,
      summary,
    };
  } catch (error: any) {
    // Clean up batch on error
    await supabase.from('import_batches').delete().eq('id', batchId);
    throw error;
  }
}

/**
 * Undo last import by batch ID
 * SAFE: Only deletes payers that were created by this specific import batch
 */
export async function undoImport(batchId: string, userId: string): Promise<{
  deletedGigs: number;
  deletedPayers: number;
}> {
  // Get all gigs in this batch (RLS filters by user)
  const { data: gigs, error: gigsError } = await supabase
    .from('gigs')
    .select('id')
    .eq('import_batch_id', batchId);

  if (gigsError) {
    throw new Error(`Failed to fetch gigs for batch: ${gigsError.message}`);
  }

  if (!gigs || gigs.length === 0) {
    return { deletedGigs: 0, deletedPayers: 0 };
  }

  // Delete gigs (RLS filters by user)
  const { error: deleteError } = await supabase
    .from('gigs')
    .delete()
    .eq('import_batch_id', batchId);

  if (deleteError) {
    throw new Error(`Failed to delete gigs: ${deleteError.message}`);
  }

  // SAFE UNDO: Only delete payers that were created by THIS batch AND have no remaining gigs
  // This prevents deleting pre-existing payers
  const { data: payersToDelete, error: payersError } = await supabase
    .from('payers')
    .select('id')
    .eq('created_by_import_batch_id', batchId);

  let deletedPayersCount = 0;
  if (!payersError && payersToDelete) {
    for (const payer of payersToDelete) {
      // Double-check this payer has no gigs before deleting
      const { count, error: countError } = await supabase
        .from('gigs')
        .select('id', { count: 'exact', head: true })
        .eq('payer_id', payer.id);

      if (!countError && count === 0) {
        // Safe to delete: created by this batch AND has no gigs
        const { error: deletePayerError } = await supabase
          .from('payers')
          .delete()
          .eq('id', payer.id);

        if (!deletePayerError) {
          deletedPayersCount++;
        }
      }
    }
  }

  // Delete batch record (RLS filters by user)
  await supabase
    .from('import_batches')
    .delete()
    .eq('id', batchId);

  return {
    deletedGigs: gigs.length,
    deletedPayers: deletedPayersCount,
  };
}

/**
 * Get last import batch for user
 */
export async function getLastImportBatch() {
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
