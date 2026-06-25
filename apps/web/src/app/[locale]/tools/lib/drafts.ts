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

// ─── Cloud sync (learn-service /tool-drafts) ───────────────────────
// Drafts stay device-local until the user signs in; then they sync to the
// account so work follows them across devices. All cloud calls are best-effort
// — a failure never blocks the local-first experience.

const LEARN_URL = process.env.NEXT_PUBLIC_LEARN_SERVICE_URL || '';

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('accessToken');
}

/** Cloud sync is possible only when signed in and the service URL is configured. */
export function canCloud(): boolean {
  return !!LEARN_URL && isAuthed();
}

function mapRow(r: Record<string, unknown>): Draft {
  return {
    id: String(r.id),
    tool: r.tool as ToolId,
    title: String(r.title ?? ''),
    subject: (r.subject as string) ?? undefined,
    grade: (r.grade as string) ?? undefined,
    payload: (r.payload as Record<string, unknown>) ?? {},
    updatedAt: r.updatedAt ? Date.parse(String(r.updatedAt)) : Date.now(),
  };
}

export async function cloudList(tool?: ToolId): Promise<Draft[]> {
  if (!canCloud()) return [];
  try {
    const res = await fetch(`${LEARN_URL}/tool-drafts${tool ? `?tool=${tool}` : ''}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.drafts) ? json.drafts.map(mapRow) : [];
  } catch {
    return [];
  }
}

export async function cloudUpsert(d: Draft): Promise<boolean> {
  if (!canCloud()) return false;
  try {
    const res = await fetch(`${LEARN_URL}/tool-drafts/${encodeURIComponent(d.id)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: d.tool, title: d.title, subject: d.subject, grade: d.grade, payload: d.payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function cloudDelete(id: string): Promise<boolean> {
  if (!canCloud()) return false;
  try {
    const res = await fetch(`${LEARN_URL}/tool-drafts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Merge local + cloud drafts; cloud wins on id collision. Newest first. */
export function mergeDrafts(local: Draft[], cloud: Draft[]): Draft[] {
  const byId = new Map<string, Draft>();
  for (const d of local) byId.set(d.id, d);
  for (const d of cloud) byId.set(d.id, d);
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Load drafts for display: local when signed out; local merged with cloud when
 * signed in. Also pushes any local-only drafts up so anonymous work migrates to
 * the account on first signed-in load.
 */
export async function loadDrafts(tool?: ToolId): Promise<Draft[]> {
  const local = listDrafts(tool);
  if (!canCloud()) return local;
  const cloud = await cloudList(tool);
  const cloudIds = new Set(cloud.map((d) => d.id));
  await Promise.all(local.filter((d) => !cloudIds.has(d.id)).map((d) => cloudUpsert(d)));
  return mergeDrafts(local, cloud);
}
