import express from 'express';
import { listLyrics, getLyrics, importLyricsFromFile, createOrUpdateLyrics, deleteLyrics } from '../controllers/lyric.controller.js';
import { requireAdminOrAuth } from '../middlewares/admin.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

router.get('/', listLyrics);
router.get('/:songId', getLyrics);          //Gets Lyrics of the Song
router.post('/:songId', requireAdminOrAuth, createOrUpdateLyrics);
router.delete('/:songId', requireAdminOrAuth, deleteLyrics);
router.post('/:songId/import', requireAdminOrAuth, upload.single('lyrics'), importLyricsFromFile);

export default router;
