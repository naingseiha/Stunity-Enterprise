export type PublicPendingLinkData = {
  schoolId: string | null;
  schoolName: string | null;
  type: string | null;
  submittedAt: string | null;
};

export function publicPendingLinkData(
  value: unknown,
): PublicPendingLinkData | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  return {
    schoolId: typeof data.schoolId === "string" ? data.schoolId : null,
    schoolName: typeof data.schoolName === "string" ? data.schoolName : null,
    type: typeof data.type === "string" ? data.type : null,
    submittedAt: typeof data.submittedAt === "string" ? data.submittedAt : null,
  };
}
