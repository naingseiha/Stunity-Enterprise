import { useMemo } from "react";
import { sortSubjectsByOrder } from "@/lib/subjectOrder";

export function useGradeSorting(
  subjects: any[],
  students: any[],
  className: string
) {
  const sortedSubjects = useMemo(() => {
    let grade: number | undefined;

    const pattern1 = className.match(/^(\d+)/);
    if (pattern1) {
      grade = parseInt(pattern1[1]);
    }

    if (!grade) {
      const khmerNumerals: { [key: string]: number } = {
        "១": 1,
        "២": 2,
        "៣": 3,
        "៤": 4,
        "៥": 5,
        "៦": 6,
        "៧": 7,
        "៨": 8,
        "៩": 9,
        "០": 0,
      };
      const pattern2 = className.match(/[១២៣៤៥៦៧៨៩០]/);
      if (pattern2) {
        grade = khmerNumerals[pattern2[0]];
      }
    }

    if (!grade) {
      const pattern3 = className.match(/(\d+)/);
      if (pattern3) {
        grade = parseInt(pattern3[1]);
      }
    }

    const sorted = sortSubjectsByOrder(subjects, grade);

    // Re-apply isEditable from original
    return sorted.map((sortedSubject) => {
      const original = subjects.find((s) => s.id === sortedSubject.id);
      return {
        ...sortedSubject,
        isEditable: original?.isEditable ?? false,
      };
    });
  }, [subjects, className]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const nameA = a.studentName || "";
      const nameB = b.studentName || "";
      return nameA.localeCompare(nameB, "en-US");
    });
  }, [students]);

  return { sortedSubjects, sortedStudents };
}
