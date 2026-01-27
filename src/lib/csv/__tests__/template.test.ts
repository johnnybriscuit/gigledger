/**
 * Template CSV validation tests
 * Ensures the downloadable template is always valid
 */

import fs from 'fs';
import path from 'path';

describe('CSV Template Validation', () => {
  const templatePath = path.join(__dirname, '../../../../public/templates/gig-import-template.csv');
  let templateContent: string;

  beforeAll(() => {
    templateContent = fs.readFileSync(templatePath, 'utf-8');
  });

  test('template file exists', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  test('template must NOT contain ellipses', () => {
    expect(templateContent).not.toContain('...');
  });

  test('template must have exactly 4 lines (header + 3 rows)', () => {
    const lines = templateContent.trim().split('\n');
    expect(lines.length).toBe(4);
  });

  test('each row must have exactly 15 columns', () => {
    const lines = templateContent.trim().split('\n');
    
    lines.forEach((line, index) => {
      const columns = line.split(',');
      expect(columns.length).toBe(15);
    });
  });

  test('header must contain required columns', () => {
    const lines = templateContent.trim().split('\n');
    const header = lines[0];
    
    const requiredColumns = [
      'Date',
      'Payer',
      'Title',
      'Venue',
      'City',
      'State',
      'Gross',
      'Tips',
      'Fees',
      'PerDiem',
      'OtherIncome',
      'PaymentMethod',
      'Paid',
      'TaxesWithheld',
      'Notes'
    ];

    requiredColumns.forEach(col => {
      expect(header).toContain(col);
    });
  });

  test('TaxesWithheld values must be Yes/No only (no numeric amounts)', () => {
    const lines = templateContent.trim().split('\n');
    
    // Skip header, check data rows
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      const taxesWithheldValue = columns[13]; // TaxesWithheld is column 14 (index 13)
      
      // Must be Yes, No, or empty
      expect(['Yes', 'No', '']).toContain(taxesWithheldValue);
      
      // Must NOT be a number
      expect(isNaN(Number(taxesWithheldValue)) || taxesWithheldValue === '').toBe(true);
    }
  });

  test('template must not have truncated city names', () => {
    const lines = templateContent.trim().split('\n');
    
    // Check that cities are complete (no truncation patterns)
    lines.slice(1).forEach(line => {
      const columns = line.split(',');
      const city = columns[4]; // City is column 5 (index 4)
      
      // Should not end with truncation patterns
      expect(city).not.toMatch(/\.\.\.$/);
      expect(city).not.toMatch(/\.\.\./);
    });
  });

  test('template must have valid date formats', () => {
    const lines = templateContent.trim().split('\n');
    
    // Skip header, check data rows
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      const dateValue = columns[0]; // Date is first column
      
      // Should match one of the supported formats
      const dateFormats = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
        /^\d{1,2}\/\d{1,2}\/\d{2}$/ // M/D/YY
      ];
      
      const matchesFormat = dateFormats.some(format => format.test(dateValue));
      expect(matchesFormat).toBe(true);
    }
  });
});
