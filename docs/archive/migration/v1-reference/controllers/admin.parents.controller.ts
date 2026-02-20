import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateParentId } from "../utils/parentIdGenerator";

const prisma = new PrismaClient();

/**
 * 📊 GET PARENT STATISTICS
 * Overview of parent accounts in the system
 * GET /api/admin/parents/statistics
 */
export const getParentStatistics = async (req: Request, res: Response) => {
  try {
    console.log("📊 Fetching parent statistics...");

    // Count all parents
    const totalParents = await prisma.parent.count();

    // Count active parent accounts
    const activeParents = await prisma.parent.count({
      where: { isAccountActive: true },
    });

    // Count parents with user accounts
    const parentsWithAccounts = await prisma.parent.count({
      where: {
        user: {
          isNot: null,
        },
      },
    });

    // Count total parent-student relationships
    const totalRelationships = await prisma.studentParent.count();

    // Count primary contacts
    const primaryContacts = await prisma.studentParent.count({
      where: { isPrimary: true },
    });

    // Group by relationship type
    const relationshipStats = await prisma.parent.groupBy({
      by: ["relationship"],
      _count: true,
    });

    // Get average children per parent
    const parentsWithChildren = await prisma.parent.findMany({
      include: {
        _count: {
          select: { studentParents: true },
        },
      },
    });

    const totalChildren = parentsWithChildren.reduce(
      (sum, p) => sum + p._count.studentParents,
      0
    );
    const avgChildrenPerParent =
      totalParents > 0 ? (totalChildren / totalParents).toFixed(2) : "0";

    res.json({
      success: true,
      data: {
        overall: {
          totalParents,
          activeParents,
          inactiveParents: totalParents - activeParents,
          parentsWithAccounts,
          parentsWithoutAccounts: totalParents - parentsWithAccounts,
          activationRate:
            totalParents > 0
              ? ((activeParents / totalParents) * 100).toFixed(2) + "%"
              : "0%",
        },
        relationships: {
          totalRelationships,
          primaryContacts,
          avgChildrenPerParent,
        },
        byRelationshipType: relationshipStats.reduce(
          (acc: any, item: any) => {
            acc[item.relationship] = item._count;
            return acc;
          },
          {}
        ),
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching parent statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch parent statistics",
      error: error.message,
    });
  }
};

/**
 * 📋 GET ALL PARENTS
 * Get paginated list of all parents with filters
 * GET /api/admin/parents
 */
export const getAllParents = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "50",
      search,
      relationship,
      hasAccount,
      isActive,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: any = {};

    if (search) {
      where.OR = [
        { khmerName: { contains: search as string, mode: "insensitive" } },
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: "insensitive" } },
        { parentId: { contains: search as string } },
      ];
    }

    if (relationship) {
      where.relationship = relationship as string;
    }

    if (isActive !== undefined) {
      where.isAccountActive = isActive === "true";
    }

    if (hasAccount === "true") {
      where.user = { isNot: null };
    } else if (hasAccount === "false") {
      where.user = { is: null };
    }

    // Get parents
    const parents = await prisma.parent.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            isActive: true,
            lastLogin: true,
            isDefaultPassword: true,
          },
        },
        studentParents: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                khmerName: true,
                class: {
                  select: {
                    name: true,
                    grade: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get total count
    const totalCount = await prisma.parent.count({ where });

    res.json({
      success: true,
      data: {
        parents,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching parents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch parents",
      error: error.message,
    });
  }
};

/**
 * ➕ CREATE PARENT
 * Create a new parent record (without user account)
 * POST /api/admin/parents/create
 */
export const createParent = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      gender,
      email,
      phone,
      address,
      relationship,
      occupation,
      emergencyPhone,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !khmerName || !phone || !relationship) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, Khmer name, phone, and relationship are required",
      });
    }

    // Check if phone already exists
    const existingParent = await prisma.parent.findUnique({
      where: { phone },
    });

    if (existingParent) {
      return res.status(400).json({
        success: false,
        message: "A parent with this phone number already exists",
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.parent.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "A parent with this email already exists",
        });
      }
    }

    // Generate parent ID
    const parentId = await generateParentId();

    // Create parent
    const parent = await prisma.parent.create({
      data: {
        parentId,
        firstName,
        lastName,
        khmerName,
        englishName,
        gender,
        email,
        phone,
        address,
        relationship,
        occupation: occupation || "កសិករ",
        emergencyPhone,
        isAccountActive: true,
      },
    });

    console.log(`✅ Parent created: ${parent.khmerName} (${parent.parentId})`);

    res.json({
      success: true,
      message: "Parent created successfully",
      data: parent,
    });
  } catch (error: any) {
    console.error("❌ Error creating parent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create parent",
      error: error.message,
    });
  }
};

/**
 * 👤 CREATE USER ACCOUNT FOR PARENT
 * Create a User account linked to existing parent
 * POST /api/admin/parents/create-account
 */
export const createParentAccount = async (req: Request, res: Response) => {
  try {
    const { parentId } = req.body;

    if (!parentId) {
      return res.status(400).json({
        success: false,
        message: "Parent ID is required",
      });
    }

    // Find parent
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: { user: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Check if parent already has account
    if (parent.user) {
      return res.status(400).json({
        success: false,
        message: "Parent already has an account",
      });
    }

    // Default password is phone number
    const defaultPassword = parent.phone;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create user account
    const user = await prisma.user.create({
      data: {
        email: parent.email || undefined,
        phone: parent.phone,
        password: hashedPassword,
        firstName: parent.firstName,
        lastName: parent.lastName,
        role: "PARENT",
        parentId: parent.id,
        isDefaultPassword: true,
      },
    });

    console.log(
      `✅ Account created for parent: ${parent.khmerName} (${parent.parentId})`
    );
    console.log(`   Login: ${parent.phone} / Password: ${defaultPassword}`);

    res.json({
      success: true,
      message: "Parent account created successfully",
      data: {
        userId: user.id,
        parentId: parent.id,
        parentCode: parent.parentId,
        loginInfo: {
          phone: parent.phone,
          email: parent.email,
          defaultPassword: defaultPassword,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating parent account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create parent account",
      error: error.message,
    });
  }
};

/**
 * 🔗 LINK PARENT TO STUDENT
 * Create a relationship between parent and student
 * POST /api/admin/parents/link-student
 */
export const linkParentToStudent = async (req: Request, res: Response) => {
  try {
    const { parentId, studentId, relationship, isPrimary = false } = req.body;

    if (!parentId || !studentId || !relationship) {
      return res.status(400).json({
        success: false,
        message: "Parent ID, student ID, and relationship are required",
      });
    }

    // Verify parent exists
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if relationship already exists
    const existingLink = await prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId,
          parentId,
        },
      },
    });

    if (existingLink) {
      return res.status(400).json({
        success: false,
        message: "This parent is already linked to this student",
      });
    }

    // If setting as primary, unset other primary contacts for this student
    if (isPrimary) {
      await prisma.studentParent.updateMany({
        where: {
          studentId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Create link
    const link = await prisma.studentParent.create({
      data: {
        parentId,
        studentId,
        relationship,
        isPrimary,
      },
      include: {
        parent: {
          select: {
            khmerName: true,
            parentId: true,
          },
        },
        student: {
          select: {
            khmerName: true,
            studentId: true,
          },
        },
      },
    });

    console.log(
      `✅ Linked: ${link.parent.khmerName} → ${link.student.khmerName} (${relationship}${
        isPrimary ? ", Primary" : ""
      })`
    );

    res.json({
      success: true,
      message: "Parent linked to student successfully",
      data: link,
    });
  } catch (error: any) {
    console.error("❌ Error linking parent to student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to link parent to student",
      error: error.message,
    });
  }
};

/**
 * ❌ UNLINK PARENT FROM STUDENT
 * Remove relationship between parent and student
 * DELETE /api/admin/parents/unlink-student
 */
export const unlinkParentFromStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const { parentId, studentId } = req.body;

    if (!parentId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Parent ID and student ID are required",
      });
    }

    // Find the link
    const link = await prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId,
          parentId,
        },
      },
      include: {
        parent: {
          select: {
            khmerName: true,
          },
        },
        student: {
          select: {
            khmerName: true,
          },
        },
      },
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "No link found between this parent and student",
      });
    }

    // Delete the link
    await prisma.studentParent.delete({
      where: {
        studentId_parentId: {
          studentId,
          parentId,
        },
      },
    });

    console.log(
      `✅ Unlinked: ${link.parent.khmerName} ✖ ${link.student.khmerName}`
    );

    res.json({
      success: true,
      message: "Parent unlinked from student successfully",
    });
  } catch (error: any) {
    console.error("❌ Error unlinking parent from student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unlink parent from student",
      error: error.message,
    });
  }
};

/**
 * 🔄 RESET PARENT PASSWORD
 * Reset parent's password to default (phone number)
 * POST /api/admin/parents/reset-password
 */
export const resetParentPassword = async (req: Request, res: Response) => {
  try {
    const { parentId } = req.body;

    if (!parentId) {
      return res.status(400).json({
        success: false,
        message: "Parent ID is required",
      });
    }

    // Find parent with user account
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: { user: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    if (!parent.user) {
      return res.status(400).json({
        success: false,
        message: "Parent does not have a user account",
      });
    }

    // Reset password to phone number
    const defaultPassword = parent.phone;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: parent.user.id },
      data: {
        password: hashedPassword,
        isDefaultPassword: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log(`✅ Password reset for: ${parent.khmerName} (${parent.parentId})`);
    console.log(`   New password: ${defaultPassword}`);

    res.json({
      success: true,
      message: "Parent password reset successfully",
      data: {
        parentId: parent.id,
        parentCode: parent.parentId,
        khmerName: parent.khmerName,
        newPassword: defaultPassword,
      },
    });
  } catch (error: any) {
    console.error("❌ Error resetting parent password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset parent password",
      error: error.message,
    });
  }
};

/**
 * 🔄 TOGGLE PARENT ACCOUNT STATUS
 * Activate or deactivate parent account
 * PUT /api/admin/parents/:id/toggle-status
 */
export const toggleParentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "isActive status is required",
      });
    }

    // Find parent
    const parent = await prisma.parent.findUnique({
      where: { id },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Update status
    const updatedParent = await prisma.parent.update({
      where: { id },
      data: {
        isAccountActive: isActive,
      },
    });

    console.log(
      `✅ Parent ${isActive ? "activated" : "deactivated"}: ${parent.khmerName}${
        reason ? ` (${reason})` : ""
      }`
    );

    res.json({
      success: true,
      message: `Parent account ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: updatedParent,
    });
  } catch (error: any) {
    console.error("❌ Error toggling parent status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle parent status",
      error: error.message,
    });
  }
};

/**
 * 📝 UPDATE PARENT
 * Update parent information
 * PUT /api/admin/parents/:id
 */
export const updateParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      gender,
      email,
      phone,
      address,
      relationship,
      occupation,
      emergencyPhone,
    } = req.body;

    // Find parent
    const parent = await prisma.parent.findUnique({
      where: { id },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Build update data
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (khmerName !== undefined) updateData.khmerName = khmerName;
    if (englishName !== undefined) updateData.englishName = englishName;
    if (gender !== undefined) updateData.gender = gender;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (relationship !== undefined) updateData.relationship = relationship;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone;

    // Update parent
    const updatedParent = await prisma.parent.update({
      where: { id },
      data: updateData,
    });

    console.log(`✅ Parent updated: ${updatedParent.khmerName}`);

    res.json({
      success: true,
      message: "Parent updated successfully",
      data: updatedParent,
    });
  } catch (error: any) {
    console.error("❌ Error updating parent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update parent",
      error: error.message,
    });
  }
};

/**
 * 🗑️ DELETE PARENT
 * Delete parent record (and user account if exists)
 * DELETE /api/admin/parents/:id
 */
export const deleteParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find parent
    const parent = await prisma.parent.findUnique({
      where: { id },
      include: {
        studentParents: true,
      },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Check if parent has children linked
    if (parent.studentParents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete parent. They have ${parent.studentParents.length} child(ren) linked. Please unlink all children first.`,
      });
    }

    // Delete parent (cascade will delete user account)
    await prisma.parent.delete({
      where: { id },
    });

    console.log(`✅ Parent deleted: ${parent.khmerName} (${parent.parentId})`);

    res.json({
      success: true,
      message: "Parent deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting parent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete parent",
      error: error.message,
    });
  }
};
