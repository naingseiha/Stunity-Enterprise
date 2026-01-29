export interface Teacher {
  id: string;
  name: string;
  khmerName: string;
  gender: "male" | "female";
  dateOfBirth?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  subjectIds?: string[];
  hireDate?: string;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}
