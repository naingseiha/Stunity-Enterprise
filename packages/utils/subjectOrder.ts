/**
 * Subject ordering configuration for different grade levels
 * ការតម្រៀបលំដាប់មុខវិជ្ជាសម្រាប់កម្រិតថ្នាក់ផ្សេងៗ
 */

/**
 * ============================================================
 * GRADE 7, 8, 9 - Subject Order
 * ============================================================
 * មានការបំបែក: តែងសេចក្ដី + សរសេរតាមអាន (មិនមានភាសាខ្មែរ)
 * មានគេហវិជ្ជា (មិនមានសេដ្ឋកិច្ច)
 */
export const SUBJECT_ORDER_GRADE_7_8_9: { [key: string]: number } = {
  // 1.  តែងសេចក្ដី
  WRITER: 1,
  តែងសេចក្ដី: 1,
  តែង: 1,
  "តែង. ក្តី": 1,

  // 2. សរសេរតាមអាន
  WRITING: 2,
  DICTATION: 2,
  សរសេរតាមអាន: 2,
  "ស. អាន": 2,
  "ចំ.តាម": 2,

  // 3. សីលធម៌-ពលរដ្ឋ
  MORAL: 3,
  ETHICS: 3,
  CIVIC: 3,
  សីលធម៌: 3,
  ពលរដ្ឋ: 3,
  "សីលធម៌-ពលរដ្ឋ": 3,

  // 4. ប្រវត្តិវិទ្យា
  HIST: 4,
  HISTORY: 4,
  ប្រវត្តិ: 4,
  ប្រវត្តិវិទ្យា: 4,

  // 5. ភូមិវិទ្យា
  GEO: 5,
  GEOGRAPHY: 5,
  ភូមិ: 5,
  ភូមិវិទ្យា: 5,

  // 6.  គណិតវិទ្យា
  MATH: 6,
  MATHEMATICS: 6,
  គណិត: 6,
  គណិតវិទ្យា: 6,

  // 7. រូបវិទ្យា
  PHY: 7,
  PHYSICS: 7,
  រូប: 7,
  រូបវិទ្យា: 7,

  // 8. គីមីវិទ្យា
  CHEM: 8,
  CHEMISTRY: 8,
  គីមី: 8,
  គីមីវិទ្យា: 8,

  // 9. ជីវវិទ្យា
  BIO: 9,
  BIOLOGY: 9,
  ជីវៈ: 9,
  ជីវវិទ្យា: 9,

  // 10. ផែនដី
  EARTH: 10,
  ផែនដី: 10,

  // 11. ភាសា
  ENG: 11,
  ENGLISH: 11,
  ភាសា: 11,
  ភាសាអង់គ្លេស: 11,

  // 12. គេហវិជ្ជា
  HE: 12,
  HOMEMAKING: 12,
  HOME_ECONOMICS: 12,
  គេហវិជ្ជា: 12,
  គេហ: 12,

  // 13. សុខភាព
  HLTH: 13,
  HEALTH: 13,
  សុខភាព: 13,

  // 14. កីឡា
  SPORTS: 14,
  PE: 14,
  PHYSICAL_EDUCATION: 14,
  កីឡា: 14,

  // 15.  កសិកម្ម
  AGRI: 15,
  AGRICULTURE: 15,
  កសិកម្ម: 15,

  // 16. កុំព្យូទ័រ
  ICT: 16,
  COMPUTER: 16,
  IT: 16,
  កុំព្យូទ័រ: 16,

  // ⚠️ ភាសាខ្មែរ - NOT used in 7,8,9
  KHM: 999,
  KHMER: 999,
  ភាសាខ្មែរ: 999,

  // ⚠️ សេដ្ឋកិច្ច - NOT used in 7,8,9
  ECON: 999,
  ECONOMICS: 999,
  សេដ្ឋកិច្ច: 999,
};

/**
 * ============================================================
 * GRADE 10, 11 - Subject Order
 * ============================================================
 * មានភាសាខ្មែរ (មិនមាន តែងសេចក្ដី + សរសេរតាមអាន)
 * មានសេដ្ឋកិច្ច (មិនមានគេហវិជ្ជា)
 * មានកីឡា និង កសិកម្ម
 */
export const SUBJECT_ORDER_GRADE_10_11: { [key: string]: number } = {
  // 1.  ភាសាខ្មែរ
  KHM: 1,
  KHMER: 1,
  ភាសាខ្មែរ: 1,

  // 2.  សីលធម៌-ពលរដ្ឋ
  MORAL: 2,
  ETHICS: 2,
  CIVIC: 2,
  សីលធម៌: 2,
  ពលរដ្ឋ: 2,
  "សីលធម៌-ពលរដ្ឋ": 2,

  // 3. ប្រវត្តិវិទ្យា
  HIST: 3,
  HISTORY: 3,
  ប្រវត្តិ: 3,
  ប្រវត្តិវិទ្យា: 3,

  // 4. ភូមិវិទ្យា
  GEO: 4,
  GEOGRAPHY: 4,
  ភូមិ: 4,
  ភូមិវិទ្យា: 4,

  // 5. គណិតវិទ្យា
  MATH: 5,
  MATHEMATICS: 5,
  គណិត: 5,
  គណិតវិទ្យា: 5,

  // 6. រូបវិទ្យា
  PHY: 6,
  PHYSICS: 6,
  រូប: 6,
  រូបវិទ្យា: 6,

  // 7. គីមីវិទ្យា
  CHEM: 7,
  CHEMISTRY: 7,
  គីមី: 7,
  គីមីវិទ្យា: 7,

  // 8. ជីវវិទ្យា
  BIO: 8,
  BIOLOGY: 8,
  ជីវៈ: 8,
  ជីវវិទ្យា: 8,

  // 9. ផែនដី
  EARTH: 9,
  ផែនដី: 9,

  // 10. ភាសា
  ENG: 10,
  ENGLISH: 10,
  ភាសា: 10,
  ភាសាអង់គ្លេស: 10,

  // 11. សេដ្ឋកិច្ច
  ECON: 11,
  ECONOMICS: 11,
  សេដ្ឋកិច្ច: 11,

  // 12. សុខភាព
  HLTH: 12,
  HEALTH: 12,
  សុខភាព: 12,

  // 13. កីឡា
  SPORTS: 13,
  PE: 13,
  PHYSICAL_EDUCATION: 13,
  កីឡា: 13,

  // 14. កសិកម្ម
  AGRI: 14,
  AGRICULTURE: 14,
  កសិកម្ម: 14,

  // 15. កុំព្យូទ័រ
  ICT: 15,
  COMPUTER: 15,
  IT: 15,
  កុំព្យូទ័រ: 15,

  // ⚠️ តែងសេចក្ដី, សរសេរតាមអាន - NOT used in 10,11
  WRITING: 999,
  WRITER: 999,
  DICTATION: 999,
  តែងសេចក្ដី: 999,
  សរសេរតាមអាន: 999,

  // ⚠️ គេហវិជ្ជា - NOT used in 10,11
  HE: 999,
  HOMEMAKING: 999,
  គេហវិជ្ជា: 999,
};

/**
 * ============================================================
 * GRADE 12 - Subject Order
 * ============================================================
 * មានភាសាខ្មែរ (មិនមាន តែងសេចក្ដី + សរសេរតាមអាន)
 * មានសេដ្ឋកិច្ច (មិនមានគេហវិជ្ជា)
 * មិនមានកីឡា និង កសិកម្ម
 */
export const SUBJECT_ORDER_GRADE_12: { [key: string]: number } = {
  // 1. ភាសាខ្មែរ
  KHM: 1,
  KHMER: 1,
  ភាសាខ្មែរ: 1,

  // 2. សីលធម៌-ពលរដ្ឋ
  MORAL: 2,
  ETHICS: 2,
  CIVIC: 2,
  សីលធម៌: 2,
  ពលរដ្ឋ: 2,
  "សីលធម៌-ពលរដ្ឋ": 2,

  // 3. ប្រវត្តិវិទ្យា
  HIST: 3,
  HISTORY: 3,
  ប្រវត្តិ: 3,
  ប្រវត្តិវិទ្យា: 3,

  // 4. ភូមិវិទ្យា
  GEO: 4,
  GEOGRAPHY: 4,
  ភូមិ: 4,
  ភូមិវិទ្យា: 4,

  // 5. គណិតវិទ្យា
  MATH: 5,
  MATHEMATICS: 5,
  គណិត: 5,
  គណិតវិទ្យា: 5,

  // 6. រូបវិទ្យា
  PHY: 6,
  PHYSICS: 6,
  រូប: 6,
  រូបវិទ្យា: 6,

  // 7. គីមីវិទ្យា
  CHEM: 7,
  CHEMISTRY: 7,
  គីមី: 7,
  គីមីវិទ្យា: 7,

  // 8. ជីវវិទ្យា
  BIO: 8,
  BIOLOGY: 8,
  ជីវៈ: 8,
  ជីវវិទ្យា: 8,

  // 9. ផែនដី
  EARTH: 9,
  ផែនដី: 9,

  // 10. ភាសា
  ENG: 10,
  ENGLISH: 10,
  ភាសា: 10,
  ភាសាអង់គ្លេស: 10,

  // 11. សេដ្ឋកិច្ច
  ECON: 11,
  ECONOMICS: 11,
  សេដ្ឋកិច្ច: 11,

  // 12.  សុខភាព
  HLTH: 12,
  HEALTH: 12,
  សុខភាព: 12,

  // 13. កុំព្យូទ័រ
  ICT: 13,
  COMPUTER: 13,
  IT: 13,
  កុំព្យូទ័រ: 13,

  // ⚠️ តែងសេចក្ដី, សរសេរតាមអាន - NOT used in 12
  WRITING: 999,
  WRITER: 999,
  DICTATION: 999,
  តែងសេចក្ដី: 999,
  សរសេរតាមអាន: 999,

  // ⚠️ គេហវិជ្ជា - NOT used in 12
  HE: 999,
  HOMEMAKING: 999,
  គេហវិជ្ជា: 999,

  // ⚠️ កីឡា, កសិកម្ម - NOT used in 12
  SPORTS: 999,
  PE: 999,
  AGRI: 999,
  កីឡា: 999,
  កសិកម្ម: 999,
};

/**
 * Get appropriate subject order mapping for grade level
 */
function getSubjectOrderMapping(grade?: number | string): {
  [key: string]: number;
} {
  const gradeNum = typeof grade === "string" ? parseInt(grade) : grade;

  if (!gradeNum) return {};

  if ([7, 8, 9].includes(gradeNum)) {
    return SUBJECT_ORDER_GRADE_7_8_9;
  } else if ([10, 11].includes(gradeNum)) {
    return SUBJECT_ORDER_GRADE_10_11;
  } else if (gradeNum === 12) {
    return SUBJECT_ORDER_GRADE_12;
  }

  return {};
}

/**
 * Get subject order priority based on code or name
 */
export function getSubjectOrderPriority(
  subject: { code?: string; nameKh?: string; name?: string },
  grade?: number | string
): number {
  const gradeNum = typeof grade === "string" ? parseInt(grade) : grade;

  // Only apply custom order for grades 7-12
  if (!gradeNum || ![7, 8, 9, 10, 11, 12].includes(gradeNum)) {
    return 999;
  }

  const orderMapping = getSubjectOrderMapping(grade);

  if (Object.keys(orderMapping).length === 0) {
    return 999;
  }

  // Extract base code
  const baseCode = subject.code?.split("-")[0]?.toUpperCase()?.trim() || "";
  const nameKh = (subject.nameKh || subject.name || "").trim();

  console.log(`🔍 [Grade ${gradeNum}] Checking subject:`, {
    code: subject.code,
    baseCode,
    nameKh,
  });

  // 1. Try exact code match
  if (baseCode && orderMapping[baseCode]) {
    console.log(
      `✅ Matched by code: ${baseCode} -> Priority: ${orderMapping[baseCode]}`
    );
    return orderMapping[baseCode];
  }

  // 2. Try Khmer name exact match
  if (nameKh && orderMapping[nameKh]) {
    console.log(
      `✅ Matched by nameKh (exact): ${nameKh} -> Priority: ${orderMapping[nameKh]}`
    );
    return orderMapping[nameKh];
  }

  // 3. Try partial Khmer name match
  const khmerMatch = Object.keys(orderMapping).find((key) => {
    if (/^[A-Z_]+$/.test(key)) return false;
    return nameKh.includes(key) || key.includes(nameKh);
  });

  if (khmerMatch) {
    console.log(
      `✅ Matched by nameKh (partial): ${khmerMatch} -> Priority: ${orderMapping[khmerMatch]}`
    );
    return orderMapping[khmerMatch];
  }

  // 4. Try partial code match
  const codeMatch = Object.keys(orderMapping).find((key) => {
    if (!/^[A-Z_]+$/.test(key)) return false;
    return baseCode.includes(key) || key.includes(baseCode);
  });

  if (codeMatch) {
    console.log(
      `✅ Matched by code (partial): ${codeMatch} -> Priority: ${orderMapping[codeMatch]}`
    );
    return orderMapping[codeMatch];
  }

  console.log("❌ No match found, using default priority 999");
  return 999;
}

/**
 * Sort subjects array by predefined order
 */
export function sortSubjectsByOrder<
  T extends { code?: string; nameKh?: string; name?: string; order?: number }
>(subjects: T[], grade?: number | string): T[] {
  const gradeNum = typeof grade === "string" ? parseInt(grade) : grade;

  console.log("📊 Sorting subjects for grade:", gradeNum);
  console.log(
    "📋 Original subjects:",
    subjects.map((s) => ({ code: s.code, name: s.nameKh || s.name }))
  );

  // For grades 7-12: use custom order
  if (gradeNum && [7, 8, 9, 10, 11, 12].includes(gradeNum)) {
    const sorted = [...subjects].sort((a, b) => {
      const priorityA = getSubjectOrderPriority(a, grade);
      const priorityB = getSubjectOrderPriority(b, grade);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort by Khmer name
      const nameA = a.nameKh || a.name || a.code || "";
      const nameB = b.nameKh || b.name || b.code || "";
      return nameA.localeCompare(nameB, "km");
    });

    console.log(
      "✅ Sorted subjects:",
      sorted.map((s) => ({
        code: s.code,
        name: s.nameKh || s.name,
        priority: getSubjectOrderPriority(s, grade),
      }))
    );

    return sorted;
  }

  // For other grades: use existing order field or alphabetical
  return [...subjects].sort((a, b) => {
    if (typeof a.order === "number" && typeof b.order === "number") {
      return a.order - b.order;
    }

    const nameA = a.nameKh || a.name || a.code || "";
    const nameB = b.nameKh || b.name || b.code || "";
    return nameA.localeCompare(nameB, "km");
  });
}

/**
 * Check if grade should use custom subject ordering
 */
export function shouldUseCustomOrder(grade?: number | string): boolean {
  const gradeNum = typeof grade === "string" ? parseInt(grade) : grade;
  return gradeNum !== undefined && [7, 8, 9, 10, 11, 12].includes(gradeNum);
}

/**
 * Get display message for current ordering
 */
export function getOrderingMessage(grade?: number | string): string | null {
  if (shouldUseCustomOrder(grade)) {
    return `📌 មុខវិជ្ជាត្រូវបានតម្រៀបតាមលំដាប់ស្តង់ដារសម្រាប់ថ្នាក់ទី ${grade}`;
  }
  return null;
}
