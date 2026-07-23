/**
 * Deterministic option shuffling, shared by the reels ranker and the Learn
 * practice endpoint so the same question always renders the same option
 * order everywhere (ReelResponse.chosenIndex indexes into THIS order).
 */

export function hashToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffle `options`, remapping `correctAnswer` to the new
 * index of the originally-correct option. Stable per `seed` (the question id).
 * No-op for <2 options or an out-of-range correctAnswer.
 */
export function seededShuffleOptions(
  options: unknown,
  correctAnswer: number,
  seed: string,
): { options: any; correctAnswer: number } {
  if (!Array.isArray(options) || options.length < 2) {
    return { options, correctAnswer };
  }
  if (correctAnswer < 0 || correctAnswer >= options.length) {
    return { options, correctAnswer };
  }
  const rand = mulberry32(hashToSeed(seed));
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    options: order.map((i) => options[i]),
    correctAnswer: order.indexOf(correctAnswer),
  };
}
