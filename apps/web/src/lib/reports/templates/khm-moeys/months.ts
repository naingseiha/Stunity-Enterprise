/** Khmer academic months (Nov–Aug style ordering in UI pickers) */
export const KHMER_MONTHS = [
  { number: 11, label: 'វិច្ឆិកា' },
  { number: 12, label: 'ធ្នូ' },
  { number: 1, label: 'មករា' },
  { number: 2, label: 'កុម្ភៈ' },
  { number: 3, label: 'មីនា' },
  { number: 4, label: 'មេសា' },
  { number: 5, label: 'ឧសភា' },
  { number: 6, label: 'មិថុនា' },
  { number: 7, label: 'កក្កដា' },
  { number: 8, label: 'សីហា' },
] as const;

export function getKhmerMonthLabel(monthNumber: number) {
  const month = KHMER_MONTHS.find((entry) => entry.number === monthNumber);
  return month?.label || `Month ${monthNumber}`;
}

export function getKhmerMonthDisplayName(monthNumber: number, label?: string, isExamMonth?: boolean, termNumber?: number) {
  if (isExamMonth && termNumber) return `ឆមាសទី${toKhmerDigits(termNumber)}`;
  if (monthNumber === 2 && !isExamMonth) return label || getKhmerMonthLabel(monthNumber); // don't hardcode ឆមាសទី១
  return label || getKhmerMonthLabel(monthNumber);
}

function toKhmerDigits(num: number | string | undefined | null) {
  if (!num) return "";
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(num).replace(/[0-9]/g, (d) => khmerDigits[parseInt(d)]);
}
