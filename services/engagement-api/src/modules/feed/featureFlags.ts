/**
 * Feature flags for feed capabilities. Quiz War is intentionally disabled by
 * default until its scoring and realtime lifecycle are redesigned.
 */
export function isQuizWarEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.QUIZ_WAR_ENABLED === 'true';
}
