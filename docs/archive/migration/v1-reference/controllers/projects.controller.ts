import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { ProjectCategory, ProjectStatus, ProfileVisibility } from '@prisma/client';
import { storageService } from '../services/storage.service';

// ==========================================
// PROJECTS/PORTFOLIO MANAGEMENT
// ==========================================

// Get user's projects
export const getUserProjects = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { category, featured } = req.query;
    const currentUserId = req.userId;

    const where: any = { userId };

    // Apply filters
    if (category) {
      where.category = category as ProjectCategory;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    // Apply visibility filter if not viewing own profile
    if (currentUserId !== userId) {
      where.visibility = { in: ['PUBLIC', 'SCHOOL'] };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            student: {
              select: { khmerName: true }
            },
            teacher: {
              select: { khmerName: true }
            }
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get single project details
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const currentUserId = req.userId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
            student: {
              select: { khmerName: true, class: { select: { name: true } } }
            },
            teacher: {
              select: { khmerName: true, position: true }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check visibility
    if (project.userId !== currentUserId) {
      if (project.visibility === 'PRIVATE') {
        return res.status(403).json({ error: 'This project is private' });
      }
      if (project.visibility === 'CLASS') {
        // TODO: Check if users are in same class
      }
    }

    // Increment view count (only if not owner)
    if (project.userId !== currentUserId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { viewsCount: { increment: 1 } }
      });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Create a new project
export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      category,
      status = 'COMPLETED',
      startDate,
      endDate,
      role,
      teamSize,
      technologies,
      skills,
      projectUrl,
      githubUrl,
      demoUrl,
      achievements,
      collaborators,
      visibility = 'PUBLIC',
      isFeatured = false
    } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    // Handle media uploads
    let mediaUrls: string[] = [];
    let mediaKeys: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await storageService.uploadFile(
          file.buffer,
          `projects/${userId}`,
          file.originalname,
          file.mimetype
        );

        if (result.success && result.url && result.key) {
          mediaUrls.push(result.url);
          mediaKeys.push(result.key);
        }
      }
    }

    const project = await prisma.project.create({
      data: {
        userId,
        title,
        description,
        category: category as ProjectCategory,
        status: status as ProjectStatus,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        role,
        teamSize: teamSize ? parseInt(teamSize) : null,
        technologies: Array.isArray(technologies) ? technologies : [],
        skills: Array.isArray(skills) ? skills : [],
        mediaUrls,
        mediaKeys,
        projectUrl,
        githubUrl,
        demoUrl,
        achievements: Array.isArray(achievements) ? achievements : [],
        collaborators: Array.isArray(collaborators) ? collaborators : [],
        visibility: visibility as ProfileVisibility,
        isFeatured
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true
          }
        }
      }
    });

    // Update profile completeness
    await updateProfileCompleteness(userId);

    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Update a project
export const updateProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      category,
      status,
      startDate,
      endDate,
      role,
      teamSize,
      technologies,
      skills,
      projectUrl,
      githubUrl,
      demoUrl,
      achievements,
      collaborators,
      visibility,
      isFeatured
    } = req.body;

    // Handle new media uploads
    let newMediaUrls: string[] = [];
    let newMediaKeys: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await storageService.uploadFile(
          file.buffer,
          `projects/${userId}`,
          file.originalname,
          file.mimetype
        );

        if (result.success && result.url && result.key) {
          newMediaUrls.push(result.url);
          newMediaKeys.push(result.key);
        }
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        title,
        description,
        category: category ? (category as ProjectCategory) : undefined,
        status: status ? (status as ProjectStatus) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        role,
        teamSize: teamSize !== undefined ? parseInt(teamSize) : undefined,
        technologies: technologies ? (Array.isArray(technologies) ? technologies : []) : undefined,
        skills: skills ? (Array.isArray(skills) ? skills : []) : undefined,
        mediaUrls: newMediaUrls.length > 0 ? [...project.mediaUrls, ...newMediaUrls] : undefined,
        mediaKeys: newMediaKeys.length > 0 ? [...project.mediaKeys, ...newMediaKeys] : undefined,
        projectUrl,
        githubUrl,
        demoUrl,
        achievements: achievements ? (Array.isArray(achievements) ? achievements : []) : undefined,
        collaborators: collaborators ? (Array.isArray(collaborators) ? collaborators : []) : undefined,
        visibility: visibility ? (visibility as ProfileVisibility) : undefined,
        isFeatured: isFeatured !== undefined ? isFeatured : undefined
      }
    });

    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete media files from R2
    for (const key of project.mediaKeys) {
      await storageService.deleteFile(key);
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    // Update profile completeness
    await updateProfileCompleteness(userId);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// Like a project
export const likeProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // For now, just increment count (in future, track individual likes)
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        likesCount: { increment: 1 }
      }
    });

    // Create notification if not own project
    if (project.userId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: project.userId,
          actorId: userId,
          type: 'PROJECT_LIKED',
          title: 'Project Liked',
          message: `liked your project "${project.title}"`,
          link: `/projects/${projectId}`
        }
      });
    }

    res.json({ likesCount: updatedProject.likesCount });
  } catch (error) {
    console.error('Error liking project:', error);
    res.status(500).json({ error: 'Failed to like project' });
  }
};

// Toggle featured status
export const toggleFeatured = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    // Verify ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        isFeatured: !project.isFeatured
      }
    });

    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Error toggling featured:', error);
    res.status(500).json({ error: 'Failed to toggle featured status' });
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function updateProfileCompleteness(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSkills: true,
        experiences: true,
        certifications: true,
        projects: true,
        achievements: true,
        recommendations: {
          where: { isAccepted: true }
        }
      }
    });

    if (!user) return;

    let completeness = 0;

    // Basic info (10%)
    if (user.firstName && user.lastName && user.profilePictureUrl && user.headline) {
      completeness += 10;
    }

    // About section (10%)
    if (user.bio && user.careerGoals) {
      completeness += 10;
    }

    // Contact info (5%)
    if (user.location && user.languages && user.languages.length > 0) {
      completeness += 5;
    }

    // Skills (15%)
    if (user.userSkills.length >= 5) {
      completeness += 15;
    } else if (user.userSkills.length > 0) {
      completeness += Math.floor((user.userSkills.length / 5) * 15);
    }

    // Experience (15%)
    if (user.experiences.length >= 1) {
      completeness += 15;
    }

    // Education (10%)
    if (user.studentId || user.teacherId) {
      completeness += 10;
    }

    // Projects (15%)
    if (user.projects.length >= 2) {
      completeness += 15;
    } else if (user.projects.length === 1) {
      completeness += 7;
    }

    // Certifications (10%)
    if (user.certifications.length >= 1) {
      completeness += 10;
    }

    // Achievements (5%)
    if (user.achievements.length >= 1) {
      completeness += 5;
    }

    // Recommendations (5%)
    if (user.recommendations.length >= 1) {
      completeness += 5;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        profileCompleteness: Math.min(completeness, 100),
        profileUpdatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating profile completeness:', error);
  }
}
