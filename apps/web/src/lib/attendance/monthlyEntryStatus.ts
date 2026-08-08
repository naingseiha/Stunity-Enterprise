export type MonthlyEntryStatus =
  | "PRESENT"
  | "ABSENT"
  | "PERMISSION"
  | "LATE"
  | "EXCUSED"
  | null
  | undefined;

export type MonthlyEntryStatusMeta = {
  code: string;
  label: string;
  tone: string;
};

/** The monthly sheet is an absence ledger, so no record means present. */
export function getNextMonthlyEntryStatus(
  current: MonthlyEntryStatus,
): "ABSENT" | "PERMISSION" | null {
  if (current === "ABSENT") return "PERMISSION";
  if (current === "PERMISSION") return null;
  return "ABSENT";
}

export function getMonthlyEntryStatusMeta(
  status: MonthlyEntryStatus,
): MonthlyEntryStatusMeta {
  if (status === "ABSENT") {
    return {
      code: "A",
      label: "Absent without permission",
      tone: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (status === "PERMISSION") {
    return {
      code: "P",
      label: "Absent with permission",
      tone: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }

  // Preserve statuses entered through the daily mobile workflow.
  if (status === "LATE") {
    return {
      code: "L",
      label: "Late",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (status === "EXCUSED") {
    return {
      code: "E",
      label: "Excused",
      tone: "border-teal-200 bg-teal-50 text-teal-700",
    };
  }

  return {
    code: "✓",
    label: "Present",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}
