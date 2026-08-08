"use strict";

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildClassPlacement(params) {
  const random = createRandom(params.seed);
  const studentById = new Map(params.students.map((student) => [student.id, student]));
  const classById = new Map(params.classes.map((item) => [item.id, item]));
  const projectedCounts = new Map(params.classes.map((item) => [item.id, item.currentCount]));
  const projectedScoreTotals = new Map(params.classes.map((item) => [item.id, 0]));
  const projectedGenderCounts = new Map(params.classes.map((item) => [item.id, { ...(item.currentGenderCounts || {}) }]));
  const assignments = [];
  const assignedStudentIds = new Set();
  const genderKey = (student) => String(student.gender || "UNSPECIFIED").toUpperCase();
  const recordStudent = (classId, student) => {
    projectedCounts.set(classId, (projectedCounts.get(classId) || 0) + 1);
    projectedScoreTotals.set(classId, (projectedScoreTotals.get(classId) || 0) + (student.score || 0));
    const counts = projectedGenderCounts.get(classId) || {};
    const gender = genderKey(student);
    projectedGenderCounts.set(classId, { ...counts, [gender]: (counts[gender] || 0) + 1 });
  };

  const hasSeat = (classId) => {
    const target = classById.get(classId);
    if (!target) return false;
    return target.capacity == null || (projectedCounts.get(classId) || 0) < target.capacity;
  };

  for (const pin of params.pinned || []) {
    const student = studentById.get(pin.studentId);
    if (!student || assignedStudentIds.has(pin.studentId) || !hasSeat(pin.classId)) continue;
    assignments.push({ studentId: pin.studentId, classId: pin.classId, pinned: true });
    assignedStudentIds.add(pin.studentId);
    recordStudent(pin.classId, student);
  }

  const remaining = params.students.filter((student) => !assignedStudentIds.has(student.id));
  const orderedStudents = params.strategy === "ACADEMIC_BALANCED" || params.strategy === "MULTI_FACTOR_BALANCED"
    ? [...remaining].sort((left, right) => (right.score ?? -1) - (left.score ?? -1) || left.id.localeCompare(right.id))
    : shuffled(remaining, random);

  for (const student of orderedStudents) {
    const available = params.classes.filter((item) => hasSeat(item.id));
    if (!available.length) break;
    const randomizedClasses = shuffled(available, random);
    randomizedClasses.sort((left, right) => {
      const countDifference = (projectedCounts.get(left.id) || 0) - (projectedCounts.get(right.id) || 0);
      if (countDifference) return countDifference;
      if (params.strategy === "MULTI_FACTOR_BALANCED") {
        const gender = genderKey(student);
        const genderDifference = (projectedGenderCounts.get(left.id)?.[gender] || 0) - (projectedGenderCounts.get(right.id)?.[gender] || 0);
        if (genderDifference) return genderDifference;
      }
      if (params.strategy === "ACADEMIC_BALANCED" || params.strategy === "MULTI_FACTOR_BALANCED") {
        return (projectedScoreTotals.get(left.id) || 0) - (projectedScoreTotals.get(right.id) || 0);
      }
      return 0;
    });
    const target = randomizedClasses[0];
    assignments.push({ studentId: student.id, classId: target.id, pinned: false });
    assignedStudentIds.add(student.id);
    recordStudent(target.id, student);
  }

  return {
    assignments,
    unassignedStudentIds: params.students.filter((student) => !assignedStudentIds.has(student.id)).map((student) => student.id),
    projectedCounts: Object.fromEntries(projectedCounts),
    projectedGenderCounts: Object.fromEntries(projectedGenderCounts),
  };
}

module.exports = { buildClassPlacement };
