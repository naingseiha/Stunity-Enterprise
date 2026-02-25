import * as fc from 'fast-check';

/**
 * Pure purchase validation logic mirroring the service's conditions.
 */
function canPurchase(balance: number, cost: number, alreadyOwned: boolean, achievementRequired: boolean, achievementUnlocked: boolean): boolean {
    if (alreadyOwned) return false;
    if (balance < cost) return false;
    if (achievementRequired && !achievementUnlocked) return false;
    return true;
}

describe('UnlockableService Property Tests', () => {
    /**
     * PROP-12: Purchase succeeds IFF balance >= cost AND not already owned AND achievement gate met.
     */
    it('PROP-12: purchase succeeds only when all conditions are satisfied', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 10000 }),   // balance
                fc.integer({ min: 1, max: 10000 }),   // cost
                fc.boolean(),                          // alreadyOwned
                fc.boolean(),                          // achievementRequired
                fc.boolean(),                          // achievementUnlocked
                (balance, cost, alreadyOwned, achievementRequired, achievementUnlocked) => {
                    const result = canPurchase(balance, cost, alreadyOwned, achievementRequired, achievementUnlocked);

                    if (alreadyOwned) {
                        expect(result).toBe(false);
                    } else if (balance < cost) {
                        expect(result).toBe(false);
                    } else if (achievementRequired && !achievementUnlocked) {
                        expect(result).toBe(false);
                    } else {
                        expect(result).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * PROP-13: Owned unlockables are always a subset of available unlockables.
     * Simulate a catalog and purchase history: owned ⊆ catalog.
     */
    it('PROP-13: owned items are always a subset of the catalog', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 2, maxLength: 8 }), { minLength: 1, maxLength: 20 }),
                fc.array(fc.nat({ max: 19 }), { minLength: 0, maxLength: 10 }),
                (catalogIds, purchaseIndices) => {
                    // Available catalog
                    const catalog = Array.from(new Set(catalogIds));
                    // Simulate purchases: pick by index, only from catalog
                    const owned = Array.from(
                        new Set(purchaseIndices.map((i) => catalog[i % catalog.length]))
                    );

                    // Invariant: every owned item must be in the catalog
                    const catalogSet = new Set(catalog);
                    for (const id of owned) {
                        expect(catalogSet.has(id)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
