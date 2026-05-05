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

export function getKhmerMonthDisplayName(monthNumber: number, label?: string) {
  if (monthNumber === 2) return 'ឆមាសទី១';
  return label || getKhmerMonthLabel(monthNumber);
}
