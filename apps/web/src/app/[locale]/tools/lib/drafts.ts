// Anonymous, device-local drafts for the creator Tools.
// Lets users work without an account; signing in later lets them sync to cloud.
// (Cloud sync endpoint is a follow-up — this layer is the offline-first store.)

export type ToolId = 'lesson-planner' | 'exam' | 'slides';

export type Draft = {
  id: string;
  tool: ToolId;
  title: string;
  subject?: string;
  grade?: string;
  updatedAt: number;
  /** Tool-specific state needed to re-open the work. */
  payload: Record<string, unknown>;
};

const KEY = 'stunity_tool_drafts';

function read(): Draft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: Draft[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function listDrafts(tool?: ToolId): Draft[] {
  const all = read().sort((a, b) => b.updatedAt - a.updatedAt);
  return tool ? all.filter((d) => d.tool === tool) : all;
}

export function getDraft(id: string): Draft | undefined {
  return read().find((d) => d.id === id);
}

/** Insert or update a draft. Pass `id` to update an existing one. */
export function saveDraft(input: Omit<Draft, 'id' | 'updatedAt'> & { id?: string }): Draft {
  const list = read();
  const id = input.id ?? `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const draft: Draft = {
    id,
    tool: input.tool,
    title: input.title,
    subject: input.subject,
    grade: input.grade,
    payload: input.payload,
    updatedAt: Date.now(),
  };
  const idx = list.findIndex((d) => d.id === id);
  if (idx >= 0) list[idx] = draft;
  else list.unshift(draft);
  write(list);
  return draft;
}

export function deleteDraft(id: string) {
  write(read().filter((d) => d.id !== id));
}

/** True when the user has signed in (has an access token). */
export function isAuthed(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.localStorage.getItem('accessToken');
}
