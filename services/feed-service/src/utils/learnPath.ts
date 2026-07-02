/**
 * Learn-path progress derivation — pure, unit-tested.
 *
 * Units are a subject's top-level topics; a child skill's questions and
 * correct answers roll UP into its parent unit. A unit completes at
 * UNIT_TARGET_CORRECT distinct correct answers (or all of them, when it has
 * fewer questions). Units unlock in order; content-less units render as
 * "no_content" and never block the chain (curriculum can be seeded ahead of
 * practice content).
 */

export const UNIT_TARGET_CORRECT = 5;

export type TopicRow = {
  id: string;
  parentId: string | null;
  name: string;
  nameKh: string | null;
  order: number;
};

export type QuestionRow = { id: string; topicId: string | null };

export type UnitState = 'locked' | 'unlocked' | 'completed' | 'no_content';

export type UnitProgress = {
  topicId: string;
  name: string;
  nameKh: string | null;
  order: number;
  skills: Array<{ topicId: string; name: string; nameKh: string | null }>;
  totalQuestions: number;
  correct: number;
  target: number;
  state: UnitState;
};

export function deriveUnitStates(
  topics: TopicRow[],
  questions: QuestionRow[],
  correctQuestionIds: Set<string>,
): UnitProgress[] {
  const units = topics.filter((t) => !t.parentId);
  const childrenByParent = new Map<string, TopicRow[]>();
  for (const t of topics) {
    if (!t.parentId) continue;
    const list = childrenByParent.get(t.parentId) ?? [];
    list.push(t);
    childrenByParent.set(t.parentId, list);
  }

  // topicId → owning unit id (a unit owns itself + its children).
  const unitOf = new Map<string, string>();
  for (const unit of units) {
    unitOf.set(unit.id, unit.id);
    for (const child of childrenByParent.get(unit.id) ?? []) {
      unitOf.set(child.id, unit.id);
    }
  }

  const totals = new Map<string, number>();
  const corrects = new Map<string, number>();
  for (const q of questions) {
    const unitId = q.topicId ? unitOf.get(q.topicId) : undefined;
    if (!unitId) continue;
    totals.set(unitId, (totals.get(unitId) ?? 0) + 1);
    if (correctQuestionIds.has(q.id)) {
      corrects.set(unitId, (corrects.get(unitId) ?? 0) + 1);
    }
  }

  // Lock chain: the first contentful unit is unlocked; each later contentful
  // unit unlocks when every earlier contentful unit is completed.
  let chainOpen = true;
  return units.map((unit) => {
    const totalQuestions = totals.get(unit.id) ?? 0;
    const correct = corrects.get(unit.id) ?? 0;
    const target = totalQuestions === 0 ? 0 : Math.min(UNIT_TARGET_CORRECT, totalQuestions);

    let state: UnitState;
    if (totalQuestions === 0) {
      state = 'no_content';
    } else if (correct >= target) {
      state = 'completed';
    } else if (chainOpen) {
      state = 'unlocked';
    } else {
      state = 'locked';
    }
    if (state === 'unlocked') chainOpen = false;

    return {
      topicId: unit.id,
      name: unit.name,
      nameKh: unit.nameKh,
      order: unit.order,
      skills: (childrenByParent.get(unit.id) ?? []).map((s) => ({
        topicId: s.id,
        name: s.name,
        nameKh: s.nameKh,
      })),
      totalQuestions,
      correct,
      target,
      state,
    };
  });
}
