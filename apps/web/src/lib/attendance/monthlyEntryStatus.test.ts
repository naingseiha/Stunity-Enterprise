import {
  getMonthlyEntryStatusMeta,
  getNextMonthlyEntryStatus,
} from "./monthlyEntryStatus";

describe("monthly attendance entry status", () => {
  it("uses the same abbreviations as the mobile attendance screen", () => {
    expect(getMonthlyEntryStatusMeta(null).code).toBe("✓");
    expect(getMonthlyEntryStatusMeta("PRESENT").code).toBe("✓");
    expect(getMonthlyEntryStatusMeta("ABSENT").code).toBe("A");
    expect(getMonthlyEntryStatusMeta("PERMISSION").code).toBe("P");
  });

  it("cycles from present to absent to permission and back to implicit present", () => {
    expect(getNextMonthlyEntryStatus(null)).toBe("ABSENT");
    expect(getNextMonthlyEntryStatus("PRESENT")).toBe("ABSENT");
    expect(getNextMonthlyEntryStatus("ABSENT")).toBe("PERMISSION");
    expect(getNextMonthlyEntryStatus("PERMISSION")).toBeNull();
  });
});
