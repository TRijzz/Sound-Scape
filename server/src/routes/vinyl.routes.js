import { Router } from 'express';
import {
  createVinyl,
  getVinyls,
  getVinyl,
  updateVinyl,
  deleteVinyl,
} from '../controllers/vinyl.controller.js';
import { optionalAdmin, requireAdminOrAuth } from '../middlewares/admin.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

router.route('/').post(requireAdminOrAuth, upload.fields([{ name: 'vinylImage', maxCount: 12 }]), createVinyl).get(optionalAdmin, getVinyls);
router
  .route('/:id')
  .get(optionalAdmin, getVinyl)
  .put(requireAdminOrAuth, upload.fields([{ name: 'vinylImage', maxCount: 12 }]), updateVinyl)
  .delete(requireAdminOrAuth, deleteVinyl);

export default router;
