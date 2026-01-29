/**
 * Date Parser Utility
 * Handles Khmer date formats (DD/MM/YY) and converts to ISO (YYYY-MM-DD)
 */

/**
 * Parse Khmer date format (DD/MM/YY or DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 *
 * Supported formats:
 * - 7/5/12 → 2012-05-07
 * - 20/2/13 → 2013-02-20
 * - 25/11/2013 → 2013-11-25
 * - 2012-05-07 → 2012-05-07 (already ISO)
 */
export function parseKhmerDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") {
    throw new Error("Date is required");
  }

  const trimmed = dateStr.trim();

  // If already in ISO format (YYYY-MM-DD), return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Parse DD/MM/YY or DD/MM/YYYY format
  const parts = trimmed.split(/[\/\-\. ]/); // Support /, -, . separators

  if (parts.length !== 3) {
    throw new Error(
      `Invalid date format: ${dateStr}. Expected DD/MM/YY or DD/MM/YYYY`
    );
  }

  let day = parseInt(parts[0]);
  let month = parseInt(parts[1]);
  let year = parseInt(parts[2]);

  // Validate day
  if (isNaN(day) || day < 1 || day > 31) {
    throw new Error(`Invalid day: ${parts[0]}`);
  }

  // Validate month
  if (isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${parts[1]}`);
  }

  // Handle 2-digit year (YY → YYYY)
  if (year < 100) {
    // Assume years 00-50 are 2000-2050, years 51-99 are 1951-1999
    if (year <= 50) {
      year += 2000;
    } else {
      year += 1900;
    }
  }

  // Validate year
  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new Error(`Invalid year: ${parts[2]}`);
  }

  // Format to YYYY-MM-DD
  const paddedMonth = month.toString().padStart(2, "0");
  const paddedDay = day.toString().padStart(2, "0");

  return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Format ISO date (YYYY-MM-DD) to Khmer display format (DD/MM/YYYY)
 */
export function formatToKhmerDate(isoDate: string): string {
  if (!isoDate) return "";

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Parse Excel serial date number to ISO date string
 * Excel stores dates as number of days since 1900-01-01
 */
export function parseExcelDate(serialNumber: number): string {
  if (typeof serialNumber !== "number") {
    throw new Error("Excel date must be a number");
  }

  // Excel epoch: January 1, 1900
  const excelEpoch = new Date(1900, 0, 1);

  // Excel incorrectly treats 1900 as a leap year, so subtract 2 days
  const date = new Date(excelEpoch.getTime() + (serialNumber - 2) * 86400000);

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Smart date parser - handles multiple formats
 */
export function parseDate(input: string | number): string {
  // Handle Excel serial number
  if (typeof input === "number") {
    return parseExcelDate(input);
  }

  // Handle string dates
  if (typeof input === "string") {
    return parseKhmerDate(input);
  }

  throw new Error("Invalid date input");
}
