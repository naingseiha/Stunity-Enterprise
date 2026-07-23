export const GENERAL_ACCOUNT_ROLE = "STUDENT" as const;
export const PASSWORD_GENERAL_ACCOUNT_TYPE = "HYBRID" as const;

export function isPasswordHashUsable(hash: string | null | undefined): boolean {
  if (!hash) return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

export function publicRegistrationAuthorization() {
  return {
    role: GENERAL_ACCOUNT_ROLE,
    accountType: PASSWORD_GENERAL_ACCOUNT_TYPE,
    schoolId: null,
  } as const;
}

export type SocialAccountResolution =
  | "RETURNING_PROVIDER_ACCOUNT"
  | "CREATE_GENERAL_ACCOUNT"
  | "REQUIRE_AUTHENTICATED_LINK";

export function resolveUnlinkedSocialAccount(
  hasProviderAccount: boolean,
  hasMatchingLocalEmail: boolean,
): SocialAccountResolution {
  if (hasProviderAccount) return "RETURNING_PROVIDER_ACCOUNT";
  if (hasMatchingLocalEmail) return "REQUIRE_AUTHENTICATED_LINK";
  return "CREATE_GENERAL_ACCOUNT";
}
