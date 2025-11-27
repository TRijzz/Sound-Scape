import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
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

router.post('/', requireAuth, createCategory);
router.get('/me', requireAuth, getMyCategories);
router.get('/', getCategories);
router.get('/:id', requireAuth, getCategory);
router.put('/:id', requireAuth, updateCategory);
router.delete('/:id', requireAuth, deleteCategory);
router.post('/:id/songs', requireAuth, addSongToCategory);
router.delete('/:id/songs', requireAuth, removeSongFromCategory);

export default router;

