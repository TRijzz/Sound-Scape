import { Router } from 'express';
import { requireAdminOrAuth } from '../middlewares/admin.js';
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
  updateLyrics,
  populateSongCategories,
  playSong,
  getGenreStats
} from '../controllers/song.controller.js';

import { upload } from '../middlewares/upload.js';

const router = Router();

// Public routes
router.get('/', getSongs);
router.get('/popular', getPopularSongs);
router.get('/genre', getSongsByGenre);
router.get('/year', getSongsByYear);
router.get('/search', searchSongs);
router.get('/spotify/:spotifyId', getSongBySpotifyId);
router.get('/genre-stats', getGenreStats);
router.get('/:id', getSong);
router.get('/:id/lyrics', getLyrics);
router.post('/:id/play', playSong); // Changed from incrementPlayCount to playSong

// Protected routes (require authentication)
router.post('/', requireAdminOrAuth, upload.fields([
  { name: 'audio', maxCount: 1 }, 
  { name: 'cover', maxCount: 1 },
  { name: 'lyricsFile', maxCount: 1 }
]), createSong);

router.put('/:id', requireAdminOrAuth, upload.fields([
  { name: 'audio', maxCount: 1 }, 
  { name: 'cover', maxCount: 1 },
  { name: 'lyricsFile', maxCount: 1 }
]), updateSong);

router.put('/:id/lyrics', requireAdminOrAuth, updateLyrics);
router.delete('/:id', requireAdminOrAuth, deleteSong);

// Admin utility: auto-populate song categorization fields
router.post('/populate-categories', requireAdminOrAuth, populateSongCategories);

export default router;
