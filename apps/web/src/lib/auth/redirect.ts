type AuthUser = {
  role?: string;
  isSuperAdmin?: boolean;
};

type AuthSchool = {
  id?: string;
  registrationStatus?: string | null;
};

export function getAuthRedirectPath(
  locale: string,
  user: AuthUser,
  school?: AuthSchool | null,
): string {
  if (user?.isSuperAdmin || user?.role === "SUPER_ADMIN")
    return `/${locale}/super-admin`;

  const isPendingSchoolAdmin =
    school?.registrationStatus === "PENDING" &&
    (user?.role === "ADMIN" || user?.role === "STAFF");
  if (isPendingSchoolAdmin) {
    return `/${locale}/onboarding${school?.id ? `?schoolId=${school.id}` : ""}`;
  }

  switch (user?.role) {
    case "PARENT":
      return `/${locale}/parent`;
    case "STUDENT":
      return `/${locale}/student`;
    case "TEACHER":
    case "ADMIN":
    case "STAFF":
    default:
      return `/${locale}/feed`;
  }
}
