"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildClassPlacement } = require("./class-placement");

const students = Array.from({ length: 12 }, (_, index) => ({ id: `student-${index + 1}`, score: 100 - index }));
const classes = ["A", "B", "C"].map((name) => ({ id: name, name, capacity: 4, currentCount: 0 }));

test("random placement is deterministic, balanced, and capacity safe", () => {
  const first = buildClassPlacement({ students, classes, strategy: "RANDOM_BALANCED", seed: "2026-grade-11" });
  const second = buildClassPlacement({ students, classes, strategy: "RANDOM_BALANCED", seed: "2026-grade-11" });
  assert.deepEqual(first, second);
  assert.equal(first.assignments.length, 12);
  assert.deepEqual(Object.values(first.projectedCounts).sort(), [4, 4, 4]);
  assert.equal(new Set(first.assignments.map((item) => item.studentId)).size, 12);
});

test("pinned students stay in the requested class and the rest remain balanced", () => {
  const result = buildClassPlacement({
    students,
    classes,
    pinned: [{ studentId: "student-1", classId: "C" }],
    strategy: "ACADEMIC_BALANCED",
    seed: "ranked",
  });
  assert.deepEqual(result.assignments.find((item) => item.studentId === "student-1"), { studentId: "student-1", classId: "C", pinned: true });
  assert.deepEqual(Object.values(result.projectedCounts).sort(), [4, 4, 4]);
});

test("returns overflow students instead of exceeding capacity", () => {
  const result = buildClassPlacement({ students, classes: classes.map((item) => ({ ...item, capacity: 3 })), strategy: "RANDOM_BALANCED", seed: "overflow" });
  assert.equal(result.assignments.length, 9);
  assert.equal(result.unassignedStudentIds.length, 3);
});

test("multi-factor placement balances gender while preserving equal class sizes", () => {
  const mixedStudents = Array.from({ length: 18 }, (_, index) => ({
    id: `mixed-${index + 1}`,
    score: 100 - index,
    gender: index < 9 ? "FEMALE" : "MALE",
  }));
  const targets = ["A", "B", "C"].map((id) => ({ id, name: id, capacity: 6, currentCount: 0 }));
  const result = buildClassPlacement({ students: mixedStudents, classes: targets, strategy: "MULTI_FACTOR_BALANCED", seed: "multi-factor" });
  assert.deepEqual(Object.values(result.projectedCounts).sort(), [6, 6, 6]);
  assert.deepEqual(Object.values(result.projectedGenderCounts).map((counts) => counts.FEMALE).sort(), [3, 3, 3]);
  assert.deepEqual(Object.values(result.projectedGenderCounts).map((counts) => counts.MALE).sort(), [3, 3, 3]);
});
