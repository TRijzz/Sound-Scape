import Lyric from '../models/Lyric.js';
import Song from '../models/Song.js';
import { parseLRC } from '../utils/lrcParser.js';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicLyricsDir = path.join(__dirname, '../../../public/lyrics');

const normalizeSongTitle = (value = '') => value
  .toLowerCase()
  .replace(/\((feat|featuring)[^)]+\)/gi, ' ')
  .replace(/\[(feat|featuring)[^\]]+\]/gi, ' ')
  .replace(/\b(feat|featuring)\.?\s+.+$/gi, ' ')
  .replace(/\s*-\s*feat\.?\s+.+$/gi, ' ')
  .trim();

const slugifySongName = (value = '') => normalizeSongTitle(value)
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const hasUsableSyncedLines = (lines = []) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return false;
  }

  const numericTimes = lines
    .map((line) => line?.time)
    .filter((time) => typeof time === 'number' && Number.isFinite(time));

  if (numericTimes.length === 0) {
    return false;
  }

  return Math.max(...numericTimes) > 1000;
};

const findLocalLyricsFile = (song) => {
  if (!song?.name || !fs.existsSync(publicLyricsDir)) {
    return null;
  }

  const targetSlug = slugifySongName(song.name);
  const candidates = fs.readdirSync(publicLyricsDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.lrc'))
    .sort((a, b) => a.localeCompare(b));

  const exactMatch = candidates.find((fileName) => slugifySongName(path.basename(fileName, '.lrc')) === targetSlug);
  if (exactMatch) {
    return path.join(publicLyricsDir, exactMatch);
  }

  const prefixMatch = candidates.find((fileName) => {
    const candidateSlug = slugifySongName(path.basename(fileName, '.lrc'));
    return candidateSlug.startsWith(targetSlug) || targetSlug.startsWith(candidateSlug);
  });
  return prefixMatch ? path.join(publicLyricsDir, prefixMatch) : null;
};

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

export const getLyrics = async (req, res) => {      //Fetches Lyrics from local file or database
  try {
    const { songId } = req.params;
    console.log(`[LyricController] Fetching lyrics for song: ${songId}`);
    
    // Check if songId is valid ObjectId
    if (!songId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log(`[LyricController] Invalid song ID format: ${songId}`);
      return res.status(400).json({ message: 'Invalid song ID format' });
    }

    const objectId = new mongoose.Types.ObjectId(songId);
    const song = await Song.findById(objectId).lean();
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    // Try finding by string and objectId to be sure
    let lyrics = await Lyric.findOne({ song: songId });  //Recives Song ID as parameter and tries to find lyrics for that song in the database.
    
    if (!lyrics) {
        console.log(`[LyricController] Not found with string ID. Trying ObjectId casting...`);
        lyrics = await Lyric.findOne({ song: objectId });
    }

    const localLyricsFile = findLocalLyricsFile(song);    
    const shouldUseLocalFile = !!localLyricsFile && (!lyrics || !lyrics.synced || !hasUsableSyncedLines(lyrics.lines));

    if (shouldUseLocalFile) {
      const lines = await parseLRC(localLyricsFile);
      const rawContent = fs.readFileSync(localLyricsFile, 'utf-8');

      const localLyricPayload = {
        song: song._id,
        lines,
        lyrics: rawContent,
        synced: true,
        source: 'file'
      };

      lyrics = await Lyric.findOneAndUpdate(
        { song: song._id },
        localLyricPayload,
        { new: true, upsert: true }
      );
    }

    if (!lyrics) {
      console.log(`[LyricController] No lyrics found for song: ${songId}`);
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

    const estimateLineTimings = (rawLyrics, durationMs = 0) => {
      const textLines = rawLyrics
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (textLines.length === 0) {
        return [];
      }

      const fallbackDurationMs = 5000;
      const estimatedStepMs = durationMs > 0
        ? Math.max(1000, Math.floor(durationMs / textLines.length))
        : fallbackDurationMs;

      return textLines.map((text, idx) => ({
        time: idx * estimatedStepMs,
        text
      }));
    };

    // Basic line splitting if not synced object
    let lines = [];
    if (typeof lyrics === 'string') {
      lines = estimateLineTimings(lyrics, song.duration_ms || song.duration || 0);
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

export const importLyricsFromFile = async (req, res) => {     //Import Lyrics by Admin and save it to the database
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
