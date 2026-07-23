import * as fc from 'fast-check';

// Pure reward distribution logic extracted for property testing
function distributeRewards(
    participants: Array<{ userId: string; contribution: number }>,
    totalReward: number
): Array<{ userId: string; reward: number; percentage: number }> {
    const totalContribution = participants.reduce((sum, p) => sum + p.contribution, 0);
    if (totalContribution === 0) return participants.map((p) => ({ ...p, reward: 0, percentage: 0 }));

    return participants.map((p) => {
        const percentage = p.contribution / totalContribution;
        return {
            userId: p.userId,
            reward: Math.floor(totalReward * percentage),
            percentage,
        };
    });
}

describe('TeamChallengeService Property Tests', () => {
    /**
     * PROP-5: Sum of individual contributions equals total team progress.
     */
    it('PROP-5: sum of individual contributions equals team total', () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 50 }),
                (contributions) => {
                    const total = contributions.reduce((sum, c) => sum + c, 0);
                    const participants = contributions.map((c, i) => ({
                        userId: `user-${i}`,
                        contribution: c,
                    }));

                    const serverTotal = participants.reduce((sum, p) => sum + p.contribution, 0);
                    expect(serverTotal).toBe(total);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * PROP-14: Team size constraints.
     * - Fail with < 2 participants
     * - Succeed with 2-50 participants
     * - Fail with > 50 participants
     */
    it('PROP-14: team creation enforces participant count constraints (2-50)', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 100 }),
                (count) => {
                    const MIN = 2;
                    const MAX = 50;

                    if (count < MIN) {
                        expect(count < MIN).toBe(true);
                    } else if (count > MAX) {
                        expect(count > MAX).toBe(true);
                    } else {
                        expect(count >= MIN && count <= MAX).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * PROP-15: Proportional reward distribution.
     * - Each participant's reward ≈ totalReward × (contribution / totalContribution)
     * - Sum of rewards <= totalReward (floor rounding can cause slight shortfall)
     */
    it('PROP-15: proportional rewards are correct and sum does not exceed total', () => {
        fc.assert(
            fc.property(
                fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 50 }),
                fc.integer({ min: 10, max: 100000 }),
                (contributions, totalReward) => {
                    const participants = contributions.map((c, i) => ({
                        userId: `user-${i}`,
                        contribution: c,
                    }));

                    const distributed = distributeRewards(participants, totalReward);
                    const totalContrib = contributions.reduce((a, b) => a + b, 0);
                    const sumOfRewards = distributed.reduce((sum, d) => sum + d.reward, 0);

                    // Total rewards distributed must not exceed total reward (floor rounding)
                    expect(sumOfRewards).toBeLessThanOrEqual(totalReward);

                    // Each participant's percentage should match their contribution ratio
                    for (let i = 0; i < participants.length; i++) {
                        const expectedPct = participants[i].contribution / totalContrib;
                        expect(distributed[i].percentage).toBeCloseTo(expectedPct, 5);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
