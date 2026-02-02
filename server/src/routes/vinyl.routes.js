import { Router } from 'express';
import { requireAdminOrAuth } from '../middlewares/admin.js';
import { listVinyls, createVinyl, deleteVinyl, getVinylImage } from '../controllers/vinyl.controller.js';

const router = Router();

router.get('/', listVinyls);
router.get('/:id/image', getVinylImage);
router.post('/', requireAdminOrAuth, createVinyl);
router.delete('/:id', requireAdminOrAuth, deleteVinyl);

export default router;
