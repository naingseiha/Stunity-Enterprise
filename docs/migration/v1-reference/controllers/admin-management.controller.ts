import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * GET ADMIN ACCOUNTS LIST
 * Retrieve all admin accounts with security information
 */
export const getAdminAccounts = async (req: Request, res: Response) => {
  try {
    console.log("📋 Fetching admin accounts...");

    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isSuperAdmin: true,
        isDefaultPassword: true,
        permissions: true,
        passwordChangedAt: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        accountSuspendedAt: true,
        suspensionReason: true,
        loginCount: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Found ${admins.length} admin accounts`);
    res.json({ data: admins });
  } catch (error: any) {
    console.error("❌ Error fetching admin accounts:", error);
    res.status(500).json({
      error: "Failed to fetch admin accounts",
      details: error.message,
    });
  }
};

/**
 * GET ADMIN STATISTICS
 * Get overview statistics for admin accounts
 */
export const getAdminStatistics = async (req: Request, res: Response) => {
  try {
    console.log("📊 Fetching admin statistics...");

    const totalAdmins = await prisma.user.count({
      where: { role: "ADMIN" },
    });

    const activeAdmins = await prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
        accountSuspendedAt: null,
      },
    });

    const suspendedAdmins = await prisma.user.count({
      where: {
        role: "ADMIN",
        accountSuspendedAt: { not: null },
      },
    });

    const defaultPasswordCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        isDefaultPassword: true,
      },
    });

    const stats = {
      totalAdmins,
      activeAdmins,
      suspendedAdmins,
      defaultPasswordCount,
      inactiveAdmins: totalAdmins - activeAdmins,
    };

    console.log("✅ Admin statistics:", stats);
    res.json({ data: stats });
  } catch (error: any) {
    console.error("❌ Error fetching admin statistics:", error);
    res.status(500).json({
      error: "Failed to fetch admin statistics",
      details: error.message,
    });
  }
};

/**
 * UPDATE ADMIN PASSWORD
 * Admin can change their own password or another admin's password
 */
export const updateAdminPassword = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { newPassword, currentPassword } = req.body;
    const currentUserId = (req as any).userId;

    console.log(`🔐 Updating password for admin: ${adminId}`);

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    // Find the admin to update
    const admin = await prisma.user.findUnique({
      where: { id: adminId, role: "ADMIN" },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // If updating own password, verify current password
    if (adminId === currentUserId && currentPassword) {
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        admin.password
      );
      if (!isValidPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: adminId },
      data: {
        password: hashedPassword,
        isDefaultPassword: false,
        passwordChangedAt: new Date(),
        lastPasswordHashes: {
          push: admin.password, // Store old hash
        },
      },
    });

    console.log("✅ Admin password updated successfully");
    res.json({
      data: {
        message: "Password updated successfully",
        adminId,
        passwordChangedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating admin password:", error);
    res.status(500).json({
      error: "Failed to update password",
      details: error.message,
    });
  }
};

/**
 * CREATE NEW ADMIN ACCOUNT
 * Create a new admin user
 */
export const createAdminAccount = async (req: Request, res: Response) => {
  try {
    const { email, phone, firstName, lastName, password } = req.body;

    console.log("📝 Creating new admin account...");

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        error: "First name and last name are required",
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        error: "Either email or phone is required",
      });
    }

    // Check if email/phone already exists
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }

    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        return res.status(400).json({ error: "Phone number already exists" });
      }
    }

    // Generate default password if not provided
    const defaultPassword = password || `Admin${Math.floor(Math.random() * 10000)}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create admin user
    const newAdmin = await prisma.user.create({
      data: {
        email,
        phone,
        firstName,
        lastName,
        password: hashedPassword,
        role: "ADMIN",
        isDefaultPassword: !password, // Mark as default if auto-generated
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log("✅ Admin account created:", newAdmin.id);
    res.status(201).json({
      data: {
        admin: newAdmin,
        defaultPassword: !password ? defaultPassword : undefined,
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating admin account:", error);
    res.status(500).json({
      error: "Failed to create admin account",
      details: error.message,
    });
  }
};

/**
 * TOGGLE ADMIN STATUS
 * Activate or deactivate an admin account
 */
export const toggleAdminStatus = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { isActive, reason } = req.body;
    const currentUserId = (req as any).userId;

    console.log(`🔄 Toggling admin status: ${adminId}`);

    // Prevent self-deactivation
    if (adminId === currentUserId && !isActive) {
      return res.status(400).json({
        error: "You cannot deactivate your own account",
      });
    }

    // Check if admin exists
    const admin = await prisma.user.findUnique({
      where: { id: adminId, role: "ADMIN" },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Update status
    await prisma.user.update({
      where: { id: adminId },
      data: {
        isActive,
        accountSuspendedAt: !isActive ? new Date() : null,
        suspensionReason: !isActive ? reason : null,
      },
    });

    console.log(`✅ Admin ${isActive ? "activated" : "deactivated"}`);
    res.json({
      data: {
        message: `Admin account ${isActive ? "activated" : "deactivated"} successfully`,
        adminId,
        isActive,
      },
    });
  } catch (error: any) {
    console.error("❌ Error toggling admin status:", error);
    res.status(500).json({
      error: "Failed to toggle admin status",
      details: error.message,
    });
  }
};

/**
 * DELETE ADMIN ACCOUNT
 * Permanently delete an admin account
 */
export const deleteAdminAccount = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const currentUserId = (req as any).userId;

    console.log(`🗑️ Deleting admin account: ${adminId}`);

    // Prevent self-deletion
    if (adminId === currentUserId) {
      return res.status(400).json({
        error: "You cannot delete your own account",
      });
    }

    // Check if admin exists
    const admin = await prisma.user.findUnique({
      where: { id: adminId, role: "ADMIN" },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if this is the last admin
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });

    if (adminCount <= 1) {
      return res.status(400).json({
        error: "Cannot delete the last active admin account",
      });
    }

    // Delete admin
    await prisma.user.delete({
      where: { id: adminId },
    });

    console.log("✅ Admin account deleted");
    res.json({
      data: {
        message: "Admin account deleted successfully",
        adminId,
      },
    });
  } catch (error: any) {
    console.error("❌ Error deleting admin account:", error);
    res.status(500).json({
      error: "Failed to delete admin account",
      details: error.message,
    });
  }
};

/**
 * GET AVAILABLE PERMISSIONS
 * Retrieve list of all available permissions
 */
export const getAvailablePermissions = async (req: Request, res: Response) => {
  try {
    console.log("📋 Fetching available permissions...");

    const permissions = {
      VIEW_DASHBOARD: { label: 'View Dashboard', category: 'dashboard' },
      MANAGE_STUDENTS: { label: 'Manage Students', category: 'students' },
      MANAGE_TEACHERS: { label: 'Manage Teachers', category: 'teachers' },
      MANAGE_CLASSES: { label: 'Manage Classes', category: 'academic' },
      MANAGE_SUBJECTS: { label: 'Manage Subjects', category: 'academic' },
      MANAGE_GRADES: { label: 'Manage Grades', category: 'grades' },
      MANAGE_ATTENDANCE: { label: 'Manage Attendance', category: 'attendance' },
      VIEW_REPORTS: { label: 'View Reports', category: 'reports' },
      VIEW_AWARD_REPORT: { label: 'View Award Reports', category: 'reports' },
      VIEW_TRACKING_BOOK: { label: 'View Tracking Book', category: 'reports' },
      VIEW_SETTINGS: { label: 'Access Settings', category: 'settings' },
      MANAGE_ADMINS: { label: 'Manage Admins', category: 'admin' },
    };

    res.json({ data: permissions });
  } catch (error: any) {
    console.error("❌ Error fetching permissions:", error);
    res.status(500).json({
      error: "Failed to fetch permissions",
      details: error.message,
    });
  }
};

/**
 * GET ADMIN PERMISSIONS
 * Retrieve permissions for a specific admin
 */
export const getAdminPermissions = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    console.log(`📋 Fetching permissions for admin: ${adminId}`);

    const admin = await prisma.user.findUnique({
      where: { id: adminId, role: "ADMIN" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        permissions: true,
        isSuperAdmin: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Parse permissions from JSON
    let permissions: string[] = [];
    if (admin.permissions && typeof admin.permissions === 'object') {
      permissions = (admin.permissions as any).adminPermissions || [];
    }

    res.json({
      data: {
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
        isSuperAdmin: admin.isSuperAdmin,
        permissions,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching admin permissions:", error);
    res.status(500).json({
      error: "Failed to fetch admin permissions",
      details: error.message,
    });
  }
};

/**
 * UPDATE ADMIN PERMISSIONS
 * Update permissions for a specific admin
 */
export const updateAdminPermissions = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { permissions } = req.body;
    const requestingUserId = (req as any).userId;

    console.log(`🔐 Updating permissions for admin: ${adminId}`);
    console.log(`📝 New permissions:`, permissions);

    // Validate input
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "Permissions must be an array" });
    }

    // Check if target admin exists
    const targetAdmin = await prisma.user.findUnique({
      where: { id: adminId, role: "ADMIN" },
      select: { id: true, isSuperAdmin: true, firstName: true, lastName: true },
    });

    if (!targetAdmin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Prevent modifying Super Admin permissions
    if (targetAdmin.isSuperAdmin) {
      return res.status(403).json({
        error: "Cannot modify Super Admin permissions",
        message: "Super Admins have all permissions by default",
      });
    }

    // Check if requesting user is Super Admin
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { isSuperAdmin: true },
    });

    if (!requestingUser?.isSuperAdmin) {
      return res.status(403).json({
        error: "Only Super Admins can modify permissions",
      });
    }

    // Get current permissions
    const currentPermissions = targetAdmin ? (targetAdmin as any).permissions : {};

    // Update permissions
    await prisma.user.update({
      where: { id: adminId },
      data: {
        permissions: {
          ...currentPermissions,
          adminPermissions: permissions,
        },
      },
    });

    console.log(`✅ Permissions updated for ${targetAdmin.firstName} ${targetAdmin.lastName}`);
    res.json({
      data: {
        message: "Permissions updated successfully",
        adminId,
        permissions,
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating admin permissions:", error);
    res.status(500).json({
      error: "Failed to update admin permissions",
      details: error.message,
    });
  }
};

/**
 * SET SUPER ADMIN
 * Promote an admin to Super Admin status
 */
export const setSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { isSuperAdmin } = req.body;
    const requestingUserId = (req as any).userId;

    console.log(`👑 Setting Super Admin status for: ${adminId} to ${isSuperAdmin}`);

    // Only existing Super Admin can set Super Admin status
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { isSuperAdmin: true },
    });

    if (!requestingUser?.isSuperAdmin) {
      return res.status(403).json({
        error: "Only Super Admins can modify Super Admin status",
      });
    }

    // Cannot remove last Super Admin
    if (!isSuperAdmin) {
      const superAdminCount = await prisma.user.count({
        where: { role: "ADMIN", isSuperAdmin: true },
      });

      if (superAdminCount <= 1) {
        return res.status(400).json({
          error: "Cannot remove last Super Admin",
          message: "System must have at least one Super Admin",
        });
      }
    }

    // Update Super Admin status
    await prisma.user.update({
      where: { id: adminId },
      data: { isSuperAdmin },
    });

    console.log(`✅ Super Admin status updated`);
    res.json({
      data: {
        message: `Admin ${isSuperAdmin ? 'promoted to' : 'demoted from'} Super Admin`,
        adminId,
        isSuperAdmin,
      },
    });
  } catch (error: any) {
    console.error("❌ Error setting Super Admin status:", error);
    res.status(500).json({
      error: "Failed to set Super Admin status",
      details: error.message,
    });
  }
};
