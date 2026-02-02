import Lyric from '../models/Lyric.js';
import Song from '../models/Song.js';
import { parseLRC } from '../utils/lrcParser.js';
import fs from 'fs';
import mongoose from 'mongoose';

export const listLyrics = async (req, res) => {
  try {
    const items = await Lyric.find({})
      .populate('song', 'name')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ lyrics: items });
  } catch (error) {
    console.error('[LyricController] listLyrics error:', error);
    res.status(500).json({ message: error.message });
  }
};

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
    let lyrics = await Lyric.findOne({ song: songId });  //Recives Song ID as parameter and tries to find lyrics for that song in the database.
    
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

export const createOrUpdateLyrics = async (req, res) => {
  try {
    const { songId } = req.params;
    const { lyrics, synced = false } = req.body;

    if (!lyrics) {
      return res.status(400).json({ message: 'Lyrics content required' });
    }

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Basic line splitting if not synced object
    let lines = [];
    if (typeof lyrics === 'string') {
      lines = lyrics.split('\n').map((line, idx) => ({
        time: idx * 5, // dummy timing if not provided
        text: line.trim()
      })).filter(l => l.text);
    } else {
      lines = lyrics; // assume valid format if array
    }

    const updated = await Lyric.findOneAndUpdate(
      { song: songId },
      { 
        lines, 
        synced, 
        source: 'manual',
        lyrics: typeof lyrics === 'string' ? lyrics : ''
      },
      { new: true, upsert: true }
    );
    
    // Also update the song model's lyrics field for simple text access
    if (typeof lyrics === 'string') {
      song.lyrics = lyrics;
      await song.save();
    }

    res.json(updated);
  } catch (error) {
    console.error('Create lyrics error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const importLyricsFromFile = async (req, res) => {
  try {
    const { songId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: `File does not exist: ${filePath}` });
    }

    // Verify song exists
    const song = await Song.findById(songId);
    if (!song) {
      // Clean up uploaded file if song not found
      fs.unlinkSync(filePath);
      return res.status(404).json({ message: 'Song not found' });
    }

    const lines = await parseLRC(filePath);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    
    const lyrics = await Lyric.findOneAndUpdate(
      { song: songId },
      { 
        lines, 
        synced: true,
        source: 'file',
        lyrics: rawContent
      },
      { new: true, upsert: true }
    );
    
    // Update song model with raw lyrics
    song.lyrics = rawContent;
    await song.save();

    res.json(lyrics);
  } catch (error) {
    console.error('Import lyrics error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteLyrics = async (req, res) => {
  try {
    const { songId } = req.params;
    let deleted = await Lyric.findOneAndDelete({ song: songId });
    
    // If not found by song ref, try finding by ID (handling orphan lyrics)
    if (!deleted && mongoose.Types.ObjectId.isValid(songId)) {
      deleted = await Lyric.findByIdAndDelete(songId);
    }
    
    if (!deleted) {
      return res.status(404).json({ message: 'Lyrics not found' });
    }

    // Also clear lyrics from song
    const associatedSongId = deleted.song || songId;
    if (associatedSongId && mongoose.Types.ObjectId.isValid(associatedSongId)) {
      await Song.findByIdAndUpdate(associatedSongId, { $unset: { lyrics: 1 } });
    }

    res.json({ message: 'Lyrics deleted successfully' });
  } catch (error) {
    console.error('Delete lyrics error:', error);
    res.status(500).json({ message: error.message });
  }
};
