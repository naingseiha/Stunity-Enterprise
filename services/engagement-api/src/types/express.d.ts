/**
 * One shared Express.Request.user shape for the whole Engagement API process.
 *
 * `passport` (a dependency of the auth module) already declares
 * `Express.Request.user?: Express.User` globally. Before consolidation, each
 * service was compiled as its own separate TS program, so messaging/analytics
 * could each safely redeclare `Request.user` with their own inline object
 * type. Now that everything shares one `tsc` program, a second `Request.user`
 * redeclaration conflicts with passport's (TS2717: "Subsequent property
 * declarations must have the same type"). The fix is to augment
 * `Express.User` instead — passport's own `Request.user?: User` reference
 * then simply resolves against these fields, additively, with no conflict.
 */
declare global {
  namespace Express {
    interface User {
      id?: string;
      userId?: string;
      email?: string;
      phone?: string;
      role?: string;
      schoolId?: string;
      teacherId?: string;
      parentId?: string;
      isSuperAdmin?: boolean;
      children?: Array<{ id: string; firstName: string; lastName: string }>;
      [key: string]: any;
    }
  }
}

export {};
