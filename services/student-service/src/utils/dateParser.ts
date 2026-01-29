/**
 * Backend Date Parser
 * Handles various date formats and converts to YYYY-MM-DD
 */

export function parseDate(input: string | number): string {
  // Handle Excel serial number
  if (typeof input === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (input - 2) * 86400000);

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (typeof input !== "string") {
    throw new Error("Date must be string or number");
  }

  const trimmed = input.trim();

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Parse DD/MM/YY or DD/MM/YYYY
  const parts = trimmed.split(/[\/\-\.\s]/);

  if (parts.length !== 3) {
    throw new Error(
      `Invalid date format: ${input}. Expected DD/MM/YY or YYYY-MM-DD`
    );
  }

  let day = parseInt(parts[0]);
  let month = parseInt(parts[1]);
  let year = parseInt(parts[2]);

  // Validate
  if (isNaN(day) || day < 1 || day > 31) {
    throw new Error(`Invalid day: ${parts[0]}`);
  }

  if (isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${parts[1]}`);
  }

  // Handle 2-digit year
  if (year < 100) {
    year += year <= 50 ? 2000 : 1900;
  }

  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new Error(`Invalid year: ${parts[2]}`);
  }

  // Format to YYYY-MM-DD
  const paddedMonth = month.toString().padStart(2, "0");
  const paddedDay = day.toString().padStart(2, "0");

  return `${year}-${paddedMonth}-${paddedDay}`;
}
