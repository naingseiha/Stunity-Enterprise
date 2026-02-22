/**
 * Augment Express Request to include our auth user shape.
 * This resolves AuthRequest type mismatch with Express middleware.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        phone?: string;
        role: string;
        schoolId: string;
        teacherId?: string;
        parentId?: string;
        children?: Array<{ id: string; firstName: string; lastName: string }>;
      };
    }
  }
}

export {};
