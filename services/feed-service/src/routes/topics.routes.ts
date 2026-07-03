/**
 * Topic taxonomy read endpoints — feeds the quiz-authoring topic picker
 * (QuizForm) and, later, the Learn Screen skill tree.
 *
 * Taxonomy rows live in the shared schema (Topic → Subject); writes happen
 * through seed/backfill scripts for now, so this router is read-only.
 */

import { Router, Response } from 'express';
import { prismaRead } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /topics/subjects?grade=9 — subjects that have at least one active
// topic (picker step 1). Grade filter optional.
router.get('/topics/subjects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const grade = typeof req.query.grade === 'string' && req.query.grade.trim()
      ? req.query.grade.trim()
      : null;

    const subjects = await prismaRead.subject.findMany({
      where: {
        isActive: true,
        ...(grade ? { grade } : {}),
        topics: { some: { isActive: true } },
      },
      select: {
        id: true,
        code: true,
        name: true,
        nameEn: true,
        nameKh: true,
        grade: true,
        category: true,
        _count: { select: { topics: { where: { isActive: true } } } },
      },
      orderBy: [{ grade: 'asc' }, { code: 'asc' }],
    });

    res.json({
      success: true,
      data: subjects.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        nameEn: s.nameEn,
        nameKh: s.nameKh,
        grade: s.grade,
        category: s.category,
        topicCount: s._count.topics,
      })),
    });
  } catch (error: any) {
    console.error('List topic subjects error:', error);
    res.status(500).json({ success: false, error: 'Failed to list subjects' });
  }
});

// GET /topics?subjectId=… — active topic tree for one subject (picker step 2).
// Top-level topics are units/chapters; children are skills.
router.get('/topics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId.trim() : '';
    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'subjectId is required' });
    }

    const topics = await prismaRead.topic.findMany({
      where: { subjectId, isActive: true },
      select: { id: true, parentId: true, name: true, nameKh: true, order: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    type Node = { id: string; name: string; nameKh: string | null; order: number; children: Node[] };
    const byId = new Map<string, Node>(
      topics.map((t) => [t.id, { id: t.id, name: t.name, nameKh: t.nameKh, order: t.order, children: [] }]),
    );
    const roots: Node[] = [];
    for (const t of topics) {
      const node = byId.get(t.id)!;
      const parent = t.parentId ? byId.get(t.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    res.json({ success: true, data: roots });
  } catch (error: any) {
    console.error('List topics error:', error);
    res.status(500).json({ success: false, error: 'Failed to list topics' });
  }
});

export default router;
