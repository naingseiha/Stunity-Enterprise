import { Router } from 'express';

const router = Router();

// TODO: Implement grade management endpoints  
router.post('/', (req, res) => res.json({ message: 'Add grade - Coming soon' }));
router.get('/:id', (req, res) => res.json({ message: 'Get grades - Coming soon' }));

export default router;
