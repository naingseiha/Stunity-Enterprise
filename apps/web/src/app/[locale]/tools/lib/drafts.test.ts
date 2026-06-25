import { type Draft } from './drafts';
import { mergeDrafts } from './drafts';

const d = (id: string, updatedAt: number, title = id): Draft => ({
  id,
  tool: 'lesson-planner',
  title,
  updatedAt,
  payload: {},
});

describe('mergeDrafts', () => {
  it('returns newest-first by updatedAt', () => {
    const out = mergeDrafts([d('a', 100), d('b', 300), d('c', 200)], []);
    expect(out.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('lets cloud win on an id collision', () => {
    const local = [d('a', 500, 'local-title')];
    const cloud = [d('a', 200, 'cloud-title')];
    const out = mergeDrafts(local, cloud);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('cloud-title');
  });

  it('unions local-only and cloud-only drafts', () => {
    const out = mergeDrafts([d('local', 100)], [d('cloud', 200)]);
    expect(out.map((x) => x.id).sort()).toEqual(['cloud', 'local']);
  });

  it('handles empty inputs', () => {
    expect(mergeDrafts([], [])).toEqual([]);
  });
});

// listDrafts / saveDraft / deleteDraft touch localStorage — exercise them
// against a minimal in-memory stub to prove the local-first CRUD contract.
describe('local draft CRUD', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    jest.resetModules();
  });

  it('saves, lists, updates and deletes drafts', async () => {
    const { saveDraft, listDrafts, getDraft, deleteDraft } = await import('./drafts');

    const created = saveDraft({ tool: 'exam', title: 'first', payload: { a: 1 } });
    expect(created.id).toBeTruthy();
    expect(listDrafts()).toHaveLength(1);

    // update by id keeps a single row
    saveDraft({ id: created.id, tool: 'exam', title: 'renamed', payload: { a: 2 } });
    expect(listDrafts()).toHaveLength(1);
    expect(getDraft(created.id)?.title).toBe('renamed');

    // tool filter
    saveDraft({ tool: 'lesson-planner', title: 'plan', payload: {} });
    expect(listDrafts('exam')).toHaveLength(1);
    expect(listDrafts()).toHaveLength(2);

    deleteDraft(created.id);
    expect(listDrafts('exam')).toHaveLength(0);
  });
});
