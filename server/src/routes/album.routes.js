import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
  createAlbum,
  getAlbums,
  getAlbum,
  getAlbumBySpotifyId,
  getAlbumTracks,
  updateAlbum,
  deleteAlbum,
  getPopularAlbums,
  getAlbumsByGenre,
  getAlbumsByYear
} from '../controllers/album.controller.js';

const router = Router();

// Public routes
router.get('/', getAlbums);
router.get('/popular', getPopularAlbums);
router.get('/genre', getAlbumsByGenre);
router.get('/year', getAlbumsByYear);
router.get('/spotify/:spotifyId', getAlbumBySpotifyId);
router.get('/:id', getAlbum);
router.get('/:id/tracks', getAlbumTracks);

// Protected routes (require authentication)
router.post('/', requireAuth, createAlbum);
router.put('/:id', requireAuth, updateAlbum);
router.delete('/:id', requireAuth, deleteAlbum);

export default router;
