import { challengeService } from '../challenges/challenge.service';

/**
 * Runs hourly.
 * Marks all challenges past their expiresAt deadline as EXPIRED.
 */
export async function runChallengeExpiry() {
    console.log('⏰ [JOB] Running challenge expiry...');
    const count = await challengeService.expireChallenges();
    console.log(`✅ [JOB] Expired ${count} challenges.`);
    return count;
}
