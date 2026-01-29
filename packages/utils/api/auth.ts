import { apiClient } from "./client";

export interface LoginCredentials {
  identifier: string; // ✅ Can be: studentCode, phone, or email
  password: string;
  studentCode?: string; // ✅ Optional explicit student code field
}

export interface User {
  id: string;
  phone?: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePictureUrl?: string; // ✅ ADDED: Profile picture URL
  coverPhotoUrl?: string; // ✅ ADDED: Cover photo URL
  teacher?: any;
  student?: any;
  permissions?: any;
  isSuperAdmin?: boolean;
}

interface LoginResponseData {
  token: string;
  expiresIn: string;
  user: User;
}

export const authApi = {
  async login(
    credentials: LoginCredentials
  ): Promise<{ token: string; user: User; expiresIn: string }> {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📤 Calling login API...");
      console.log("  - Identifier:", credentials.identifier);

      // ✅ Smart detection: email, phone, or studentCode
      const isEmail = credentials.identifier.includes("@");
      // Phone: starts with 0 and 9-10 digits (Cambodian format)
      const isPhone = /^0\d{8,9}$/.test(credentials.identifier);
      // Student code: 8 digits NOT starting with 0, or any non-numeric
      const isStudentCode = !isEmail && !isPhone;
      
      let loginPayload: any = {
        password: credentials.password,
      };

      // Determine which field to use
      if (isEmail) {
        loginPayload.email = credentials.identifier;
        console.log("  - Sending as: email");
      } else if (isPhone) {
        loginPayload.phone = credentials.identifier;
        console.log("  - Sending as: phone");
      } else {
        // Student code or any other identifier
        loginPayload.studentCode = credentials.identifier;
        console.log("  - Sending as: studentCode");
      }

      const data = await apiClient.post<LoginResponseData>(
        "/auth/login",
        loginPayload
      );

      console.log("✅ Login API response received:");
      console.log("  - Token:", data.token ? "Present" : "Missing");
      console.log("  - Token length:", data.token?.length || 0);
      console.log("  - User:", data.user?.email || data.user?.phone);
      console.log("  - Role:", data.user?.role);
      console.log("  - profilePictureUrl:", data.user?.profilePictureUrl || "❌ MISSING"); // DEBUG
      console.log("  - coverPhotoUrl:", data.user?.coverPhotoUrl || "❌ MISSING"); // DEBUG
      console.log("  - Expires in:", data.expiresIn);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (!data.token) {
        throw new Error("No token received from server");
      }

      if (!data.user) {
        throw new Error("No user data received from server");
      }

      return {
        token: data.token,
        user: data.user,
        expiresIn: data.expiresIn || "7d",
      };
    } catch (error: any) {
      console.error("❌ Login API error:", error);
      throw error;
    }
  },

  async getCurrentUser(useCache: boolean = false): Promise<User> {
    try {
      console.log("📤 Getting current user...");
      const user = await apiClient.get<User>("/auth/me", useCache);
      console.log("✅ Current user:", user.email || user.phone);
      return user;
    } catch (error: any) {
      console.error("❌ Get current user error:", error);
      throw error;
    }
  },

  async refreshToken(): Promise<string> {
    try {
      console.log("🔄 Refreshing token...");
      const data = await apiClient.post<{ token: string; expiresIn: string }>(
        "/auth/refresh"
      );
      console.log("✅ Token refreshed");
      return data.token;
    } catch (error: any) {
      console.error("❌ Refresh token error:", error);
      throw error;
    }
  },

  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      console.log("🔐 Changing password.. .");
      await apiClient.post("/auth/change-password", {
        oldPassword,
        newPassword,
      });
      console.log("✅ Password changed");
    } catch (error: any) {
      console.error("❌ Change password error:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      console.log("👋 Logging out...");
      await apiClient.post("/auth/logout", {});
      console.log("✅ Logged out");
    } catch (error: any) {
      console.error("❌ Logout error:", error);
      throw error;
    }
  },
};
