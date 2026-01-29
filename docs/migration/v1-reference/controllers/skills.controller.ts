import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { SkillCategory, SkillLevel } from '@prisma/client';

// ==========================================
// SKILLS MANAGEMENT
// ==========================================

// Get user's skills
export const getUserSkills = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const skills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        endorsements: {
          include: {
            endorser: {
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
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: { endorsements: true }
        }
      },
      orderBy: [
        { isVerified: 'desc' },
        { level: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const skillsWithCount = skills.map(skill => ({
      ...skill,
      endorsementCount: skill._count.endorsements,
      recentEndorsements: skill.endorsements
    }));

    res.json({ skills: skillsWithCount });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
};

// Add a new skill
export const addSkill = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      skillName,
      category,
      level = 'BEGINNER',
      yearsOfExp,
      description
    } = req.body;

    // Validate required fields
    if (!skillName || !category) {
      return res.status(400).json({ error: 'Skill name and category are required' });
    }

    // Check if skill already exists
    const existingSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillName: {
          userId,
          skillName
        }
      }
    });

    if (existingSkill) {
      return res.status(400).json({ error: 'Skill already exists' });
    }

    const skill = await prisma.userSkill.create({
      data: {
        userId,
        skillName,
        category: category as SkillCategory,
        level: level as SkillLevel,
        yearsOfExp: yearsOfExp ? parseFloat(yearsOfExp) : null,
        description
      },
      include: {
        _count: {
          select: { endorsements: true }
        }
      }
    });

    // Update profile completeness
    await updateProfileCompleteness(userId);

    res.status(201).json({ skill });
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
};

// Update a skill
export const updateSkill = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { skillId } = req.params;
    const { level, yearsOfExp, description } = req.body;

    // Verify ownership
    const skill = await prisma.userSkill.findUnique({
      where: { id: skillId }
    });

    if (!skill || skill.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedSkill = await prisma.userSkill.update({
      where: { id: skillId },
      data: {
        level: level ? (level as SkillLevel) : undefined,
        yearsOfExp: yearsOfExp !== undefined ? parseFloat(yearsOfExp) : undefined,
        description
      },
      include: {
        _count: {
          select: { endorsements: true }
        }
      }
    });

    res.json({ skill: updatedSkill });
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
};

// Delete a skill
export const deleteSkill = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { skillId } = req.params;

    // Verify ownership
    const skill = await prisma.userSkill.findUnique({
      where: { id: skillId }
    });

    if (!skill || skill.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.userSkill.delete({
      where: { id: skillId }
    });

    // Update profile completeness
    await updateProfileCompleteness(userId);

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
};

// Endorse a skill
export const endorseSkill = async (req: Request, res: Response) => {
  try {
    const endorserId = req.userId;
    if (!endorserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { skillId } = req.params;
    const { comment } = req.body;

    // Get skill to find recipient
    const skill = await prisma.userSkill.findUnique({
      where: { id: skillId }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Can't endorse your own skill
    if (skill.userId === endorserId) {
      return res.status(400).json({ error: 'Cannot endorse your own skill' });
    }

    // Check if already endorsed
    const existingEndorsement = await prisma.skillEndorsement.findUnique({
      where: {
        skillId_endorserId: {
          skillId,
          endorserId
        }
      }
    });

    if (existingEndorsement) {
      return res.status(400).json({ error: 'Already endorsed this skill' });
    }

    const endorsement = await prisma.skillEndorsement.create({
      data: {
        skillId,
        endorserId,
        recipientId: skill.userId,
        comment
      },
      include: {
        endorser: {
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
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        recipientId: skill.userId,
        actorId: endorserId,
        type: 'SKILL_ENDORSED',
        title: 'New Skill Endorsement',
        message: `endorsed your ${skill.skillName} skill`
      }
    });

    res.status(201).json({ endorsement });
  } catch (error) {
    console.error('Error endorsing skill:', error);
    res.status(500).json({ error: 'Failed to endorse skill' });
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
