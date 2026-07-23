/**
 * ID Generator for Students and Teachers
 * 
 * Generates meaningful, standards-compliant IDs with three formats:
 * - STRUCTURED: Full demographic encoding (Cambodia/ASEAN compliant)
 * - SIMPLIFIED: Privacy-friendly sequential IDs (GDPR compliant)
 * - HYBRID: Balanced approach with some structure
 * 
 * All IDs include Luhn check digits for error detection
 */

import { IdFormat, Gender, SchoolType } from '@prisma/client';
import crypto from 'crypto';

export interface IdGeneratorConfig {
  format: IdFormat;
  schoolCode: string;
  countryCode?: string;
  entryYear?: number;
  hireYear?: number;
  gender?: Gender | null;
  educationLevel?: string;
  classCode?: string;
  departmentCode?: string;
  sequentialNumber: number;
}

export interface StudentIdParams {
  gender?: Gender | null;
  entryYear?: number;
  classId?: string;
  schoolType?: SchoolType;
}

export interface TeacherIdParams {
  gender?: Gender | null;
  hireYear?: number;
  hireDate?: string;
  subjectId?: string;
  position?: string;
}

class IdGenerator {
  /**
   * Generate Student ID based on school's configured format
   */
  static generateStudentId(
    format: IdFormat,
    schoolCode: string,
    student: StudentIdParams,
    sequentialNumber: number
  ): string {
    const config: IdGeneratorConfig = {
      format,
      schoolCode: schoolCode || '01',
      entryYear: student.entryYear || new Date().getFullYear(),
      gender: student.gender,
      educationLevel: this.determineEducationLevel(student.schoolType),
      classCode: student.classId?.toString().padStart(3, '0'),
      sequentialNumber,
    };

    switch (format) {
      case 'STRUCTURED':
        return this.generateStructuredStudentId(config);
      case 'SIMPLIFIED':
        return this.generateSimplifiedStudentId(config);
      case 'HYBRID':
        return this.generateHybridStudentId(config);
      default:
        return this.generateSimplifiedStudentId(config);
    }
  }

  /**
   * Generate Teacher ID
   */
  static generateTeacherId(
    format: IdFormat,
    schoolCode: string,
    teacher: TeacherIdParams,
    sequentialNumber: number
  ): string {
    // Parse hire year from hireDate if available
    let hireYear = teacher.hireYear;
    if (!hireYear && teacher.hireDate) {
      try {
        hireYear = new Date(teacher.hireDate).getFullYear();
      } catch (e) {
        hireYear = new Date().getFullYear();
      }
    }
    hireYear = hireYear || new Date().getFullYear();

    const config: IdGeneratorConfig = {
      format,
      schoolCode: schoolCode || '01',
      entryYear: hireYear,
      gender: teacher.gender,
      departmentCode: teacher.subjectId?.toString().padStart(4, '0') || '0001',
      sequentialNumber,
    };

    switch (format) {
      case 'STRUCTURED':
        return this.generateStructuredTeacherId(config);
      case 'SIMPLIFIED':
        return this.generateSimplifiedTeacherId(config);
      case 'HYBRID':
        return this.generateHybridTeacherId(config);
      default:
        return this.generateSimplifiedTeacherId(config);
    }
  }

  // ==================== STRUCTURED FORMAT ====================

  /**
   * Generate structured student ID: GSYY-SSCCC-NNNN-C
   * Example: 1325-12007-0001-4 (Female, High School, 2025, School 12, Class 7, #1)
   */
  private static generateStructuredStudentId(config: IdGeneratorConfig): string {
    const G = this.encodeGender(config.gender);
    const S = this.encodeEducationLevel(config.educationLevel);
    const YY = (config.entryYear! % 100).toString().padStart(2, '0');
    const SS = config.schoolCode.padStart(2, '0').substring(0, 2);
    const CCC = (config.classCode || '001').padStart(3, '0').substring(0, 3);
    const NNNN = config.sequentialNumber.toString().padStart(4, '0');
    
    const idWithoutCheck = `${G}${S}${YY}${SS}${CCC}${NNNN}`;
    const checkDigit = this.calculateLuhnCheckDigit(idWithoutCheck);
    
    return `${G}${S}${YY}-${SS}${CCC}-${NNNN}-${checkDigit}`;
  }

  /**
   * Generate structured teacher ID: TGG-SSYY-DDDD-C
   * Example: T01-1225-1001-8 (Teacher, Female, School 12, 2025, Dept 1001)
   */
  private static generateStructuredTeacherId(config: IdGeneratorConfig): string {
    const GG = this.encodeGender2Digit(config.gender);
    const SS = config.schoolCode.padStart(2, '0').substring(0, 2);
    const YY = (config.entryYear! % 100).toString().padStart(2, '0');
    const DDDD = (config.departmentCode || '0001').padStart(4, '0').substring(0, 4);
    
    const idWithoutCheck = `T${GG}${SS}${YY}${DDDD}`;
    const checkDigit = this.calculateLuhnCheckDigit(idWithoutCheck);
    
    return `T${GG}-${SS}${YY}-${DDDD}-${checkDigit}`;
  }

  // ==================== SIMPLIFIED FORMAT ====================

  /**
   * Generate simplified student ID: S-XXXXXX-C
   * Example: S-000001-7
   */
  private static generateSimplifiedStudentId(config: IdGeneratorConfig): string {
    const XXXXXX = config.sequentialNumber.toString().padStart(6, '0');
    const checkDigit = this.calculateLuhnCheckDigit(`S${XXXXXX}`);
    
    return `S-${XXXXXX}-${checkDigit}`;
  }

  /**
   * Generate simplified teacher ID: T-XXXXXX-C
   * Example: T-000045-3
   */
  private static generateSimplifiedTeacherId(config: IdGeneratorConfig): string {
    const XXXXXX = config.sequentialNumber.toString().padStart(6, '0');
    const checkDigit = this.calculateLuhnCheckDigit(`T${XXXXXX}`);
    
    return `T-${XXXXXX}-${checkDigit}`;
  }

  // ==================== HYBRID FORMAT ====================

  /**
   * Generate hybrid student ID: SYYL-NNNNNN-C
   * Example: A25H-000123-4 (School A, 2025, High School, #123)
   */
  private static generateHybridStudentId(config: IdGeneratorConfig): string {
    const S = config.schoolCode.charAt(0).toUpperCase();
    const YY = (config.entryYear! % 100).toString().padStart(2, '0');
    const L = this.encodeEducationLevelLetter(config.educationLevel);
    const NNNNNN = config.sequentialNumber.toString().padStart(6, '0');
    
    const idWithoutCheck = `${S}${YY}${L}${NNNNNN}`;
    const checkDigit = this.calculateLuhnCheckDigit(idWithoutCheck);
    
    return `${S}${YY}${L}-${NNNNNN}-${checkDigit}`;
  }

  /**
   * Generate hybrid teacher ID: TSYY-NNNNNN-C
   * Example: TA25-000045-1 (School A, 2025, Teacher #45)
   */
  private static generateHybridTeacherId(config: IdGeneratorConfig): string {
    const S = config.schoolCode.charAt(0).toUpperCase();
    const YY = (config.entryYear! % 100).toString().padStart(2, '0');
    const NNNNNN = config.sequentialNumber.toString().padStart(6, '0');
    
    const idWithoutCheck = `T${S}${YY}${NNNNNN}`;
    const checkDigit = this.calculateLuhnCheckDigit(idWithoutCheck);
    
    return `T${S}${YY}-${NNNNNN}-${checkDigit}`;
  }

  // ==================== ENCODING HELPERS ====================

  /**
   * Encode gender as single digit (Cambodia standard)
   * 1 = Female, 2 = Male, 9 = Other
   */
  private static encodeGender(gender?: Gender | null): string {
    switch (gender) {
      case 'FEMALE': return '1';
      case 'MALE': return '2';
      default: return '9';
    }
  }

  /**
   * Encode gender as two digits
   * 01 = Female, 02 = Male, 99 = Other
   */
  private static encodeGender2Digit(gender?: Gender | null): string {
    switch (gender) {
      case 'FEMALE': return '01';
      case 'MALE': return '02';
      default: return '99';
    }
  }

  /**
   * Encode education level as single digit
   * 1=Primary, 2=Middle, 3=High, 4=University, 5=Vocational
   */
  private static encodeEducationLevel(level?: string): string {
    switch (level) {
      case 'PRIMARY': return '1';
      case 'MIDDLE': return '2';
      case 'HIGH': return '3';
      case 'UNIVERSITY': return '4';
      case 'VOCATIONAL': return '5';
      default: return '3'; // Default to high school
    }
  }

  /**
   * Encode education level as letter
   * P=Primary, M=Middle, H=High, U=University, V=Vocational
   */
  private static encodeEducationLevelLetter(level?: string): string {
    switch (level) {
      case 'PRIMARY': return 'P';
      case 'MIDDLE': return 'M';
      case 'HIGH': return 'H';
      case 'UNIVERSITY': return 'U';
      case 'VOCATIONAL': return 'V';
      default: return 'H';
    }
  }

  /**
   * Determine education level from school type
   */
  private static determineEducationLevel(schoolType?: SchoolType): string {
    switch (schoolType) {
      case 'PRIMARY_SCHOOL':
        return 'PRIMARY';
      case 'MIDDLE_SCHOOL':
        return 'MIDDLE';
      case 'HIGH_SCHOOL':
        return 'HIGH';
      case 'COMPLETE_SCHOOL':
        return 'HIGH'; // Default to high for complete schools
      case 'INTERNATIONAL':
        return 'HIGH';
      default:
        return 'HIGH';
    }
  }

  // ==================== CHECK DIGIT (Luhn Algorithm) ====================

  /**
   * Calculate Luhn check digit for ID validation
   * Prevents transcription errors (typos, swapped digits)
   * 
   * @see https://en.wikipedia.org/wiki/Luhn_algorithm
   */
  private static calculateLuhnCheckDigit(id: string): number {
    // Convert to numbers only (remove letters, dashes)
    const digitsOnly = id.replace(/\D/g, '');
    
    // Convert letters to numbers (A=1, B=2, etc.) for alphanumeric IDs
    let numericString = '';
    for (const char of id.toUpperCase()) {
      if (char >= 'A' && char <= 'Z') {
        numericString += (char.charCodeAt(0) - 64).toString();
      } else if (char >= '0' && char <= '9') {
        numericString += char;
      }
    }
    
    const digits = numericString || digitsOnly;
    let sum = 0;
    let shouldDouble = true;
    
    // Process from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    // Check digit makes sum divisible by 10
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Validate ID check digit
   */
  static validateCheckDigit(fullId: string): boolean {
    const parts = fullId.split('-');
    if (parts.length === 0) return false;
    
    try {
      const checkDigit = parseInt(parts[parts.length - 1]);
      const idWithoutCheck = fullId.substring(0, fullId.lastIndexOf('-'));
      
      return this.calculateLuhnCheckDigit(idWithoutCheck) === checkDigit;
    } catch (e) {
      return false;
    }
  }

  // ==================== PERMANENT ID ====================

  /**
   * Generate permanent UUID-based ID that never changes
   * Used as fallback and for database relationships
   */
  static generatePermanentId(prefix: 'STU' | 'TCH'): string {
    const uuid = crypto.randomUUID();
    return `${prefix}-${uuid}`;
  }

  // ==================== METADATA GENERATION ====================

  /**
   * Generate metadata for student ID
   */
  static generateStudentMetadata(
    format: IdFormat,
    student: StudentIdParams,
    sequentialNumber: number
  ): any {
    return {
      format,
      gender: student.gender,
      entryYear: student.entryYear || new Date().getFullYear(),
      educationLevel: this.determineEducationLevel(student.schoolType),
      classCode: student.classId,
      sequentialNumber,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate metadata for teacher ID
   */
  static generateTeacherMetadata(
    format: IdFormat,
    teacher: TeacherIdParams,
    sequentialNumber: number
  ): any {
    let hireYear = teacher.hireYear;
    if (!hireYear && teacher.hireDate) {
      try {
        hireYear = new Date(teacher.hireDate).getFullYear();
      } catch (e) {
        hireYear = new Date().getFullYear();
      }
    }

    return {
      format,
      gender: teacher.gender,
      hireYear: hireYear || new Date().getFullYear(),
      departmentCode: teacher.subjectId,
      position: teacher.position,
      sequentialNumber,
      generatedAt: new Date().toISOString(),
    };
  }
}

export default IdGenerator;
