// CSV Import utilities for bulk data upload

export interface CSVParseResult<T> {
  data: T[];
  errors: string[];
}

// Parse CSV text into rows
export function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n').filter(line => line.trim());
  return lines.map(line => {
    // Simple CSV parser (handles quoted fields)
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  });
}

// Parse gigs from CSV
export function parseGigsCSV(csvText: string, payerMap: Map<string, string>): CSVParseResult<any> {
  const rows = parseCSV(csvText);
  const data: any[] = [];
  const errors: string[] = [];
  
  // Expected columns: Date, Payer, Title, Location, City, State, Gross, Tips, Fees, Per Diem, Other Income, Payment Method, Paid, Taxes Withheld, Notes
  const headers = rows[0].map(h => h.toLowerCase().trim());
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue; // Skip empty rows
    
    try {
      const payerName = row[headers.indexOf('payer')]?.trim();
      const payerId = payerMap.get(payerName);
      
      if (!payerId) {
        errors.push(`Row ${i + 1}: Payer "${payerName}" not found. Please create payer first.`);
        continue;
      }
      
      const gig = {
        payer_id: payerId,
        date: row[headers.indexOf('date')]?.trim() || new Date().toISOString().split('T')[0],
        title: row[headers.indexOf('title')]?.trim() || '',
        location: row[headers.indexOf('location')]?.trim() || undefined,
        city: row[headers.indexOf('city')]?.trim() || undefined,
        state: row[headers.indexOf('state')]?.trim() || undefined,
        gross_amount: parseFloat(row[headers.indexOf('gross')]?.replace(/[$,]/g, '') || '0') || 0,
        tips: parseFloat(row[headers.indexOf('tips')]?.replace(/[$,]/g, '') || '0') || 0,
        fees: parseFloat(row[headers.indexOf('fees')]?.replace(/[$,]/g, '') || '0') || 0,
        per_diem: parseFloat(row[headers.indexOf('per diem')]?.replace(/[$,]/g, '') || '0') || 0,
        other_income: parseFloat(row[headers.indexOf('other income')]?.replace(/[$,]/g, '') || '0') || 0,
        payment_method: row[headers.indexOf('payment method')]?.trim() || undefined,
        paid: row[headers.indexOf('paid')]?.toLowerCase() === 'yes' || row[headers.indexOf('paid')]?.toLowerCase() === 'true',
        taxes_withheld: row[headers.indexOf('taxes withheld')]?.toLowerCase() === 'yes' || row[headers.indexOf('taxes withheld')]?.toLowerCase() === 'true',
        notes: row[headers.indexOf('notes')]?.trim() || undefined,
      };
      
      data.push(gig);
    } catch (error: any) {
      errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }
  
  return { data, errors };
}

// Parse expenses from CSV
export function parseExpensesCSV(csvText: string): CSVParseResult<any> {
  const rows = parseCSV(csvText);
  const data: any[] = [];
  const errors: string[] = [];
  
  // Expected columns: Date, Category, Description, Amount, Vendor, Notes
  const headers = rows[0].map(h => h.toLowerCase().trim());
  
  const validCategories = ['Travel', 'Meals', 'Lodging', 'Supplies', 'Marketing', 'Education', 'Software', 'Fees', 'Equipment', 'Other'];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;
    
    try {
      const category = row[headers.indexOf('category')]?.trim();
      if (!validCategories.includes(category)) {
        errors.push(`Row ${i + 1}: Invalid category "${category}". Must be one of: ${validCategories.join(', ')}`);
        continue;
      }
      
      const expense = {
        date: row[headers.indexOf('date')]?.trim() || new Date().toISOString().split('T')[0],
        category: category as any,
        description: row[headers.indexOf('description')]?.trim() || '',
        amount: parseFloat(row[headers.indexOf('amount')]?.replace(/[$,]/g, '') || '0') || 0,
        vendor: row[headers.indexOf('vendor')]?.trim() || undefined,
        notes: row[headers.indexOf('notes')]?.trim() || undefined,
      };
      
      data.push(expense);
    } catch (error: any) {
      errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }
  
  return { data, errors };
}

// Parse mileage from CSV
export function parseMileageCSV(csvText: string): CSVParseResult<any> {
  const rows = parseCSV(csvText);
  const data: any[] = [];
  const errors: string[] = [];
  
  // Expected columns: Date, Purpose, Start Location, End Location, Miles, Notes
  const headers = rows[0].map(h => h.toLowerCase().trim());
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 4) continue;
    
    try {
      const mileage = {
        date: row[headers.indexOf('date')]?.trim() || new Date().toISOString().split('T')[0],
        purpose: row[headers.indexOf('purpose')]?.trim() || '',
        start_location: row[headers.indexOf('start location')]?.trim() || '',
        end_location: row[headers.indexOf('end location')]?.trim() || '',
        miles: parseFloat(row[headers.indexOf('miles')]?.replace(/,/g, '') || '0') || 0,
        notes: row[headers.indexOf('notes')]?.trim() || undefined,
      };
      
      data.push(mileage);
    } catch (error: any) {
      errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }
  
  return { data, errors };
}

// Generate CSV template for download
export function generateGigsTemplate(): string {
  return 'Date,Payer,Title,Location,City,State,Gross,Tips,Fees,Per Diem,Other Income,Payment Method,Paid,Taxes Withheld,Notes\n2024-01-15,Venue Name,Concert Title,123 Main St,Cincinnati,OH,500,50,25,0,0,Direct Deposit,Yes,No,Great show';
}

export function generateExpensesTemplate(): string {
  return 'Date,Category,Description,Amount,Vendor,Notes\n2024-01-15,Travel,Gas for tour,45.50,Shell,Filled up before gig';
}

export function generateMileageTemplate(): string {
  return 'Date,Purpose,Start Location,End Location,Miles,Notes\n2024-01-15,Drive to gig,Cincinnati OH,Columbus OH,107.5,Round trip';
}
