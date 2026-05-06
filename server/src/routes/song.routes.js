import { Router } from 'express';
import { optionalAdmin, requireAdminOrAuth } from '../middlewares/admin.js';
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
  updateLyrics,
  populateSongCategories,
  playSong,
  getGenreStats,
  getPersonalizedRecommendations,
  getListeningAnalytics,
  getAudioInventory,
  getSongMoods
} from '../controllers/song.controller.js';

import { upload } from '../middlewares/upload.js';

const router = Router();

// Public routes
router.get('/', optionalAdmin, getSongs);
router.get('/popular', getPopularSongs);
router.get('/genre', getSongsByGenre);
router.get('/year', getSongsByYear);
router.get('/search', searchSongs);
router.get('/spotify/:spotifyId', getSongBySpotifyId);
router.get('/genre-stats', getGenreStats);
router.get('/moods', getSongMoods);
router.get('/audio-inventory', requireAdminOrAuth, getAudioInventory);
router.get('/recommendations', requireAuth, getPersonalizedRecommendations);   //Backend route for personalized recommendations
router.get('/analytics/me', requireAuth, getListeningAnalytics);
router.get('/:id', optionalAdmin, getSong);
router.get('/:id/lyrics', optionalAdmin, getLyrics);
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
