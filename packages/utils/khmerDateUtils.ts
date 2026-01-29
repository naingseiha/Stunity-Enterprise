/**
 * Khmer Date Utilities
 * Helper functions for Khmer date formatting
 */

// Khmer numerals mapping
const khmerNumerals = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];

// Khmer month names
const khmerMonths = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

/**
 * Convert Arabic numerals to Khmer numerals
 * @param num - Number to convert
 * @returns Khmer numeral string
 */
export function toKhmerNumeral(num: number): string {
  return num
    .toString()
    .split("")
    .map((digit) => khmerNumerals[parseInt(digit)])
    .join("");
}

/**
 * Get current Khmer month name
 * @returns Current month in Khmer
 */
export function getCurrentKhmerMonth(): string {
  const monthIndex = new Date().getMonth();
  return khmerMonths[monthIndex];
}

/**
 * Format date to Khmer format
 * Example: "ថ្ងៃទី០៨ ខែធ្នូ ឆ្នាំ២០២៥"
 * @param date - Date object to format
 * @param locationName - Optional location/school name (e.g., "ស្វាយធំ")
 * @returns Formatted Khmer date string
 */
export function formatKhmerDate(
  date: Date = new Date(),
  locationName?: string
): string {
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  const khmerDay = toKhmerNumeral(day).padStart(2, "០");
  const khmerMonth = khmerMonths[monthIndex];
  const khmerYear = toKhmerNumeral(year);

  if (locationName) {
    return `${locationName} ថ្ងៃទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear}`;
  }

  return `ថ្ងៃទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear}`;
}

/**
 * Format date for report footer
 * Example: "ស្វាយធំ ថ្ងៃទី០៨ ខែធ្នូ ឆ្នាំ២០២៥"
 * @param schoolName - School/location name
 * @param customDate - Optional custom date (defaults to today)
 * @returns Formatted string for report footer
 */
export function formatReportDate(
  schoolName: string = "ស្វាយធំ",
  customDate?: Date
): string {
  return formatKhmerDate(customDate || new Date(), schoolName);
}
