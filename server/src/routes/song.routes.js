import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { createSong, getSongs, getSong, updateSong, deleteSong, incrementPlayCount, getLyrics, updateLyrics } from '../controllers/song.controller.js';

const router = Router();

router.post('/', requireAuth, createSong);
router.get('/', getSongs);
router.get('/:id', getSong);
router.put('/:id', requireAuth, updateSong);
router.delete('/:id', requireAuth, deleteSong);
router.post('/:id/play', incrementPlayCount);
router.get('/:id/lyrics', getLyrics);
router.put('/:id/lyrics', requireAuth, updateLyrics);

export default router;
