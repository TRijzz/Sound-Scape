import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { 
  createSong, 
  getSongs, 
  getSong, 
  getSongBySpotifyId,
  getPopularSongs,
  getSongsByGenre,
  getSongsByYear,
  searchSongs,
  updateSong, 
  deleteSong, 
  incrementPlayCount, 
  getLyrics, 
  updateLyrics 
} from '../controllers/song.controller.js';

const router = Router();

// Public routes
router.get('/', getSongs);
router.get('/popular', getPopularSongs);
router.get('/genre', getSongsByGenre);
router.get('/year', getSongsByYear);
router.get('/search', searchSongs);
router.get('/spotify/:spotifyId', getSongBySpotifyId);
router.get('/:id', getSong);
router.get('/:id/lyrics', getLyrics);
router.post('/:id/play', incrementPlayCount);

// Protected routes (require authentication)
router.post('/', requireAuth, createSong);
router.put('/:id', requireAuth, updateSong);
router.put('/:id/lyrics', requireAuth, updateLyrics);
router.delete('/:id', requireAuth, deleteSong);

export default router;
