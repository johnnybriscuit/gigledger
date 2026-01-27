export function stringifyCsv(rows: Array<Record<string, any>>): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const lines: string[] = [];
  lines.push(headers.join(','));

  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }

  return lines.join('\n');
}

function escape(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
