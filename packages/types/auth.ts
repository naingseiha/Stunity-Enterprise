// Authentication Types

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "CLASS_TEACHER";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string; // Optional for backward compatibility
  lastName?: string; // Optional for backward compatibility
  role: UserRole;
}

// For backward compatibility with existing components
export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  name: string; // Full name
  role: string; // Mapped role (lowercase)
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
  };
}

export interface AuthState {
  user: User | null;
  currentUser?: CurrentUser | null; // For backward compatibility
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
