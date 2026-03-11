import { Router } from 'express';
import {
  createVinyl,
  getVinyls,
  getVinyl,
  updateVinyl,
  deleteVinyl,
} from '../controllers/vinyl.controller.js';
import { requireAdminOrAuth } from '../middlewares/admin.js';

const router = Router();

router.route('/').post(requireAdminOrAuth, createVinyl).get(getVinyls);
router
  .route('/:id')
  .get(getVinyl)
  .put(requireAdminOrAuth, updateVinyl)
  .delete(requireAdminOrAuth, deleteVinyl);

export default router;
