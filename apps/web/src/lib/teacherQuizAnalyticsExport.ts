import type { TeacherQuizAnalyticsData } from '@/lib/api/teacherQuizzes';

function csvEscape(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function row(values: Array<string | number>): string {
  return values.map(csvEscape).join(',');
}

export function downloadTeacherQuizAnalyticsCsv(
  data: TeacherQuizAnalyticsData,
  filenamePrefix = 'quiz-analytics',
) {
  const lines: string[] = [];

  lines.push(row(['Metric', 'Value']));
  lines.push(row(['Period', data.period]));
  if (data.classId) {
    const className = data.classes.find((item) => item.id === data.classId)?.name ?? data.classId;
    lines.push(row(['Class', className]));
  }
  lines.push(row(['Quizzes published', data.overview.totalQuizzes]));
  lines.push(row(['Total attempts', data.overview.totalAttempts]));
  lines.push(row(['Unique learners', data.overview.uniqueStudents]));
  lines.push(row(['Pass rate %', data.overview.passRate]));
  lines.push(row(['Average score %', data.overview.averageScore]));
  lines.push('');

  lines.push(row(['Quiz', 'Attempts', 'Learners', 'Avg score %', 'Pass rate %']));
  for (const quiz of data.quizzes) {
    lines.push(
      row([quiz.title, quiz.attemptCount, quiz.uniqueStudents, quiz.averageScore, quiz.passRate]),
    );
  }
  lines.push('');

  lines.push(row(['Date', 'Attempts', 'Passed']));
  for (const point of data.attemptsOverTime) {
    lines.push(row([point.date, point.attempts, point.passed]));
  }
  lines.push('');

  lines.push(row(['Learner', 'Quiz', 'Score %', 'Passed', 'Submitted at']));
  for (const attempt of data.recentAttempts) {
    lines.push(
      row([
        attempt.userName || 'Learner',
        attempt.quizTitle,
        attempt.score,
        attempt.passed ? 'Yes' : 'No',
        attempt.submittedAt,
      ]),
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${data.period}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
