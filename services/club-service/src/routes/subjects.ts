import { Router } from 'express';

const router = Router();

// TODO: Implement subject management endpoints
router.post('/', (req, res) => res.json({ message: 'Add subject - Coming soon' }));
router.get('/:id', (req, res) => res.json({ message: 'Get subject - Coming soon' }));

export default router;
