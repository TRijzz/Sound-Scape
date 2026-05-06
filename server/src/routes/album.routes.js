import { Router } from 'express';
import { optionalAdmin, requireAdminOrAuth } from '../middlewares/admin.js';
import { upload } from '../middlewares/upload.js';
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
router.get('/', optionalAdmin, getAlbums);
router.get('/popular', getPopularAlbums);
router.get('/genre', getAlbumsByGenre);
router.get('/year', getAlbumsByYear);
router.get('/spotify/:spotifyId', getAlbumBySpotifyId);
router.get('/:id/tracks', optionalAdmin, getAlbumTracks);
router.get('/:id', optionalAdmin, getAlbum);

// Protected routes (require authentication)
router.post('/', requireAdminOrAuth, upload.single('cover'), createAlbum);
router.put('/:id', requireAdminOrAuth, upload.single('cover'), updateAlbum);
router.delete('/:id', requireAdminOrAuth, deleteAlbum);

export default router;
