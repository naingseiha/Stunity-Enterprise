import { Request, Response } from 'express';
import { prisma } from '../context';

interface AuthRequest extends Request {
  user?: { id: string };
}

// Tools whose drafts may be synced. Keep in sync with the web Tools UI.
const TOOLS = ['lesson-planner', 'exam', 'slides'];

/**
 * Cloud persistence for personal creator-tool drafts (Lesson Planner, Exam, …).
 * Not school-scoped — drafts belong to the authenticated user. The client owns
 * the draft id (a local id minted offline), so saves are idempotent upserts.
 */
export class ToolDraftsController {
  /** GET /tool-drafts[?tool=] — list the caller's drafts, newest first. */
  static async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const tool = typeof req.query.tool === 'string' ? req.query.tool : undefined;
      const drafts = await prisma.toolDraft.findMany({
        where: { userId, ...(tool ? { tool } : {}) },
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ success: true, drafts });
    } catch (error: any) {
      console.error('[tool-drafts] list failed:', error.message);
      res.status(500).json({ success: false, error: 'Failed to list drafts' });
    }
  }

  /** PUT /tool-drafts/:id — upsert (client supplies the id). */
  static async upsert(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { tool, title, subject, grade, payload } = req.body || {};

      if (!id || !tool || !title || typeof payload !== 'object' || payload === null) {
        return res.status(400).json({ success: false, error: 'id, tool, title and payload are required' });
      }
      if (!TOOLS.includes(tool)) {
        return res.status(400).json({ success: false, error: `unknown tool: ${tool}` });
      }

      // Ownership guard: never let one user overwrite another user's draft id.
      const existing = await prisma.toolDraft.findUnique({ where: { id } });
      if (existing && existing.userId !== userId) {
        return res.status(403).json({ success: false, error: 'forbidden' });
      }

      const data = {
        tool,
        title: String(title).slice(0, 300),
        subject: subject ? String(subject).slice(0, 120) : null,
        grade: grade ? String(grade).slice(0, 120) : null,
        payload,
      };

      const draft = await prisma.toolDraft.upsert({
        where: { id },
        create: { id, userId, ...data },
        update: data,
      });
      res.json({ success: true, draft });
    } catch (error: any) {
      console.error('[tool-drafts] upsert failed:', error.message);
      res.status(500).json({ success: false, error: 'Failed to save draft' });
    }
  }

  /** DELETE /tool-drafts/:id — delete one of the caller's drafts. */
  static async remove(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await prisma.toolDraft.deleteMany({ where: { id, userId } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('[tool-drafts] delete failed:', error.message);
      res.status(500).json({ success: false, error: 'Failed to delete draft' });
    }
  }
}
