import { Router } from 'express';
import { ToolDraftsController } from '../controllers/tool-drafts.controller';

const router = Router();

router.get('/', ToolDraftsController.list as any);
router.put('/:id', ToolDraftsController.upsert as any);
router.delete('/:id', ToolDraftsController.remove as any);

export default router;
