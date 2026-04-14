import { Router } from 'express';
import {
  getMaterials,
  createMaterial,
  deleteMaterial,
} from '../controllers/materialController';

const router = Router();

router.get('/clubs/:clubId/materials', getMaterials);
router.post('/clubs/:clubId/materials', createMaterial);
router.delete('/:id', deleteMaterial);

export default router;
