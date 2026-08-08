export const placementApproverRoles: string[];
export function registerClassPlacementBatchRoutes(input: {
  app: any;
  prisma: any;
  requireClassAdmin: any;
  cache: { clear(): void };
  Prisma: any;
}): void;
