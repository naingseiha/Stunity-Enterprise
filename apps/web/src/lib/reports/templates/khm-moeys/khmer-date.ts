const khmerNumerals = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

const khmerMonths = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

export function toKhmerNumeral(num: number): string {
  return num
    .toString()
    .split('')
    .map((digit) => khmerNumerals[parseInt(digit, 10)])
    .join('');
}

export function formatKhmerDate(date: Date = new Date(), locationName?: string): string {
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  const khmerDay = toKhmerNumeral(day).padStart(2, '០');
  const khmerMonth = khmerMonths[monthIndex];
  const khmerYear = toKhmerNumeral(year);

  if (locationName) {
    return `${locationName} ថ្ងៃទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear}`;
  }

  return `ថ្ងៃទី${khmerDay} ខែ${khmerMonth} ឆ្នាំ${khmerYear}`;
}

export function formatReportDate(schoolName = 'ស្វាយធំ', customDate?: Date): string {
  return formatKhmerDate(customDate || new Date(), schoolName);
}
