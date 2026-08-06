/** Per-quiz accent palette — each post gets a stable color from its id hash. */
export const QUIZ_ACCENT_GRADIENTS: [string, string][] = [
  ['#F472B6', '#EC4899'], // Pink
  ['#34D399', '#10B981'], // Green
  ['#60A5FA', '#3B82F6'], // Blue
  ['#A78BFA', '#8B5CF6'], // Violet
  ['#38BDF8', '#0EA5E9'], // Sky
  ['#FB923C', '#F97316'], // Orange
  ['#22D3EE', '#06B6D4'], // Cyan
  ['#F87171', '#EF4444'], // Coral
];

export function getQuizAccentGradient(postId: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = postId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % QUIZ_ACCENT_GRADIENTS.length;
  return QUIZ_ACCENT_GRADIENTS[index];
}
