/**
 * Move one reaction from `from`→`to` in a per-type counts map (either may be
 * null for a pure add/remove). Pure: returns a new object, clamps at 0, drops
 * empties. Used to keep the reaction social-proof summary in sync optimistically
 * — in the feed store (source of truth) and in PostCard's local mirror.
 */
export function adjustReactionCounts(
  counts: Record<string, number>,
  from: string | null,
  to: string | null,
): Record<string, number> {
  if (from === to) return counts;
  const next = { ...counts };
  if (from) {
    next[from] = Math.max(0, (next[from] ?? 0) - 1);
    if (next[from] === 0) delete next[from];
  }
  if (to) next[to] = (next[to] ?? 0) + 1;
  return next;
}
