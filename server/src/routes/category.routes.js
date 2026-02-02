import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdminOrAuth } from '../middlewares/admin.js';
import {
  createCategory,
  getMyCategories,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  addSongToCategory,
  removeSongFromCategory,
} from '../controllers/category.controller.js';

const router = Router();

router.post('/', requireAdminOrAuth, createCategory);
router.get('/me', requireAuth, getMyCategories);
router.get('/', getCategories);
router.get('/:id', requireAdminOrAuth, getCategory);
router.put('/:id', requireAdminOrAuth, updateCategory);
router.delete('/:id', requireAdminOrAuth, deleteCategory);
router.post('/:id/songs', requireAdminOrAuth, addSongToCategory);
router.delete('/:id/songs', requireAdminOrAuth, removeSongFromCategory);

export default router;

