import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { syncData, refreshData, getSyncStatus } from '../controllers/sync.controller.js';

const router = Router();

// All sync routes require authentication
router.post('/sync', requireAuth, syncData);
router.post('/refresh', requireAuth, refreshData);
router.get('/status', getSyncStatus);

export default router;
