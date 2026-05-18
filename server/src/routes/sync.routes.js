import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminOrAuth } from '../middlewares/admin.js';
import { syncData, refreshData, getSyncStatus, syncFromFolders } from '../controllers/sync.controller.js';

const router = Router();

// All sync routes require authentication
router.post('/sync', requireAuth, syncData);
router.post('/refresh', requireAuth, refreshData);
router.get('/status', getSyncStatus);
router.post('/folder-sync', requireAdminOrAuth, syncFromFolders);

export default router;
