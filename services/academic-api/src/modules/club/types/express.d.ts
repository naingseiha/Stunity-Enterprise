declare global {
  namespace Express {
    interface Request {
      // Loose on purpose: in the consolidated Academic API each module still
      // declares its own AuthRequest shape (id vs userId, schoolId, …); a
      // strict shape here would conflict with those per-module interfaces.
      user?: any;
    }
  }
}

export {};
