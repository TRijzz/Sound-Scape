import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middlewares/auth.js';
import { createPlaylist, getMyPlaylists, getPlaylist, updatePlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist } from '../controllers/playlist.controller.js';

const router = Router();

router.post('/', requireAuth, createPlaylist);
router.get('/me', requireAuth, getMyPlaylists);
router.get('/:id', optionalAuth, getPlaylist);
router.put('/:id', requireAuth, updatePlaylist);
router.delete('/:id', requireAuth, deletePlaylist);
router.post('/:id/songs', requireAuth, addSongToPlaylist);
router.delete('/:id/songs', requireAuth, removeSongFromPlaylist);

export default router;
