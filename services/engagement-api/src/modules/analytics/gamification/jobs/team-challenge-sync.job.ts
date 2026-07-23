import { teamChallengeService } from '../team-challenges/team-challenge.service';

/**
 * Runs every 15 minutes.
 * Reconciles team challenge progress by summing contributions,
 * detecting completions, and expiring missed deadlines.
 */
export async function runTeamChallengeSync() {
    console.log('🔄 [JOB] Running team challenge sync...');
    const result = await teamChallengeService.reconcileTeamProgress();
    console.log(`✅ [JOB] Sync complete: ${result.completed} completed, ${result.expired} expired.`);
    return result;
}
