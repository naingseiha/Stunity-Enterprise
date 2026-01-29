export interface User {
  id: string;
  username: string;
  password: string;
  role: 'superadmin' | 'classteacher' | 'teacher' | 'student';
  name: string;
  phone?: string;
  email?: string;
  teacherId?: string;
  studentId?: string;
}

export interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}