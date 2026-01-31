// Default Templates for Multi-Tenant School Onboarding
// Cambodian Education System

export interface SubjectTemplate {
  name: string;
  nameKh: string;
  code: string;
  category: 'CORE' | 'ELECTIVE' | 'VOCATIONAL';
  coefficient: number;
  gradeLevel: number;
  isCore: boolean;
}

export interface HolidayTemplate {
  title: string;
  titleKh: string;
  date: string; // YYYY-MM-DD or MM-DD
  endDate?: string;
  type: 'HOLIDAY' | 'VACATION';
}

export interface GradeRangeTemplate {
  grade: string;
  minScore: number;
  maxScore: number;
  gpa: number;
  description: string;
  descriptionKh: string;
  color: string;
}

// ========================================
// CAMBODIAN SUBJECT TEMPLATES
// ========================================

export const CAMBODIAN_SUBJECTS_HIGH_SCHOOL: SubjectTemplate[] = [
  // Core Subjects (Coefficient 2.0)
  {
    name: 'Khmer Language',
    nameKh: 'ភាសាខ្មែរ',
    code: 'KH',
    category: 'CORE',
    coefficient: 2.0,
    gradeLevel: 7, // Will be applied to all grades 7-12
    isCore: true,
  },
  {
    name: 'Mathematics',
    nameKh: 'គណិតវិទ្យា',
    code: 'MATH',
    category: 'CORE',
    coefficient: 2.0,
    gradeLevel: 7,
    isCore: true,
  },
  {
    name: 'English',
    nameKh: 'អង់គ្លេស',
    code: 'ENG',
    category: 'CORE',
    coefficient: 2.0,
    gradeLevel: 7,
    isCore: true,
  },

  // Science Subjects (Coefficient 1.5)
  {
    name: 'Physics',
    nameKh: 'រូបវិទ្យា',
    code: 'PHY',
    category: 'CORE',
    coefficient: 1.5,
    gradeLevel: 7,
    isCore: true,
  },
  {
    name: 'Chemistry',
    nameKh: 'គីមីវិទ្យា',
    code: 'CHEM',
    category: 'CORE',
    coefficient: 1.5,
    gradeLevel: 7,
    isCore: true,
  },
  {
    name: 'Biology',
    nameKh: 'ជីវវិទ្យា',
    code: 'BIO',
    category: 'CORE',
    coefficient: 1.0,
    gradeLevel: 7,
    isCore: true,
  },

  // Social Sciences (Coefficient 1.0)
  {
    name: 'History',
    nameKh: 'ប្រវត្តិវិទ្យា',
    code: 'HIST',
    category: 'CORE',
    coefficient: 1.0,
    gradeLevel: 7,
    isCore: true,
  },
  {
    name: 'Geography',
    nameKh: 'ភូមិវិទ្យា',
    code: 'GEO',
    category: 'CORE',
    coefficient: 1.0,
    gradeLevel: 7,
    isCore: true,
  },
  {
    name: 'Civics & Morality',
    nameKh: 'សីលធម៌ពលរដ្ឋ',
    code: 'CIV',
    category: 'CORE',
    coefficient: 1.0,
    gradeLevel: 7,
    isCore: true,
  },

  // Other Subjects (Coefficient 0.5-1.0)
  {
    name: 'Physical Education',
    nameKh: 'កីឡា',
    code: 'PE',
    category: 'ELECTIVE',
    coefficient: 0.5,
    gradeLevel: 7,
    isCore: false,
  },
  {
    name: 'Computer Science',
    nameKh: 'កុំព្យូទ័រ',
    code: 'CS',
    category: 'ELECTIVE',
    coefficient: 1.0,
    gradeLevel: 7,
    isCore: false,
  },
  {
    name: 'Arts & Culture',
    nameKh: 'សិល្បៈនិងវប្បធម៌',
    code: 'ART',
    category: 'ELECTIVE',
    coefficient: 0.5,
    gradeLevel: 7,
    isCore: false,
  },
  {
    name: 'Music',
    nameKh: 'តន្ត្រី',
    code: 'MUS',
    category: 'ELECTIVE',
    coefficient: 0.5,
    gradeLevel: 7,
    isCore: false,
  },
  {
    name: 'Home Economics',
    nameKh: 'សេដ្ឋកិច្ចគ្រួសារ',
    code: 'HE',
    category: 'VOCATIONAL',
    coefficient: 0.5,
    gradeLevel: 7,
    isCore: false,
  },
  {
    name: 'Agriculture',
    nameKh: 'កសិកម្ម',
    code: 'AGR',
    category: 'VOCATIONAL',
    coefficient: 0.5,
    gradeLevel: 7,
    isCore: false,
  },
];

// ========================================
// CAMBODIAN PUBLIC HOLIDAYS
// ========================================

export function getCambodianHolidays(year: number): HolidayTemplate[] {
  return [
    {
      title: 'International New Year',
      titleKh: 'ចូលឆ្នាំសាកល',
      date: `${year}-01-01`,
      type: 'HOLIDAY',
    },
    {
      title: 'Victory Over Genocide Day',
      titleKh: 'ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍',
      date: `${year}-01-07`,
      type: 'HOLIDAY',
    },
    {
      title: 'International Women\'s Day',
      titleKh: 'ទិវាអន្តរជាតិនារី',
      date: `${year}-03-08`,
      type: 'HOLIDAY',
    },
    {
      title: 'Khmer New Year',
      titleKh: 'បុណ្យចូលឆ្នាំខ្មែរ',
      date: `${year}-04-14`,
      endDate: `${year}-04-16`,
      type: 'HOLIDAY',
    },
    {
      title: 'International Labor Day',
      titleKh: 'ទិវាកម្មករអន្តរជាតិ',
      date: `${year}-05-01`,
      type: 'HOLIDAY',
    },
    {
      title: 'Royal Ploughing Ceremony',
      titleKh: 'ព្រះរាជពិធីបុណ្យចរតព្រះនង្គ័ល',
      date: `${year}-05-10`, // Varies - approximate
      type: 'HOLIDAY',
    },
    {
      title: 'King Sihamoni\'s Birthday',
      titleKh: 'ព្រះជន្មាយុព្រះករុណាព្រះបាទសម្តេចព្រះបរមនាថ នរោត្តម សីហមុនី',
      date: `${year}-05-14`,
      type: 'HOLIDAY',
    },
    {
      title: 'Queen Mother\'s Birthday',
      titleKh: 'ព្រះជន្មាយុសម្តេចព្រះមហាក្សត្រី',
      date: `${year}-06-18`,
      type: 'HOLIDAY',
    },
    {
      title: 'Constitution Day',
      titleKh: 'ទិវារដ្ឋធម្មនុញ្ញ',
      date: `${year}-09-24`,
      type: 'HOLIDAY',
    },
    {
      title: 'Pchum Ben Festival',
      titleKh: 'បុណ្យភ្ជុំបិណ្ឌ',
      date: `${year}-09-24`, // Varies based on lunar calendar
      endDate: `${year}-09-26`,
      type: 'HOLIDAY',
    },
    {
      title: 'Commemoration Day of King Father',
      titleKh: 'ទិវារំលឹកព្រះមហាក្សត្រព្រះបិតា',
      date: `${year}-10-15`,
      type: 'HOLIDAY',
    },
    {
      title: 'Independence Day',
      titleKh: 'ទិវាឯករាជ្យជាតិ',
      date: `${year}-11-09`,
      type: 'HOLIDAY',
    },
    {
      title: 'Water Festival',
      titleKh: 'បុណ្យអុំទូក',
      date: `${year}-11-14`, // Varies based on lunar calendar
      endDate: `${year}-11-16`,
      type: 'HOLIDAY',
    },
  ];
}

// ========================================
// DEFAULT GRADING SCALE (STANDARD CAMBODIAN)
// ========================================

export const STANDARD_GRADING_SCALE: GradeRangeTemplate[] = [
  {
    grade: 'A',
    minScore: 90,
    maxScore: 100,
    gpa: 4.0,
    description: 'Excellent',
    descriptionKh: 'ល្អឥតខ្ចោះ',
    color: '#10B981', // Green
  },
  {
    grade: 'B',
    minScore: 80,
    maxScore: 89,
    gpa: 3.0,
    description: 'Very Good',
    descriptionKh: 'ល្អប្រសើរ',
    color: '#3B82F6', // Blue
  },
  {
    grade: 'C',
    minScore: 70,
    maxScore: 79,
    gpa: 2.5,
    description: 'Good',
    descriptionKh: 'ល្អ',
    color: '#22D3EE', // Cyan
  },
  {
    grade: 'D',
    minScore: 60,
    maxScore: 69,
    gpa: 2.0,
    description: 'Fair',
    descriptionKh: 'មធ្យម',
    color: '#F59E0B', // Orange
  },
  {
    grade: 'E',
    minScore: 50,
    maxScore: 59,
    gpa: 1.0,
    description: 'Pass',
    descriptionKh: 'ជាប់',
    color: '#FB923C', // Light Orange
  },
  {
    grade: 'F',
    minScore: 0,
    maxScore: 49,
    gpa: 0.0,
    description: 'Fail',
    descriptionKh: 'ធ្លាក់',
    color: '#EF4444', // Red
  },
];

// ========================================
// DEFAULT EXAM TYPES
// ========================================

export interface ExamTypeTemplate {
  name: string;
  nameKh: string;
  weight: number; // Percentage (0-100)
  maxScore: number;
  order: number;
}

export const DEFAULT_EXAM_TYPES: ExamTypeTemplate[] = [
  {
    name: 'Monthly Test',
    nameKh: 'តេស្តប្រចាំខែ',
    weight: 10,
    maxScore: 100,
    order: 1,
  },
  {
    name: 'Midterm Exam',
    nameKh: 'ប្រលងកណ្តាលឆមាស',
    weight: 30,
    maxScore: 100,
    order: 2,
  },
  {
    name: 'Final Exam',
    nameKh: 'ប្រលងឆមាស',
    weight: 60,
    maxScore: 100,
    order: 3,
  },
];

// ========================================
// DEFAULT ACADEMIC TERMS
// ========================================

export interface TermTemplate {
  name: string;
  nameKh: string;
  termNumber: number;
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
}

export const DEFAULT_TERMS: TermTemplate[] = [
  {
    name: 'Semester 1',
    nameKh: 'ឆមាសទី១',
    termNumber: 1,
    startMonth: 9,  // September
    startDay: 1,
    endMonth: 12,   // December
    endDay: 31,
  },
  {
    name: 'Semester 2',
    nameKh: 'ឆមាសទី២',
    termNumber: 2,
    startMonth: 1,  // January
    startDay: 1,
    endMonth: 8,    // August
    endDay: 31,
  },
];

// ========================================
// SCHOOL CONFIGURATION BY TYPE
// ========================================

export interface SchoolTypeConfig {
  grades: number[];
  defaultSections: string[];
  defaultClassCapacity: number;
  subjects: SubjectTemplate[];
}

export function getSchoolTypeConfig(schoolType: string): SchoolTypeConfig {
  switch (schoolType) {
    case 'PRIMARY_SCHOOL':
      return {
        grades: [1, 2, 3, 4, 5, 6],
        defaultSections: ['A', 'B'],
        defaultClassCapacity: 35,
        subjects: CAMBODIAN_SUBJECTS_HIGH_SCHOOL.filter(s => s.category === 'CORE'), // Simplified for primary
      };
    
    case 'MIDDLE_SCHOOL':
      return {
        grades: [7, 8, 9],
        defaultSections: ['A', 'B', 'C'],
        defaultClassCapacity: 40,
        subjects: CAMBODIAN_SUBJECTS_HIGH_SCHOOL,
      };
    
    case 'HIGH_SCHOOL':
      return {
        grades: [10, 11, 12],
        defaultSections: ['A', 'B', 'C'],
        defaultClassCapacity: 40,
        subjects: CAMBODIAN_SUBJECTS_HIGH_SCHOOL,
      };
    
    case 'COMPLETE_SCHOOL':
      return {
        grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        defaultSections: ['A', 'B'],
        defaultClassCapacity: 35,
        subjects: CAMBODIAN_SUBJECTS_HIGH_SCHOOL,
      };
    
    case 'INTERNATIONAL':
    default:
      return {
        grades: [7, 8, 9, 10, 11, 12], // Default to high school grades
        defaultSections: ['A', 'B'],
        defaultClassCapacity: 30,
        subjects: CAMBODIAN_SUBJECTS_HIGH_SCHOOL,
      };
  }
}
