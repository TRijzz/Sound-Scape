import { Router } from 'express';
import { requireAdminOrAuth } from '../middlewares/admin.js';
import { 
  createArtist, 
  getArtists, 
  getArtist, 
  getArtistBySpotifyId,
  getArtistAlbums,
  getArtistTopTracks,
  getPopularArtists,
  getArtistsByGenre,
  populateArtistGenres,
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
router.post('/', requireAdminOrAuth, createArtist);
router.post('/populate-genres', requireAdminOrAuth, populateArtistGenres);
router.put('/:id', requireAdminOrAuth, updateArtist);
router.delete('/:id', requireAdminOrAuth, deleteArtist);

export default router;
