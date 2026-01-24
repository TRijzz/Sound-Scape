import express from 'express';
import { getLyrics, importLyricsFromFile } from '../controllers/lyric.controller.js';

const router = express.Router();

router.get('/:songId', getLyrics);
router.post('/:songId/import', importLyricsFromFile);

export default router;
