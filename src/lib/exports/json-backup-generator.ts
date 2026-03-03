import type { TaxExportPackage } from './taxExportPackage';
import { downloadJSON } from './webDownloadHelpers';

/**
 * JSON Backup Generator (from canonical TaxExportPackage)
 * Generates complete data backup in JSON format
 */

export function generateJSONBackup(pkg: TaxExportPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export async function downloadJSONBackup(pkg: TaxExportPackage): Promise<void> {
  const jsonString = generateJSONBackup(pkg);
  await downloadJSON(jsonString, `Bozzy_Backup_${pkg.metadata.taxYear}.json`);
}
