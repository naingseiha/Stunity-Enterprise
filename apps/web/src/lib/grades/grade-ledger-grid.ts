export function gradeCellKey(studentId: string, subjectId: string) {
  return `${studentId}:${subjectId}`;
}

export function resolveAcademicCalendarYear(
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
  monthNumber: number,
) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return new Date().getFullYear();
  }

  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) {
    const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
    if (monthEnd >= start && monthStart <= end) return year;
  }

  return start.getUTCFullYear();
}

export function parseScoreValue(value: string, maxScore: number) {
  const trimmed = value.trim();
  if (!trimmed) return { score: null, error: null };

  const score = Number(trimmed);
  if (!Number.isFinite(score)) {
    return { score: null, error: 'សូមបញ្ចូលជាលេខ' };
  }
  if (score < 0 || score > maxScore) {
    return { score, error: `ពិន្ទុត្រូវស្ថិតនៅចន្លោះ 0–${maxScore}` };
  }
  return { score, error: null };
}

export function parseTabularClipboard(value: string) {
  return value
    .replace(/\r/g, '')
    .split('\n')
    .filter((row, index, rows) => row.length > 0 || index < rows.length - 1)
    .map((row) => row.split('\t'));
}
