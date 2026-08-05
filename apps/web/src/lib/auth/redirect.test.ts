import { getAuthRedirectPath } from "./redirect";

describe("getAuthRedirectPath", () => {
  it("routes general accounts to Feed", () => {
    expect(getAuthRedirectPath("en", {})).toBe("/en/feed");
  });

  it("preserves role-specific destinations", () => {
    expect(getAuthRedirectPath("km", { role: "STUDENT" })).toBe("/km/feed");
    expect(getAuthRedirectPath("en", { role: "PARENT" })).toBe("/en/parent");
    expect(getAuthRedirectPath("en", { isSuperAdmin: true })).toBe(
      "/en/super-admin",
    );
    expect(getAuthRedirectPath("en", { role: "TEACHER" })).toBe("/en/feed");
    expect(getAuthRedirectPath("en", { role: "ADMIN" })).toBe("/en/feed");
    expect(getAuthRedirectPath("en", { role: "STAFF" })).toBe("/en/feed");
  });

  it("routes pending school administrators to onboarding", () => {
    expect(
      getAuthRedirectPath(
        "km",
        { role: "ADMIN" },
        { id: "school-1", registrationStatus: "PENDING" },
      ),
    ).toBe("/km/onboarding?schoolId=school-1");
  });
});
