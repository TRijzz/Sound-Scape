import Lyric from '../models/Lyric.js';
import Song from '../models/Song.js';
import { parseLRC } from '../utils/lrcParser.js';
import fs from 'fs';
import mongoose from 'mongoose';

export const getLyrics = async (req, res) => {
  try {
    const { songId } = req.params;
    console.log(`[LyricController] Fetching lyrics for song: ${songId}`);
    
    // Check if songId is valid ObjectId
    if (!songId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log(`[LyricController] Invalid song ID format: ${songId}`);
      return res.status(400).json({ message: 'Invalid song ID format' });
    }

    const objectId = new mongoose.Types.ObjectId(songId);
    
    // Try finding by string and objectId to be sure
    let lyrics = await Lyric.findOne({ song: songId });
    
    if (!lyrics) {
        console.log(`[LyricController] Not found with string ID. Trying ObjectId casting...`);
        lyrics = await Lyric.findOne({ song: objectId });
    }

    if (!lyrics) {
      console.log(`[LyricController] No lyrics found for song: ${songId}`);
      
      // Debug: print all lyrics song IDs
      const allLyrics = await Lyric.find({}, 'song').lean();
      console.log(`[LyricController] Available lyric song IDs: ${allLyrics.map(l => l.song).join(', ')}`);
      
      return res.status(404).json({ message: 'Lyrics not found' });
    }
    
    console.log(`[LyricController] Found lyrics for song: ${songId}, lines: ${lyrics.lines?.length}`);
    res.json(lyrics);
  } catch (error) {
    console.error('[LyricController] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const importLyricsFromFile = async (req, res) => {
  try {
    const { songId } = req.params;
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ message: 'filePath is required' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: `File does not exist: ${filePath}` });
    }

    // Verify song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const lines = await parseLRC(filePath);
    
    const lyrics = await Lyric.findOneAndUpdate(
      { song: songId },
      { 
        lines, 
        synced: true,
        source: 'file' 
      },
      { new: true, upsert: true }
    );

    res.json(lyrics);
  } catch (error) {
    console.error('Import lyrics error:', error);
    res.status(500).json({ message: error.message });
  }
};
