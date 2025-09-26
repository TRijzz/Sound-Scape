import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { createArtist, getArtists, getArtist, updateArtist, deleteArtist } from '../controllers/artist.controller.js';

const router = Router();

router.post('/', requireAuth, createArtist);
router.get('/', getArtists);
router.get('/:id', getArtist);
router.put('/:id', requireAuth, updateArtist);
router.delete('/:id', requireAuth, deleteArtist);

export default router;
