import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReportStatistics,
  rankCompleteRows,
} from "./report-completeness";

const rows = [
  { studentId: "a", studentName: "A", gender: "FEMALE", average: 42, isComplete: true },
  { studentId: "b", studentName: "B", gender: "MALE", average: 18, isComplete: true },
  { studentId: "c", studentName: "C", gender: "FEMALE", average: 0, isComplete: false },
];

test("incomplete students are not counted as failed", () => {
  assert.deepEqual(buildReportStatistics(rows, 25), {
    totalStudents: 3,
    femaleStudents: 2,
    completeStudents: 2,
    completeFemaleStudents: 1,
    incompleteStudents: 1,
    incompleteFemaleStudents: 1,
    passedStudents: 1,
    passedFemaleStudents: 1,
    failedStudents: 1,
    failedFemaleStudents: 0,
  });
});

test("incomplete students stay visible without receiving a rank", () => {
  const ranked = rankCompleteRows(rows);
  assert.deepEqual(ranked.map((row) => [row.studentId, row.rank]), [
    ["a", 1],
    ["b", 2],
    ["c", 0],
  ]);
});
