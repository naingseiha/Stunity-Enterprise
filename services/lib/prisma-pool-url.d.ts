export function withPrismaPoolParams(rawUrl: string | undefined): string | undefined;
export function normalizePrismaUrlForComparison(rawUrl: string | undefined): string;
export function shouldRunDbKeepalive(): boolean;
export function shouldRunDbStartupWarmup(): boolean;
export function getDbKeepaliveIntervalMs(): number;
export function scheduleDbKeepalive(tick: () => void | Promise<void>): void;
