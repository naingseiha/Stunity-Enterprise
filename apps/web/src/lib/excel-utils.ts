import * as XLSX from 'xlsx';
import { type FieldConfig } from './fieldConfigs';

/**
 * Generates an Excel template matching the current field configuration
 */
export function downloadExcelTemplate(fields: FieldConfig[], fileName: string = 'student_import_template.xlsx', tDynamic?: (key: string) => string) {
  // Extract headers
  const headers = fields.map((f) => tDynamic ? tDynamic(f.key) : f.label);
  
  // Create a worksheet with headers
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  
  // Add some simple column widths
  const colWidths = headers.map(header => ({ wch: Math.max(15, header.length + 5) }));
  worksheet['!cols'] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  // Download
  XLSX.writeFile(workbook, fileName);
}

/**
 * Parses tab-separated text (pasted from Excel) into an array of row objects
 */
export function parsePastedExcelData(pastedText: string, fields: FieldConfig[]): Record<string, string>[] {
  const rows = pastedText.split('\n').filter(row => row.trim().length > 0);
  const data: Record<string, string>[] = [];

  for (const row of rows) {
    const cells = row.split('\t');
    const rowData: Record<string, string> = {};
    
    // Map each cell to the corresponding field key based on column order
    for (let i = 0; i < Math.min(cells.length, fields.length); i++) {
      const field = fields[i];
      if (field) {
        // Clean up Excel quotes and trailing whitespace
        let cellValue = cells[i].trim();
        if (cellValue.startsWith('"') && cellValue.endsWith('"')) {
          cellValue = cellValue.substring(1, cellValue.length - 1);
        }
        rowData[field.key] = cellValue;
      }
    }
    
    if (Object.keys(rowData).length > 0) {
      data.push(rowData);
    }
  }

  return data;
}
