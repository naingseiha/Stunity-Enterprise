import { getAuthRedirectPath } from "./redirect";

describe("getAuthRedirectPath", () => {
  it("routes general accounts to Feed", () => {
    expect(getAuthRedirectPath("en", {})).toBe("/en/feed");
  });

  it("preserves role-specific destinations", () => {
    expect(getAuthRedirectPath("km", { role: "STUDENT" })).toBe("/km/student");
    expect(getAuthRedirectPath("en", { role: "PARENT" })).toBe("/en/parent");
    expect(getAuthRedirectPath("en", { isSuperAdmin: true })).toBe(
      "/en/super-admin",
    );
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
