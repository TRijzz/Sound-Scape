import { Router } from 'express';
import {
  createVinyl,
  getVinyls,
  getVinyl,
  updateVinyl,
  deleteVinyl,
} from '../controllers/vinyl.controller.js';
import { requireAdminOrAuth } from '../middlewares/admin.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.route('/').post(requireAdminOrAuth, upload.fields([{ name: 'vinylImage', maxCount: 1 }]), createVinyl).get(getVinyls);
router
  .route('/:id')
  .get(getVinyl)
  .put(requireAdminOrAuth, upload.fields([{ name: 'vinylImage', maxCount: 1 }]), updateVinyl)
  .delete(requireAdminOrAuth, deleteVinyl);

export default router;
