import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { 
  createArtist, 
  getArtists, 
  getArtist, 
  getArtistBySpotifyId,
  getArtistAlbums,
  getArtistTopTracks,
  getPopularArtists,
  getArtistsByGenre,
  updateArtist, 
  deleteArtist 
} from '../controllers/artist.controller.js';

const router = Router();

// Public routes
router.get('/', getArtists);
router.get('/popular', getPopularArtists);
router.get('/genre', getArtistsByGenre);
router.get('/spotify/:spotifyId', getArtistBySpotifyId);
router.get('/:id', getArtist);
router.get('/:id/albums', getArtistAlbums);
router.get('/:id/top-tracks', getArtistTopTracks);

// Protected routes (require authentication)
router.post('/', requireAuth, createArtist);
router.put('/:id', requireAuth, updateArtist);
router.delete('/:id', requireAuth, deleteArtist);

export default router;
