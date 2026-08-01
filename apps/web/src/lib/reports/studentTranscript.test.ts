import {
  calculateTranscriptSubject,
  calculateTranscriptSummary,
  gradePercentage,
} from './studentTranscript';

describe('student transcript calculations', () => {
  test('never invents a second-semester score when it is missing', () => {
    const result = calculateTranscriptSubject({
      subjectId: 'khmer',
      grades: [
        { score: 40, maxScore: 50, monthNumber: 11 },
        { score: 42, maxScore: 50, monthNumber: 1 },
      ],
    });

    expect(result.semester1Score).toBe(41);
    expect(result.semester2Score).toBeNull();
    expect(result.annualScore).toBeNull();
    expect(result.gradeLetter).toBeNull();
    expect(result.result).toBeNull();
    expect(result.isComplete).toBe(false);
  });

  test('does not average incompatible raw-score scales', () => {
    const result = calculateTranscriptSubject({
      subjectId: 'math',
      grades: [
        { score: 40, maxScore: 50, monthNumber: 11 },
        { score: 70, maxScore: 100, monthNumber: 1 },
        { score: 45, maxScore: 50, monthNumber: 4 },
      ],
    });

    expect(result.semester1Score).toBeNull();
    expect(result.annualScore).toBeNull();
  });

  test('calculates annual values only from complete real semester data', () => {
    const result = calculateTranscriptSubject({
      subjectId: 'science',
      grades: [
        { score: 40, maxScore: 50, monthNumber: 11 },
        { score: 30, maxScore: 50, monthNumber: 4 },
      ],
    });

    expect(result.semester1Score).toBe(40);
    expect(result.semester2Score).toBe(30);
    expect(result.annualScore).toBe(35);
    expect(result.annualPercentage).toBe(70);
    expect(result.gradeLetter).toBe('C');
    expect(result.result).toBe('ជាប់');
  });

  test('summary rows remain incomplete when an exam period has no records', () => {
    const summary = calculateTranscriptSummary([
      {
        subjectId: 'khmer',
        grades: [
          { score: 40, maxScore: 50, monthNumber: 3 },
          { score: 35, maxScore: 50, monthNumber: 1 },
        ],
      },
    ]);

    expect(summary.semester1Exam).toBe(40);
    expect(summary.semester2Exam).toBeNull();
    expect(summary.annualExam).toBeNull();
    expect(summary.annualOverall).toBeNull();
  });

  test('uses stored percentage when available and otherwise derives it safely', () => {
    expect(gradePercentage({ score: 10, maxScore: 20, percentage: 72 })).toBe(72);
    expect(gradePercentage({ score: 10, maxScore: 20 })).toBe(50);
    expect(gradePercentage({ score: 10, maxScore: 0 })).toBeNull();
  });
});
