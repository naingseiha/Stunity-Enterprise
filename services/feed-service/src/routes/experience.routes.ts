/**
 * Experience Routes
 * 
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead, feedRanker, upload } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from '../utils/r2';
import { feedCache, EventPublisher } from '../redis';

const router = Router();

// ========================================
// EXPERIENCE ENDPOINTS
// ========================================

// GET /users/:id/experiences - Get user experiences
router.get('/users/:id/experiences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const experiences = await prisma.experience.findMany({
      where: { userId },
      orderBy: [
        { isCurrent: 'desc' },
        { startDate: 'desc' },
      ],
    });

    res.json({ success: true, experiences });
  } catch (error: any) {
    console.error('Get experiences error:', error);
    res.status(500).json({ success: false, error: 'Failed to get experiences' });
  }
});

// POST /users/me/experiences - Add experience
router.post('/users/me/experiences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { type, title, organization, location, startDate, endDate, isCurrent, description, achievements, skills } = req.body;

    if (!type || !title || !organization || !startDate) {
      return res.status(400).json({ success: false, error: 'Type, title, organization, and start date required' });
    }

    const experience = await prisma.experience.create({
      data: {
        userId,
        type,
        title,
        organization,
        location: location || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        description: description || null,
        achievements: achievements || [],
        skills: skills || [],
      },
    });

    res.json({ success: true, experience });
  } catch (error: any) {
    console.error('Add experience error:', error);
    res.status(500).json({ success: false, error: 'Failed to add experience' });
  }
});

// PUT /users/me/experiences/:expId - Update experience
router.put('/users/me/experiences/:expId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { expId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const exp = await prisma.experience.findUnique({ where: { id: expId } });
    if (!exp || exp.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Experience not found' });
    }

    const { type, title, organization, location, startDate, endDate, isCurrent, description, achievements, skills } = req.body;

    const updated = await prisma.experience.update({
      where: { id: expId },
      data: {
        ...(type && { type }),
        ...(title && { title }),
        ...(organization && { organization }),
        ...(location !== undefined && { location }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isCurrent !== undefined && { isCurrent }),
        ...(description !== undefined && { description }),
        ...(achievements && { achievements }),
        ...(skills && { skills }),
      },
    });

    res.json({ success: true, experience: updated });
  } catch (error: any) {
    console.error('Update experience error:', error);
    res.status(500).json({ success: false, error: 'Failed to update experience' });
  }
});

// DELETE /users/me/experiences/:expId - Delete experience
router.delete('/users/me/experiences/:expId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { expId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const exp = await prisma.experience.findUnique({ where: { id: expId } });
    if (!exp || exp.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Experience not found' });
    }

    await prisma.experience.delete({ where: { id: expId } });

    res.json({ success: true, message: 'Experience deleted' });
  } catch (error: any) {
    console.error('Delete experience error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete experience' });
  }
});

// ========================================
// EDUCATION ENDPOINTS
// ========================================

// GET /users/:id/education - Get user education
router.get('/users/:id/education', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const education = await prisma.education.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    res.json({ success: true, education });
  } catch (error: any) {
    console.error('Get education error:', error);
    res.status(500).json({ success: false, error: 'Failed to get education' });
  }
});

// POST /users/me/education - Add education
router.post('/users/me/education', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { school, degree, fieldOfStudy, grade, startDate, endDate, isCurrent, description, activities, skills } = req.body;

    if (!school || !startDate) {
      return res.status(400).json({ success: false, error: 'School and start date are required' });
    }

    const education = await prisma.education.create({
      data: {
        userId,
        school,
        degree: degree || null,
        fieldOfStudy: fieldOfStudy || null,
        grade: grade || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        description: description || null,
        activities: activities || [],
        skills: skills || [],
        mediaUrls: [],
        mediaKeys: [],
      },
    });

    res.json({ success: true, education });
  } catch (error: any) {
    console.error('Add education error:', error);
    res.status(500).json({ success: false, error: 'Failed to add education' });
  }
});

// PUT /users/me/education/:eduId - Update education
router.put('/users/me/education/:eduId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { eduId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const edu = await prisma.education.findUnique({ where: { id: eduId } });
    if (!edu || edu.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Education not found' });
    }

    const { school, degree, fieldOfStudy, grade, startDate, endDate, isCurrent, description, activities, skills } = req.body;

    const updated = await prisma.education.update({
      where: { id: eduId },
      data: {
        ...(school && { school }),
        ...(degree !== undefined && { degree }),
        ...(fieldOfStudy !== undefined && { fieldOfStudy }),
        ...(grade !== undefined && { grade }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isCurrent !== undefined && { isCurrent }),
        ...(description !== undefined && { description }),
        ...(activities && { activities }),
        ...(skills && { skills }),
      },
    });

    res.json({ success: true, education: updated });
  } catch (error: any) {
    console.error('Update education error:', error);
    res.status(500).json({ success: false, error: 'Failed to update education' });
  }
});

// DELETE /users/me/education/:eduId - Delete education
router.delete('/users/me/education/:eduId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { eduId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const edu = await prisma.education.findUnique({ where: { id: eduId } });
    if (!edu || edu.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Education not found' });
    }

    await prisma.education.delete({ where: { id: eduId } });

    res.json({ success: true, message: 'Education deleted' });
  } catch (error: any) {
    console.error('Delete education error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete education' });
  }
});

// ========================================
// CERTIFICATION ENDPOINTS
// ========================================

// GET /users/:id/certifications - Get user certifications
router.get('/users/:id/certifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;

    const certifications = await prisma.certification.findMany({
      where: { userId },
      orderBy: { issueDate: 'desc' },
    });

    res.json({ success: true, certifications });
  } catch (error: any) {
    console.error('Get certifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to get certifications' });
  }
});

// POST /users/me/certifications - Add certification
router.post('/users/me/certifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { name, issuingOrg, issueDate, expiryDate, credentialId, credentialUrl, description, skills } = req.body;

    if (!name || !issuingOrg || !issueDate) {
      return res.status(400).json({ success: false, error: 'Name, issuing organization, and issue date required' });
    }

    const certification = await prisma.certification.create({
      data: {
        userId,
        name,
        issuingOrg,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        credentialId: credentialId || null,
        credentialUrl: credentialUrl || null,
        description: description || null,
        skills: skills || [],
      },
    });

    res.json({ success: true, certification });
  } catch (error: any) {
    console.error('Add certification error:', error);
    res.status(500).json({ success: false, error: 'Failed to add certification' });
  }
});

// PUT /users/me/certifications/:certId - Update certification
router.put('/users/me/certifications/:certId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { certId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const cert = await prisma.certification.findUnique({ where: { id: certId } });
    if (!cert || cert.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Certification not found' });
    }

    const { name, issuingOrg, issueDate, expiryDate, credentialId, credentialUrl, description, skills } = req.body;

    const updated = await prisma.certification.update({
      where: { id: certId },
      data: {
        ...(name && { name }),
        ...(issuingOrg && { issuingOrg }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(credentialId !== undefined && { credentialId }),
        ...(credentialUrl !== undefined && { credentialUrl }),
        ...(description !== undefined && { description }),
        ...(skills && { skills }),
      },
    });

    res.json({ success: true, certification: updated });
  } catch (error: any) {
    console.error('Update certification error:', error);
    res.status(500).json({ success: false, error: 'Failed to update certification' });
  }
});

// DELETE /users/me/certifications/:certId - Delete certification
router.delete('/users/me/certifications/:certId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { certId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const cert = await prisma.certification.findUnique({ where: { id: certId } });
    if (!cert || cert.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Certification not found' });
    }

    await prisma.certification.delete({ where: { id: certId } });

    res.json({ success: true, message: 'Certification deleted' });
  } catch (error: any) {
    console.error('Delete certification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete certification' });
  }
});

// ========================================
// PROJECT ENDPOINTS
// ========================================

// GET /users/:id/projects - Get user projects
router.get('/users/:id/projects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const userId = id === 'me' ? currentUserId : id;
    const isOwnProfile = userId === currentUserId;

    const projects = await prisma.project.findMany({
      where: {
        userId,
        ...(isOwnProfile ? {} : { visibility: 'PUBLIC' }),
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ success: true, projects });
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to get projects' });
  }
});

// POST /users/me/projects - Add project
router.post('/users/me/projects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const {
      title, description, category, status, startDate, endDate, role, teamSize,
      technologies, skills, projectUrl, githubUrl, demoUrl, achievements, visibility, isFeatured,
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ success: false, error: 'Title, description, and category required' });
    }

    const project = await prisma.project.create({
      data: {
        userId,
        title,
        description,
        category,
        status: status || 'COMPLETED',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        role: role || null,
        teamSize: teamSize || null,
        technologies: technologies || [],
        skills: skills || [],
        projectUrl: projectUrl || null,
        githubUrl: githubUrl || null,
        demoUrl: demoUrl || null,
        achievements: achievements || [],
        visibility: visibility || 'PUBLIC',
        isFeatured: isFeatured || false,
      },
    });

    res.json({ success: true, project });
  } catch (error: any) {
    console.error('Add project error:', error);
    res.status(500).json({ success: false, error: 'Failed to add project' });
  }
});

// PUT /users/me/projects/:projectId - Update project
router.put('/users/me/projects/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const {
      title, description, category, status, startDate, endDate, role, teamSize,
      technologies, skills, projectUrl, githubUrl, demoUrl, achievements, visibility, isFeatured,
    } = req.body;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        ...(status && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(role !== undefined && { role }),
        ...(teamSize !== undefined && { teamSize }),
        ...(technologies && { technologies }),
        ...(skills && { skills }),
        ...(projectUrl !== undefined && { projectUrl }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(demoUrl !== undefined && { demoUrl }),
        ...(achievements && { achievements }),
        ...(visibility && { visibility }),
        ...(isFeatured !== undefined && { isFeatured }),
      },
    });

    res.json({ success: true, project: updated });
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// DELETE /users/me/projects/:projectId - Delete project
router.delete('/users/me/projects/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Delete media from R2 if exists
    if (project.mediaKeys && project.mediaKeys.length > 0 && isR2Configured()) {
      await Promise.all(project.mediaKeys.map(key => deleteFromR2(key).catch(() => { })));
    }

    await prisma.project.delete({ where: { id: projectId } });

    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;
