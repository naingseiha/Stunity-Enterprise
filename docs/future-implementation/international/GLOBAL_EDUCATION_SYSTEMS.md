# 🌍 Global Education Systems Support

## Overview

Complete guide for supporting all major education systems worldwide, ensuring the platform can serve schools in any country with appropriate grading, curriculum, and compliance requirements.

---

## 🎯 Supported Education Systems

### Asia-Pacific Region

#### 🇰🇭 Cambodia (Primary Focus)
```typescript
interface CambodiaEducation {
  system: {
    ministry: 'Ministry of Education, Youth and Sport (MoEYS)';
    grades: '1-12';
    structure: {
      primary: 'Grade 1-6';
      lowerSecondary: 'Grade 7-9';
      upperSecondary: 'Grade 10-12';
    };
  };

  gradingSystem: {
    scale: 'A-F';
    grades: {
      A: { min: 90, max: 100, gpa: 4.0, description: 'Excellent' };
      B: { min: 80, max: 89, gpa: 3.0, description: 'Very Good' };
      C: { min: 70, max: 79, gpa: 2.0, description: 'Good' };
      D: { min: 60, max: 69, gpa: 1.0, description: 'Fair' };
      E: { min: 50, max: 59, gpa: 0.5, description: 'Poor' };
      F: { min: 0, max: 49, gpa: 0.0, description: 'Fail' };
    };
    passingGrade: 'E';
    passingScore: 50;
  };

  subjects: {
    grade7_9: [
      { code: 'KHM', name: 'ភាសាខ្មែរ', nameEn: 'Khmer Language', coefficient: 4 },
      { code: 'MATH', name: 'គណិតវិទ្យា', nameEn: 'Mathematics', coefficient: 4 },
      { code: 'PHYS', name: 'រូបវិទ្យា', nameEn: 'Physics', coefficient: 3 },
      { code: 'CHEM', name: 'គីមីវិទ្យា', nameEn: 'Chemistry', coefficient: 3 },
      { code: 'BIO', name: 'ជីវវិទ្យា', nameEn: 'Biology', coefficient: 3 },
      { code: 'HIST', name: 'ប្រវត្តិសាស្ត្រ', nameEn: 'History', coefficient: 2 },
      { code: 'GEO', name: 'ភូមិវិទ្យា', nameEn: 'Geography', coefficient: 2 },
      { code: 'ENG', name: 'អង់គ្លេស', nameEn: 'English', coefficient: 3 },
      { code: 'PE', name: 'កីឡា', nameEn: 'Physical Education', coefficient: 1 },
      { code: 'ARTS', name: 'សិល្បៈ', nameEn: 'Arts', coefficient: 1 },
    ];
  };

  academicYear: {
    start: 'November';
    end: 'August';
    terms: 2;
    examinations: ['Mid-term', 'Final'];
  };

  nationalExams: {
    grade9: 'National Exam for Lower Secondary Education Certificate';
    grade12: 'National Exam for Upper Secondary Education Certificate (Baccalaureate)';
  };

  language: {
    primary: 'Khmer';
    secondary: 'English';
    curriculum: 'Bilingual (Khmer-English)';
  };
}
```

#### 🇹🇭 Thailand
```typescript
interface ThailandEducation {
  system: {
    ministry: 'Ministry of Education';
    grades: 'Prathom 1-6, Matthayom 1-6';
    structure: {
      primary: 'Prathom 1-6';
      lowerSecondary: 'Matthayom 1-3';
      upperSecondary: 'Matthayom 4-6';
    };
  };

  gradingSystem: {
    scale: '0-4 GPA';
    grades: {
      four: { min: 80, max: 100, gpa: 4.0, description: 'Excellent' };
      threePointFive: { min: 75, max: 79, gpa: 3.5, description: 'Very Good' };
      three: { min: 70, max: 74, gpa: 3.0, description: 'Good' };
      twoPointFive: { min: 65, max: 69, gpa: 2.5, description: 'Fairly Good' };
      two: { min: 60, max: 64, gpa: 2.0, description: 'Fair' };
      onePointFive: { min: 55, max: 59, gpa: 1.5, description: 'Fairly Poor' };
      one: { min: 50, max: 54, gpa: 1.0, description: 'Poor' };
      zero: { min: 0, max: 49, gpa: 0.0, description: 'Very Poor' };
    };
    passingGrade: 1.0;
  };

  academicYear: {
    start: 'May';
    end: 'March';
    semesters: 2;
  };
}
```

#### 🇻🇳 Vietnam
```typescript
interface VietnamEducation {
  system: {
    ministry: 'Ministry of Education and Training';
    grades: '1-12';
    structure: {
      primary: 'Grade 1-5';
      lowerSecondary: 'Grade 6-9';
      upperSecondary: 'Grade 10-12';
    };
  };

  gradingSystem: {
    scale: '0-10';
    grades: {
      excellent: { min: 9.0, max: 10.0, description: 'Xuất sắc (Excellent)' };
      veryGood: { min: 8.0, max: 8.9, description: 'Giỏi (Very Good)' };
      good: { min: 6.5, max: 7.9, description: 'Khá (Good)' };
      average: { min: 5.0, max: 6.4, description: 'Trung bình (Average)' };
      belowAverage: { min: 3.5, max: 4.9, description: 'Yếu (Below Average)' };
      poor: { min: 0, max: 3.4, description: 'Kém (Poor)' };
    };
    passingGrade: 5.0;
  };
}
```

#### 🇸🇬 Singapore
```typescript
interface SingaporeEducation {
  system: {
    ministry: 'Ministry of Education';
    structure: {
      primary: 'Primary 1-6';
      secondary: 'Secondary 1-4/5';
      postSecondary: 'Junior College 1-2';
    };
  };

  gradingSystem: {
    primary: {
      scale: 'A*-U';
      grades: ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];
    };
    secondary: {
      olevel: {
        grades: {
          A1: { min: 75, max: 100, points: 1 };
          A2: { min: 70, max: 74, points: 2 };
          B3: { min: 65, max: 69, points: 3 };
          B4: { min: 60, max: 64, points: 4 };
          C5: { min: 55, max: 59, points: 5 };
          C6: { min: 50, max: 54, points: 6 };
          D7: { min: 45, max: 49, points: 7 };
          E8: { min: 40, max: 44, points: 8 };
          F9: { min: 0, max: 39, points: 9 };
        };
      };
    };
  };

  nationalExams: {
    psle: 'Primary School Leaving Examination';
    olevel: 'Singapore-Cambridge GCE O-Level';
    alevel: 'Singapore-Cambridge GCE A-Level';
  };
}
```

#### 🇮🇳 India
```typescript
interface IndiaEducation {
  boards: [
    {
      name: 'CBSE';
      fullName: 'Central Board of Secondary Education';
      gradingSystem: {
        scale: 'A1-E2 + 10 point GPA';
        grades: {
          A1: { min: 91, max: 100, gpa: 10.0 };
          A2: { min: 81, max: 90, gpa: 9.0 };
          B1: { min: 71, max: 80, gpa: 8.0 };
          B2: { min: 61, max: 70, gpa: 7.0 };
          C1: { min: 51, max: 60, gpa: 6.0 };
          C2: { min: 41, max: 50, gpa: 5.0 };
          D: { min: 33, max: 40, gpa: 4.0 };
          E1: { min: 21, max: 32, gpa: 0.0 };
          E2: { min: 0, max: 20, gpa: 0.0 };
        };
      };
    },
    {
      name: 'ICSE';
      fullName: 'Indian Certificate of Secondary Education';
      gradingSystem: {
        scale: '1-7';
        grades: {
          one: { min: 90, description: 'Excellent' };
          two: { min: 75, description: 'Very Good' };
          three: { min: 60, description: 'Good' };
          four: { min: 50, description: 'Satisfactory' };
          five: { min: 40, description: 'Pass' };
          six: { min: 35, description: 'Pass' };
          seven: { min: 0, description: 'Below Pass' };
        };
      };
    }
  ];
}
```

### Americas

#### 🇺🇸 United States
```typescript
interface USEducation {
  system: {
    structure: {
      elementary: 'K-5 or K-6';
      middleSchool: '6-8 or 7-8';
      highSchool: '9-12';
    };
  };

  gradingSystem: {
    letterGrades: {
      A: { min: 90, max: 100, gpa: 4.0, description: 'Excellent' };
      B: { min: 80, max: 89, gpa: 3.0, description: 'Above Average' };
      C: { min: 70, max: 79, gpa: 2.0, description: 'Average' };
      D: { min: 60, max: 69, gpa: 1.0, description: 'Below Average' };
      F: { min: 0, max: 59, gpa: 0.0, description: 'Failing' };
    };
    weightedGPA: {
      honors: '+0.5';
      AP: '+1.0';
      IB: '+1.0';
    };
  };

  standardizedTests: {
    SAT: 'Scholastic Assessment Test';
    ACT: 'American College Testing';
    AP: 'Advanced Placement';
  };

  specialPrograms: {
    ap: 'Advanced Placement';
    ib: 'International Baccalaureate';
    dual: 'Dual Enrollment';
    honors: 'Honors Classes';
  };

  academicYear: {
    start: 'August/September';
    end: 'May/June';
    semesters: 2;
    quarters: 4;
  };
}
```

#### 🇨🇦 Canada
```typescript
interface CanadaEducation {
  system: {
    note: 'Education is provincial jurisdiction';
    structure: {
      elementary: 'K-6/7/8';
      secondary: '7/8/9-12';
    };
  };

  gradingSystem: {
    // Ontario example
    ontario: {
      scale: 'Percentage & Letter Grade';
      grades: {
        A: { min: 80, max: 100, description: 'Excellent' };
        B: { min: 70, max: 79, description: 'Good' };
        C: { min: 60, max: 69, description: 'Satisfactory' };
        D: { min: 50, max: 59, description: 'Pass' };
        F: { min: 0, max: 49, description: 'Fail' };
      };
      passingGrade: 50;
    };
    // British Columbia
    bc: {
      scale: 'Letter Grade (A-F)';
      descriptors: ['Emerging', 'Developing', 'Proficient', 'Extending'];
    };
  };

  assessments: {
    ontario: 'EQAO (Education Quality and Accountability Office)';
    bc: 'FSA (Foundation Skills Assessment)';
  };
}
```

### Europe

#### 🇬🇧 United Kingdom
```typescript
interface UKEducation {
  system: {
    structure: {
      primary: 'Year 1-6 (Ages 5-11)';
      secondary: 'Year 7-11 (Ages 11-16)';
      sixthForm: 'Year 12-13 (Ages 16-18)';
    };
  };

  gradingSystem: {
    gcse: {
      scale: '9-1';
      grades: {
        nine: { description: 'Highest grade', equivalent: 'A**' };
        eight: { description: 'High grade', equivalent: 'A*' };
        seven: { description: 'High grade', equivalent: 'A' };
        six: { description: 'Good grade', equivalent: 'B' };
        five: { description: 'Strong pass', equivalent: 'C' };
        four: { description: 'Standard pass', equivalent: 'C' };
        three: { description: 'Below pass', equivalent: 'D' };
        two: { description: 'Low grade', equivalent: 'E' };
        one: { description: 'Low grade', equivalent: 'F-G' };
        U: { description: 'Ungraded' };
      };
      passingGrade: 4;
    };
    aLevel: {
      scale: 'A*-E, U';
      grades: {
        AStar: { points: 56, description: 'Excellent' };
        A: { points: 48, description: 'Very Good' };
        B: { points: 40, description: 'Good' };
        C: { points: 32, description: 'Average' };
        D: { points: 24, description: 'Below Average' };
        E: { points: 16, description: 'Pass' };
        U: { points: 0, description: 'Ungraded/Fail' };
      };
    };
  };

  examinations: {
    keyStage1: 'SATs (Year 2)';
    keyStage2: 'SATs (Year 6)';
    keyStage4: 'GCSEs (Year 11)';
    keyStage5: 'A-Levels (Year 13)';
  };
}
```

#### 🇫🇷 France
```typescript
interface FranceEducation {
  system: {
    structure: {
      elementaire: 'CP-CM2 (Ages 6-11)';
      college: '6ème-3ème (Ages 11-15)';
      lycee: 'Seconde-Terminale (Ages 15-18)';
    };
  };

  gradingSystem: {
    scale: '0-20';
    grades: {
      excellent: { min: 16, max: 20, description: 'Très bien' };
      veryGood: { min: 14, max: 15.99, description: 'Bien' };
      good: { min: 12, max: 13.99, description: 'Assez bien' };
      average: { min: 10, max: 11.99, description: 'Passable' };
      failing: { min: 0, max: 9.99, description: 'Insuffisant' };
    };
    passingGrade: 10;
  };

  examinations: {
    brevet: 'Diplôme national du brevet (Grade 9)';
    baccalaureat: 'Baccalauréat (Grade 12)';
  };
}
```

#### 🇩🇪 Germany
```typescript
interface GermanyEducation {
  system: {
    structure: {
      grundschule: 'Primary (Grades 1-4)';
      secondary: {
        hauptschule: 'Grades 5-9';
        realschule: 'Grades 5-10';
        gymnasium: 'Grades 5-12/13';
        gesamtschule: 'Comprehensive school';
      };
    };
  };

  gradingSystem: {
    scale: '1-6';
    grades: {
      one: { description: 'sehr gut (very good)', percentage: '92-100' };
      two: { description: 'gut (good)', percentage: '81-91' };
      three: { description: 'befriedigend (satisfactory)', percentage: '67-80' };
      four: { description: 'ausreichend (sufficient)', percentage: '50-66' };
      five: { description: 'mangelhaft (poor)', percentage: '30-49' };
      six: { description: 'ungenügend (insufficient)', percentage: '0-29' };
    };
    passingGrade: 4;
  };

  examinations: {
    abitur: 'Abitur (University entrance qualification)';
  };
}
```

### International Programs

#### 🌍 International Baccalaureate (IB)
```typescript
interface IBProgram {
  programs: {
    PYP: {
      name: 'Primary Years Programme';
      ages: '3-12';
      grades: 'K-6';
    };
    MYP: {
      name: 'Middle Years Programme';
      ages: '11-16';
      grades: '6-10';
    };
    DP: {
      name: 'Diploma Programme';
      ages: '16-19';
      grades: '11-12';
      gradingSystem: {
        scale: '1-7';
        grades: {
          seven: { description: 'Excellent', percentage: '≥80' };
          six: { description: 'Very Good', percentage: '70-79' };
          five: { description: 'Good', percentage: '60-69' };
          four: { description: 'Satisfactory', percentage: '50-59' };
          three: { description: 'Mediocre', percentage: '40-49' };
          two: { description: 'Poor', percentage: '30-39' };
          one: { description: 'Very Poor', percentage: '<30' };
        };
        passingGrade: 24; // out of 45 points total
      };
      subjects: {
        groups: [
          'Language and Literature',
          'Language Acquisition',
          'Individuals and Societies',
          'Sciences',
          'Mathematics',
          'The Arts',
        ];
        core: ['TOK', 'EE', 'CAS'];
      };
    };
  };
}
```

#### 🌍 Cambridge International
```typescript
interface CambridgeInternational {
  programs: {
    primaryCheckpoint: {
      stage: 'Primary';
      ages: '5-11';
    };
    lowerSecondaryCheckpoint: {
      stage: 'Lower Secondary';
      ages: '11-14';
    };
    igcse: {
      name: 'International GCSE';
      ages: '14-16';
      gradingSystem: {
        scale: 'A*-G, U';
        grades: {
          AStar: { description: 'Excellent', percentage: '90-100' };
          A: { description: 'Very Good', percentage: '80-89' };
          B: { description: 'Good', percentage: '70-79' };
          C: { description: 'Satisfactory', percentage: '60-69' };
          D: { description: 'Pass', percentage: '50-59' };
          E: { description: 'Pass', percentage: '40-49' };
          F: { description: 'Fail', percentage: '30-39' };
          G: { description: 'Fail', percentage: '20-29' };
          U: { description: 'Ungraded', percentage: '<20' };
        };
      };
    };
    aLevel: {
      name: 'Advanced Level';
      ages: '16-19';
      // Similar grading to UK A-Levels
    };
  };
}
```

---

## 🔧 Implementation Strategy

### 1. Education System Configuration
```typescript
interface EducationSystemConfig {
  id: string;
  name: string;
  country: string;
  code: string; // 'KH', 'US', 'UK', etc.

  structure: {
    levels: EducationLevel[];
    progressionRules: ProgressionRule[];
  };

  grading: {
    system: GradingSystem;
    calculations: GradeCalculation;
    transcripts: TranscriptTemplate;
  };

  curriculum: {
    subjects: Subject[];
    requirements: Requirement[];
  };

  calendar: {
    academicYearStart: string; // Month
    academicYearEnd: string;
    terms: number;
    holidays: Holiday[];
  };

  compliance: {
    dataRetention: number; // years
    privacyLaws: string[];
    reportingRequirements: string[];
  };

  localization: {
    primaryLanguage: string;
    supportedLanguages: string[];
    dateFormat: string;
    timeFormat: string;
    numberFormat: string;
    currency: string;
  };
}
```

### 2. Grade Calculation Engine
```typescript
class GradeCalculationEngine {
  calculateFinalGrade(
    system: EducationSystemConfig,
    grades: Grade[]
  ): FinalGrade {
    switch (system.code) {
      case 'KH':
        return this.calculateCambodiaGrade(grades);
      case 'US':
        return this.calculateUSGrade(grades);
      case 'UK':
        return this.calculateUKGrade(grades);
      case 'IB':
        return this.calculateIBGrade(grades);
      default:
        return this.calculateStandardGrade(grades);
    }
  }

  private calculateCambodiaGrade(grades: Grade[]): FinalGrade {
    // Apply coefficients
    const weightedGrades = grades.map((g) => ({
      ...g,
      weighted: g.score * g.subject.coefficient,
    }));

    const totalScore = weightedGrades.reduce(
      (sum, g) => sum + g.weighted,
      0
    );
    const totalCoefficients = grades.reduce(
      (sum, g) => sum + g.subject.coefficient,
      0
    );

    const average = totalScore / totalCoefficients;

    // Determine letter grade
    const letterGrade = this.getKhmerLetterGrade(average);

    return {
      average,
      letterGrade,
      gpa: this.getKhmerGPA(average),
      passed: average >= 50,
    };
  }

  // Similar methods for other systems...
}
```

### 3. Multi-Language Support
```typescript
interface TranslationConfig {
  languages: {
    code: string; // 'en', 'km', 'th', etc.
    name: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
  }[];

  translations: {
    [key: string]: {
      [lang: string]: string;
    };
  };

  // Education-specific translations
  grades: {
    [systemCode: string]: {
      [lang: string]: {
        [grade: string]: string;
      };
    };
  };
}

// Example usage
const translations = {
  'grade.excellent': {
    en: 'Excellent',
    km: 'ល្អបំផុត',
    th: 'ดีเยี่ยม',
    vi: 'Xuất sắc',
    fr: 'Excellent',
  },
  'subject.mathematics': {
    en: 'Mathematics',
    km: 'គណិតវិទ្យា',
    th: 'คณิตศาสตร์',
    vi: 'Toán học',
    fr: 'Mathématiques',
  },
};
```

### 4. Compliance Framework
```typescript
interface ComplianceConfig {
  region: string;
  regulations: {
    gdpr?: GDPRConfig; // EU
    coppa?: COPPAConfig; // US - Children
    ferpa?: FERPAConfig; // US - Education
    pdpa?: PDPAConfig; // Singapore, Thailand
    pipeda?: PIPEDAConfig; // Canada
  };

  requirements: {
    dataRetention: {
      studentRecords: number; // years
      financialRecords: number;
      accessLogs: number;
    };
    reporting: {
      incidentReporting: boolean;
      dataBreachNotification: number; // hours
    };
    consent: {
      minAge: number;
      parentalConsentRequired: boolean;
      explicitConsent: boolean;
    };
  };
}
```

---

## 📚 Database Schema for Multi-System Support

```prisma
model EducationSystem {
  id                String    @id @default(cuid())
  code              String    @unique // KH, US, UK, IB, etc.
  name              String
  country           String

  // Configuration
  config            Json      // Full configuration object
  gradingSystem     Json      // Grading scale and calculations
  curriculum        Json      // Standard subjects and requirements
  calendar          Json      // Academic year structure

  // Schools using this system
  schools           School[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model School {
  id                String    @id @default(cuid())
  name              String

  // Education System
  educationSystemId String
  educationSystem   EducationSystem @relation(fields: [educationSystemId], references: [id])

  // Custom Configuration (overrides)
  customGrading     Json?     // School-specific grading adjustments
  customSubjects    Json?     // Additional subjects

  // Localization
  primaryLanguage   String    @default("en")
  languages         String[]  // ['en', 'km', 'th']

  // Compliance
  region            String
  timezone          String
  currency          String

  // Relations
  students          Student[]
  teachers          Teacher[]
  classes           Class[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Subject {
  id                String    @id @default(cuid())
  schoolId          String
  code              String    // MATH, PHYS, etc.

  // Multi-language names
  nameEn            String
  nameKm            String?
  nameTh            String?
  nameLocal         String?   // For other languages

  // System-specific
  coefficient       Float?    // For Cambodia, France
  credits           Float?    // For US
  weighting         String?   // For IB (HL/SL)

  // Grading
  maxScore          Float
  passingScore      Float

  school            School    @relation(fields: [schoolId], references: [id])
  grades            Grade[]

  @@unique([schoolId, code])
}

model Grade {
  id                String    @id @default(cuid())
  studentId         String
  subjectId         String

  // Scores
  score             Float
  maxScore          Float
  percentage        Float

  // System-specific
  letterGrade       String?   // A, B, C (US, UK)
  numericGrade      Float?    // 1-7 (IB), 1-20 (France)
  gpa               Float?    // US system
  points            Int?      // UCAS points (UK)

  // Metadata
  gradedBy          String
  gradedAt          DateTime

  student           Student   @relation(fields: [studentId], references: [id])
  subject           Subject   @relation(fields: [subjectId], references: [id])
}
```

---

## 🚀 Implementation Priority

### Phase 1 (Month 1-2)
- ✅ Cambodia system (Primary)
- ✅ US system
- ✅ UK system
- ✅ IB program

### Phase 2 (Month 3-4)
- ✅ Thailand
- ✅ Vietnam
- ✅ Singapore
- ✅ India (CBSE)

### Phase 3 (Month 5-6)
- ✅ France
- ✅ Germany
- ✅ Canada
- ✅ Australia

### Phase 4 (Month 7+)
- ✅ Other ASEAN countries
- ✅ Middle East
- ✅ Latin America
- ✅ Africa

---

## 📊 Success Metrics

- **Systems Supported**: 20+ education systems
- **Countries**: 50+ countries
- **Languages**: 50+ languages
- **Compliance**: 10+ regional regulations
- **Schools**: Support diverse school types

---

**Document Version**: 1.0
**Last Updated**: January 18, 2026
**Status**: Ready for Implementation
