import { deriveUnitStates, UNIT_TARGET_CORRECT } from './learnPath';

const unit = (id: string, order: number) => ({ id, parentId: null, name: id, nameKh: null, order });
const skill = (id: string, parentId: string) => ({ id, parentId, name: id, nameKh: null, order: 0 });
const q = (id: string, topicId: string) => ({ id, topicId });

describe('deriveUnitStates', () => {
  it('rolls child-skill questions up into the parent unit', () => {
    const topics = [unit('u1', 0), skill('s1', 'u1')];
    const questions = [q('q1', 'u1'), q('q2', 's1'), q('q3', 's1')];
    const [u1] = deriveUnitStates(topics, questions, new Set(['q2']));
    expect(u1.totalQuestions).toBe(3);
    expect(u1.correct).toBe(1);
    expect(u1.skills).toHaveLength(1);
  });

  it('completes a unit at the target and unlocks the next', () => {
    const topics = [unit('u1', 0), unit('u2', 1)];
    const questions = [
      ...Array.from({ length: 6 }, (_, i) => q(`a${i}`, 'u1')),
      ...Array.from({ length: 6 }, (_, i) => q(`b${i}`, 'u2')),
    ];
    const correct = new Set(Array.from({ length: UNIT_TARGET_CORRECT }, (_, i) => `a${i}`));
    const [u1, u2] = deriveUnitStates(topics, questions, correct);
    expect(u1.state).toBe('completed');
    expect(u2.state).toBe('unlocked');
  });

  it('locks later units while the first is incomplete', () => {
    const topics = [unit('u1', 0), unit('u2', 1), unit('u3', 2)];
    const questions = ['u1', 'u2', 'u3'].flatMap((u_, i) =>
      Array.from({ length: 6 }, (_, j) => q(`${u_}q${j}`, u_)),
    );
    const [u1, u2, u3] = deriveUnitStates(topics, questions, new Set());
    expect(u1.state).toBe('unlocked');
    expect(u2.state).toBe('locked');
    expect(u3.state).toBe('locked');
  });

  it('caps the target at the available question count', () => {
    const topics = [unit('u1', 0)];
    const questions = [q('q1', 'u1'), q('q2', 'u1')];
    const [u1] = deriveUnitStates(topics, questions, new Set(['q1', 'q2']));
    expect(u1.target).toBe(2);
    expect(u1.state).toBe('completed');
  });

  it('content-less units render as no_content and never block the chain', () => {
    const topics = [unit('u1', 0), unit('u2', 1), unit('u3', 2)];
    const questions = Array.from({ length: 6 }, (_, i) => q(`c${i}`, 'u3'));
    const [u1, u2, u3] = deriveUnitStates(topics, questions, new Set());
    expect(u1.state).toBe('no_content');
    expect(u2.state).toBe('no_content');
    expect(u3.state).toBe('unlocked');
  });

  it('ignores questions tagged with unknown topics', () => {
    const topics = [unit('u1', 0)];
    const questions = [q('q1', 'u1'), q('q2', 'other-subject-topic')];
    const [u1] = deriveUnitStates(topics, questions, new Set());
    expect(u1.totalQuestions).toBe(1);
  });
});
