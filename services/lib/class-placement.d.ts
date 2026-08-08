export type PlacementStrategy = "RANDOM_BALANCED" | "ACADEMIC_BALANCED" | "MULTI_FACTOR_BALANCED";
export type PlacementStudent = { id: string; score: number | null; gender?: string | null };
export type PlacementClass = { id: string; name: string; capacity: number | null; currentCount: number; currentGenderCounts?: Record<string, number> };
export type PinnedPlacement = { studentId: string; classId: string };
export type PlacementAssignment = { studentId: string; classId: string; pinned: boolean };
export function buildClassPlacement(params: {
  students: PlacementStudent[];
  classes: PlacementClass[];
  pinned?: PinnedPlacement[];
  strategy: PlacementStrategy;
  seed: string;
}): {
  assignments: PlacementAssignment[];
  unassignedStudentIds: string[];
  projectedCounts: Record<string, number>;
  projectedGenderCounts: Record<string, Record<string, number>>;
};
