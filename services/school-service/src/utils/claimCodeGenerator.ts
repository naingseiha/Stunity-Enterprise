/**
 * Claim Code Generator
 * 
 * Generates secure, unique claim codes for linking school accounts
 * Format: TYPE-XXXX-XXXX (e.g., STNT-AB12-CD34, TCHR-XY78-ZW90)
 */

import crypto from 'crypto';
import { ClaimCodeType } from '@prisma/client';

export interface ClaimCodeConfig {
  type: ClaimCodeType;
  schoolId: string;
  studentId?: string;
  teacherId?: string;
  expiresInDays?: number;
  verificationData?: {
    name: string;
    dateOfBirth?: string;
    studentId?: string;
    email?: string;
  };
}

export interface ClaimCodeValidation {
  valid: boolean;
  code?: string;
  type?: ClaimCodeType;
  schoolId?: string;
  schoolName?: string;
  recordData?: {
    name: string;
    class?: string;
    studentId?: string;
    email?: string;
  };
  error?: string;
}

class ClaimCodeGenerator {
  /**
   * Generate a unique claim code
   */
  static generateCode(type: ClaimCodeType): string {
    const prefix = this.getPrefix(type);
    
    // Generate two 4-character segments using crypto for security
    const segment1 = this.generateSegment(4);
    const segment2 = this.generateSegment(4);
    
    return `${prefix}-${segment1}-${segment2}`;
  }

  /**
   * Generate a random alphanumeric segment
   * Uses crypto.randomBytes for cryptographic security
   */
  private static generateSegment(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0,O,1,I)
    const bytes = crypto.randomBytes(length);
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    
    return result;
  }

  /**
   * Get prefix for claim code type
   */
  private static getPrefix(type: ClaimCodeType): string {
    switch (type) {
      case 'STUDENT': return 'STNT';
      case 'TEACHER': return 'TCHR';
      case 'STAFF': return 'STAF';
      case 'PARENT': return 'PRNT';
      default: return 'USER';
    }
  }

  /**
   * Generate expiration date
   */
  static generateExpirationDate(days: number = 365): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  /**
   * Validate claim code format
   */
  static validateFormat(code: string): boolean {
    // Format: XXXX-XXXX-XXXX
    const pattern = /^[A-Z]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(code);
  }

  /**
   * Extract type from claim code
   */
  static extractType(code: string): ClaimCodeType | null {
    const prefix = code.substring(0, 4);
    
    switch (prefix) {
      case 'STNT': return 'STUDENT';
      case 'TCHR': return 'TEACHER';
      case 'STAF': return 'STAFF';
      case 'PRNT': return 'PARENT';
      default: return null;
    }
  }

  /**
   * Generate batch of claim codes
   * Useful for bulk student/teacher imports
   */
  static generateBatch(
    type: ClaimCodeType,
    count: number,
    config: Partial<ClaimCodeConfig> = {}
  ): string[] {
    const codes: string[] = [];
    const uniqueCodes = new Set<string>();
    
    // Keep generating until we have enough unique codes
    while (uniqueCodes.size < count) {
      const code = this.generateCode(type);
      uniqueCodes.add(code);
    }
    
    return Array.from(uniqueCodes);
  }

  /**
   * Create verification data for claim code
   */
  static createVerificationData(data: {
    name: string;
    dateOfBirth?: string;
    studentId?: string;
    email?: string;
  }): any {
    return {
      name: data.name.trim(),
      dateOfBirth: data.dateOfBirth,
      studentId: data.studentId,
      email: data.email,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Verify that provided data matches verification data
   */
  static verifyData(
    provided: { name?: string; dateOfBirth?: string },
    stored: any
  ): { matches: boolean; reason?: string } {
    // Normalize names for comparison (lowercase, trim, remove extra spaces)
    const normalizeName = (name: string) => 
      name.toLowerCase().trim().replace(/\s+/g, ' ');

    // Check name match (required)
    if (provided.name) {
      const providedName = normalizeName(provided.name);
      const storedName = normalizeName(stored.name);
      
      if (providedName !== storedName) {
        return {
          matches: false,
          reason: 'Name does not match school records',
        };
      }
    }

    // Check date of birth if both provided and stored
    if (provided.dateOfBirth && stored.dateOfBirth) {
      if (provided.dateOfBirth !== stored.dateOfBirth) {
        return {
          matches: false,
          reason: 'Date of birth does not match school records',
        };
      }
    }

    return { matches: true };
  }

  /**
   * Generate printable claim code card data
   * Returns data needed for PDF/card generation
   */
  static generateCardData(config: {
    code: string;
    type: ClaimCodeType;
    schoolName: string;
    studentName?: string;
    teacherName?: string;
    className?: string;
    validUntil: Date;
    instructions?: string;
  }): any {
    const typeName = config.type === 'STUDENT' ? 'Student' : 'Teacher';
    
    return {
      code: config.code,
      type: typeName,
      schoolName: config.schoolName,
      name: config.studentName || config.teacherName,
      className: config.className,
      validUntil: config.validUntil.toLocaleDateString(),
      instructions: config.instructions || this.getDefaultInstructions(config.type),
      qrCode: this.generateQRData(config.code),
    };
  }

  /**
   * Generate data for QR code
   */
  private static generateQRData(code: string): string {
    // Return URL or JSON that mobile app can scan
    return JSON.stringify({
      type: 'STUNITY_CLAIM_CODE',
      code,
      version: '1.0',
    });
  }

  /**
   * Get default instructions for claim code type
   */
  private static getDefaultInstructions(type: ClaimCodeType): string {
    const baseUrl = 'https://stunity.edu.kh'; // Replace with actual URL
    
    switch (type) {
      case 'STUDENT':
        return `
1. Download Stunity app from App Store or Google Play
2. Tap "Create Account" or "Link School Account"
3. Enter this claim code when prompted
4. Complete your profile
5. Start connecting with classmates!

Need help? Visit ${baseUrl}/help
        `.trim();
        
      case 'TEACHER':
        return `
1. Download Stunity app from App Store or Google Play
2. Tap "Create Account" or "Link School Account"
3. Enter this claim code when prompted
4. Complete your profile
5. Start managing your classes!

Need help? Visit ${baseUrl}/help
        `.trim();
        
      default:
        return `Enter this code in the Stunity app to link your account.`;
    }
  }

  /**
   * Check if claim code is expired
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Calculate days until expiration
   */
  static daysUntilExpiration(expiresAt: Date): number {
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Format claim code for display (add dashes if missing)
   */
  static formatCode(code: string): string {
    // Remove any existing dashes
    const clean = code.replace(/-/g, '').toUpperCase();
    
    // Add dashes in correct positions
    if (clean.length === 12) {
      return `${clean.substring(0, 4)}-${clean.substring(4, 8)}-${clean.substring(8, 12)}`;
    }
    
    return code.toUpperCase();
  }

  /**
   * Sanitize user input (remove spaces, dashes, lowercase)
   */
  static sanitizeInput(input: string): string {
    return input.replace(/[\s-]/g, '').toUpperCase();
  }
}

export default ClaimCodeGenerator;
