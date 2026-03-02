import { Router } from 'express';
import { getGenres, createGenre, updateGenre, deleteGenre } from '../controllers/genre.controller.js';
import { requireAdminOrAuth } from '../middlewares/admin.js';

const router = Router();

// Public routes
router.get('/', getGenres);

// Protected routes (admin only)
router.post('/', requireAdminOrAuth, createGenre);
router.put('/:id', requireAdminOrAuth, updateGenre);
router.delete('/:id', requireAdminOrAuth, deleteGenre);

export default router;
