import type { PrismaClient, SchoolLinkRequestStatus } from "@prisma/client";
import { SchoolLinkError } from "./schoolLinkService";

type LegacyAdapterDb = Pick<PrismaClient, "schoolLinkRequest" | "user">;

/**
 * Legacy clients identify school-link work by user id. They may address a
 * normalized request, but they must never fall back to mutating the legacy JSON
 * projection directly. A missing normalized row is a migration/recovery task,
 * not authorization to recreate the old approval path.
 */
export async function requireNormalizedSchoolLinkRequestId(
  db: LegacyAdapterDb,
  userId: string,
  status: SchoolLinkRequestStatus,
): Promise<string> {
  const request = await db.schoolLinkRequest.findFirst({
    where: { userId, status },
    select: { id: true },
  });
  if (request) return request.id;

  const legacyUser = await db.user.findUnique({
    where: { id: userId },
    select: { linkingStatus: true },
  });
  if (legacyUser?.linkingStatus === status) {
    throw new SchoolLinkError(
      "This legacy school-link request must be normalized before an administrator can act on it.",
      409,
      "SCHOOL_LINK_NORMALIZATION_REQUIRED",
    );
  }
  throw new SchoolLinkError(
    "No matching school-link request found",
    404,
    "SCHOOL_LINK_NOT_FOUND",
  );
}
