import Song from '../models/Song.js';
import ListeningHistory from '../models/ListeningHistory.js'; // Added ListeningHistory model
import { broadcastNotification } from './notification.controller.js'; // Added notification broadcaster
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Lyric from '../models/Lyric.js';
import User from '../models/User.js';
import { parseLRC } from '../utils/lrcParser.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifySongTaxonomy, getSongTaxonomyLookups } from '../utils/songTaxonomy.js';
import { mirrorSongToTaxonomyDbs, removeSongFromTaxonomyDbs } from '../utils/songTaxonomyMirror.js';
import { ensureMoodsExist, getRegisteredMoods } from '../utils/moodRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicSongsDir = path.resolve(__dirname, '../../../public/songs');

const isAdminRequest = (req) => {
  return Boolean(req.isAdmin);
};

const hiddenArtistQuery = {
  $or: [
    { is_visible: false },
    { publish_status: { $in: ['hidden', 'draft'] } }
  ]
};

const visibleSongQuery = {
  is_visible: { $ne: false },
  publish_status: { $nin: ['hidden', 'draft'] }
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getHiddenArtistIds = async (req) => {
  if (isAdminRequest(req)) {
    return [];
  }

  const hiddenArtists = await Artist.find(hiddenArtistQuery).select('_id').lean();
  return hiddenArtists.map((artist) => artist._id);
};

const buildUploadedAudioVisibilityClause = () => ({
  $or: [
    { audio_url: { $exists: true, $nin: ['', null] } },
    { file_path: { $exists: true, $nin: ['', null] } }
  ]
});

const buildVisibleSongQuery = async (req, query = {}) => {        //Filters out hidden artists songs
  const baseQuery = isAdminRequest(req)
    ? query
    : (query && Object.keys(query).length > 0
      ? { $and: [query, visibleSongQuery] }
      : { ...visibleSongQuery });

  if (isAdminRequest(req)) {
    return baseQuery;
  }

  const hiddenArtistIds = await getHiddenArtistIds(req);
  if (hiddenArtistIds.length === 0) {
    return baseQuery;
  }

  const visibilityClause = {
    $or: [
      { artists: { $nin: hiddenArtistIds } },
      buildUploadedAudioVisibilityClause()
    ]
  };
  if (!baseQuery || Object.keys(baseQuery).length === 0) {
    return visibilityClause;
  }

  return {
    $and: [baseQuery, visibilityClause]
  };
};

const buildHiddenArtistIdSet = async (req) => {
  const hiddenArtistIds = await getHiddenArtistIds(req);
  return new Set(hiddenArtistIds.map((artistId) => String(artistId)));
};

const songHasHiddenArtist = (song = {}, hiddenArtistIdSet = new Set()) => {
  if (!hiddenArtistIdSet.size) {
    return false;
  }

  return Array.isArray(song?.artists) && song.artists.some((artist) => {
    const artistId = artist?._id || artist;
    return artistId && hiddenArtistIdSet.has(String(artistId));
  });
};

const resolveGenreLabel = (song) => {
  const directGenre = typeof song?.genre === 'string' ? song.genre.trim() : '';
  if (directGenre && !/^[a-f\d]{24}$/i.test(directGenre)) {
    return directGenre;
  }

  if (Array.isArray(song?.genres) && song.genres.length > 0) {
    const named = song.genres.find((genre) => typeof genre === 'string' && genre.trim() && !/^[a-f\d]{24}$/i.test(genre));
    if (named) return named.trim();
  }

  if (Array.isArray(song?.album?.genres) && song.album.genres.length > 0) {
    return String(song.album.genres[0] || '').trim() || 'Uncategorized';
  }

  if (Array.isArray(song?.artists)) {
    for (const artist of song.artists) {
      if (Array.isArray(artist?.genres) && artist.genres.length > 0) {
        return String(artist.genres[0] || '').trim() || 'Uncategorized';
      }
    }
  }

  return 'Uncategorized';
};

const buildSongSearchPatterns = (search = '') => {
  const query = String(search || '').trim();
  if (!query) return [];

  const variants = new Set([query]);
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('divide')) {
    variants.add('\u00F7 (Deluxe)');
    variants.add('Divide Deluxe');
  }

  if (query.includes('\u00F7')) {
    variants.add('Divide');
    variants.add('Divide Deluxe');
  }

  return Array.from(variants).map((variant) => ({
    $regex: escapeRegex(variant),
    $options: 'i'
  }));
};

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const audioFilePattern = /\.(mp3|wav|ogg|m4a|flac)$/i;

const sanitizePathSegment = (value = '', fallback = 'Untitled') => {
  const sanitized = String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .slice(0, 120);
  return sanitized || fallback;
};

const getUniqueFilePath = async (targetPath) => {
  const parsed = path.parse(targetPath);
  let candidate = targetPath;
  let count = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name}-${count}${parsed.ext}`);
    count += 1;
  }
  return candidate;
};

const moveFile = async (sourcePath, targetPath) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  try {
    await fs.promises.rename(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await fs.promises.copyFile(sourcePath, targetPath);
    await fs.promises.unlink(sourcePath);
  }
};

const getPrimaryArtistName = async (artistIds = [], albumId = '') => {
  if (albumId && mongoose.Types.ObjectId.isValid(String(albumId))) {
    const album = await Album.findById(albumId).select('artists').populate('artists', 'name').lean();
    const albumArtistName = album?.artists?.[0]?.name;
    if (albumArtistName) return albumArtistName;
  }

  const artistId = Array.isArray(artistIds) ? artistIds.find(Boolean) : artistIds;
  if (!artistId || !mongoose.Types.ObjectId.isValid(String(artistId))) return 'Unknown Artist';
  const artist = await Artist.findById(artistId).select('name').lean();
  return artist?.name || 'Unknown Artist';
};

const getAlbumName = async (albumId) => {
  if (!albumId || !mongoose.Types.ObjectId.isValid(String(albumId))) return '';
  const album = await Album.findById(albumId).select('name').lean();
  return album?.name || '';
};

const buildAudioUrlFromPath = (filePath) => {
  const relativePath = path.relative(publicSongsDir, filePath);
  return `/songs/${relativePath.split(path.sep).map((part) => encodeURIComponent(part)).join('/')}`;
};

const moveAudioToCatalogPath = async ({ tempPath, originalName, songName, artistIds = [], albumId = '' }) => {
  if (!tempPath) return null;
  const ext = path.extname(originalName || tempPath) || path.extname(tempPath);
  const artistName = await getPrimaryArtistName(artistIds, albumId);
  const albumName = await getAlbumName(albumId);
  const folders = [sanitizePathSegment(artistName, 'Unknown Artist')];
  if (albumName) folders.push(sanitizePathSegment(albumName, 'Unknown Album'));

  const fileName = `${sanitizePathSegment(songName || path.basename(originalName || tempPath, ext), 'Untitled Song')}${ext.toLowerCase()}`;
  const targetPath = await getUniqueFilePath(path.join(publicSongsDir, ...folders, fileName));
  const sourcePath = path.resolve(tempPath);

  if (sourcePath !== targetPath) {
    await moveFile(sourcePath, targetPath);
  }

  return {
    file_path: targetPath,
    audio_url: buildAudioUrlFromPath(targetPath)
  };
};

const buildSongFileCandidates = (song = {}) => {
  const candidates = [];
  const filePath = normalizeOptionalText(song?.file_path);
  const audioUrl = normalizeOptionalText(song?.audio_url);

  if (filePath) {
    candidates.push(path.isAbsolute(filePath) ? filePath : path.resolve(filePath));
  }

  if (audioUrl && audioUrl.startsWith('/songs/')) {
    const relativeAudioPath = decodeURIComponent(audioUrl.replace(/^\/songs\//, '')).split('/').join(path.sep);
    candidates.push(path.join(publicSongsDir, relativeAudioPath));
  }

  return Array.from(new Set(candidates));
};

const getExistingSongAudioPath = (song = {}) => {
  const candidates = buildSongFileCandidates(song);
  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || '';
};

const annotateSongAudioState = (song = {}) => {
  const existingAudioPath = getExistingSongAudioPath(song);
  return {
    ...song,
    has_uploaded_audio: Boolean(existingAudioPath),
    existing_audio_path: existingAudioPath || undefined
  };
};

const collectAudioFilesFromDisk = async () => {
  const files = [];

  if (!fs.existsSync(publicSongsDir)) {
    return files;
  }

  async function* walk(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const result = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        yield* walk(result);
      } else {
        yield result;
      }
    }
  }

  for await (const filePath of walk(publicSongsDir)) {
    if (audioFilePattern.test(filePath)) {
      files.push(filePath);
    }
  }

  return files;
};

const buildLyricsPreview = (lyrics = '', query = '') => {
  const text = String(lyrics || '');
  const search = String(query || '').trim();
  if (!text || !search) return '';

  const lowerText = text.toLowerCase();
  const lowerSearch = search.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerSearch);
  if (matchIndex === -1) {
    return text.slice(0, 120).trim();
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(text.length, matchIndex + search.length + 60);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
};

const annotateSongSearchMatch = (song, query, matchedLyrics = '') => {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const name = String(song?.name || '').toLowerCase();
  const title = String(song?.title || '').toLowerCase();
  const lyricsSource = matchedLyrics || song?.lyrics || '';
  const lyrics = String(lyricsSource).toLowerCase();

  let matchType = 'metadata';
  if (normalizedQuery && lyrics.includes(normalizedQuery) && !name.includes(normalizedQuery) && !title.includes(normalizedQuery)) {
    matchType = 'lyrics';
  }

  return {
    ...song,
    search_match_type: matchType,
    lyrics_preview: matchType === 'lyrics' ? buildLyricsPreview(lyricsSource, query) : ''
  };
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'be', 'because', 'for', 'from', 'i', 'in', 'is', 'it', 'me', 'my',
  'of', 'on', 'or', 'song', 'that', 'the', 'this', 'to', 'track', 'with', 'you', 'your'
]);

const normalizeToken = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .map((token) => token.trim())
  .filter((token) => token && token.length > 2 && !STOP_WORDS.has(token));

const buildSongKeywordSet = (songs = []) => {
  const keywordSet = new Set();
  songs.forEach((song) => {
    normalizeToken(song?.name || song?.title || '').forEach((token) => keywordSet.add(token));
  });
  return keywordSet;
};

const getRecentDayLabels = (days = 7) => {
  const labels = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    labels.push(date.toISOString().slice(0, 10));
  }
  return labels;
};

const formatReason = ({ basedOnSong, artistNames = [], genreNames = [], moodNames = [] }) => {
  if (basedOnSong) {
    return `Because you listened to ${basedOnSong}`;
  }
  if (artistNames.length > 0) {
    return `Because you like ${artistNames.slice(0, 2).join(' and ')}`;
  }
  if (genreNames.length > 0) {
    return `Because you enjoy ${genreNames.slice(0, 2).join(' and ')} songs`;
  }
  if (moodNames.length > 0) {
    return `Because you listen to ${moodNames.slice(0, 2).join(' and ')} moods`;
  }
  return 'Recommended for you';
};

export const createSong = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Song name is required' });
    }

    const songData = {
      name: req.body.name.trim(),
    };
    
    const uploadedAudio = req.files?.audio?.[0] || null;

    // Handle file uploads that do not depend on song metadata
    if (req.files) {
      if (req.files.cover) {
        songData.cover_art_url = `/images/${req.files.cover[0].filename}`;
      }
    }
    
    // Only add optional fields if they exist
    if (req.body.duration_ms !== undefined) {
      songData.duration_ms = req.body.duration_ms;
    } else if (req.body.duration) {
      songData.duration_ms = req.body.duration * 1000;
    }
    if (req.body.title) songData.title = req.body.title.trim();
    if (req.body.artists) {
      let artists = req.body.artists;
      if (typeof artists === 'string') {
        if (artists.startsWith('[')) {
          try { artists = JSON.parse(artists); } catch {}
        } else {
          artists = artists.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      songData.artists = Array.isArray(artists) ? artists : [artists];
    }
    if (req.body.album) songData.album = req.body.album;
    if (req.body.track_number !== undefined) songData.track_number = req.body.track_number;
    if (req.body.disc_number !== undefined) songData.disc_number = req.body.disc_number;
    if (req.body.explicit !== undefined) songData.explicit = req.body.explicit === 'true' || req.body.explicit === true;
    if (req.body.preview_url) songData.preview_url = req.body.preview_url;
    if (req.body.audio_url) songData.audio_url = req.body.audio_url; // Allow manual URL too
    if (req.body.cover_art_url) songData.cover_art_url = req.body.cover_art_url; // Allow manual URL too
    if (req.body.popularity !== undefined) songData.popularity = Number(req.body.popularity);
    if (req.body.lyrics) songData.lyrics = req.body.lyrics;
    if (req.body.is_visible !== undefined) songData.is_visible = req.body.is_visible === 'true' || req.body.is_visible === true;
    if (req.body.publish_status) songData.publish_status = req.body.publish_status;
    if (req.body.hidden_reason !== undefined) songData.hidden_reason = String(req.body.hidden_reason || '').trim();
    
    // Genre handling - use ObjectId reference
    if (req.body.genres) {
      let genres = req.body.genres;
      if (typeof genres === 'string') {
        if (genres.startsWith('[')) {
          try { genres = JSON.parse(genres); } catch {}
        } else {
          genres = genres.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      songData.genres = Array.isArray(genres) ? genres : [genres];
      if (songData.genres.length > 0) {
        songData.genre = songData.genres[0];
      }
    } else if (req.body.genre_id) {
      songData.genre = req.body.genre_id;
      songData.genres = [req.body.genre_id];
    } else if (req.body.genre && mongoose.Types.ObjectId.isValid(req.body.genre)) {
      songData.genre = req.body.genre;
      songData.genres = [req.body.genre];
    } else if (req.body.genre) {
      songData.genre = req.body.genre;
      songData.genres = [req.body.genre];
    }
    
    // If no genre provided, try to inherit from album
    if (!songData.genre && songData.album) {
      try {
        const album = await Album.findById(songData.album);
        if (album && album.genres && album.genres.length > 0) {
          songData.genres = album.genres;
          songData.genre = album.genres[0];
          console.log(`ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â·ÃƒÂ¯Ã‚Â¸Ã‚Â Inherited genres from album: ${album.genres.join(', ')}`);
        }
      } catch (err) {
        console.error('Error inheriting genres from album:', err);
      }
    }

    if (songData.genre) {
      console.log(`ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â·ÃƒÂ¯Ã‚Â¸Ã‚Â New Song "${songData.name}" assigned to genre: ${songData.genre}`);
    } else {
      console.log(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â New Song "${songData.name}" created without genre.`);
    }
    
    // Handle tags (could be 'tags' array, 'tags[]', or comma string)
    let tagsInput = req.body.tags || req.body['tags[]'];
    if (tagsInput) {
       if (typeof tagsInput === 'string') {
         // Try JSON first
         if (tagsInput.startsWith('[')) {
           try { tagsInput = JSON.parse(tagsInput); } catch {}
         } else {
           tagsInput = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
         }
       }
       if (Array.isArray(tagsInput)) {
         songData.tags = tagsInput.map(t => String(t).trim()).filter(Boolean);
       } else {
         songData.tags = [String(tagsInput).trim()];
       }
    }
    // Only include spotify_id if it's provided and not empty/null
    if (req.body.spotify_id && typeof req.body.spotify_id === 'string' && req.body.spotify_id.trim()) {
      songData.spotify_id = req.body.spotify_id.trim();
    }

    if (uploadedAudio) {
      Object.assign(songData, await moveAudioToCatalogPath({
        tempPath: uploadedAudio.path,
        originalName: uploadedAudio.originalname,
        songName: songData.name,
        artistIds: songData.artists || [],
        albumId: songData.album
      }));
    }

    if (songData.mood) {
      await ensureMoodsExist([songData.mood]);
    }

    const song = await Song.create(songData);

    // Handle Lyrics File Upload
    if (req.files && req.files.lyricsFile) {
      try {
        const lrcPath = req.files.lyricsFile[0].path;
        const lrcLines = await parseLRC(lrcPath);
        
        await Lyric.findOneAndUpdate(
          { song: song._id },
          { 
            lines: lrcLines,
            synced: true,
            source: 'file'
          },
          { upsert: true, new: true }
        );
        
        // Also update song.lyrics with raw text content
        const rawText = fs.readFileSync(lrcPath, 'utf8');
        song.lyrics = rawText;
        await song.save();
      } catch (err) {
        console.error('Error processing lyrics file:', err);
      }
    } else if (req.body.lyrics) {
        // If lyrics provided as text, create a Lyric entry too
        await Lyric.findOneAndUpdate(
            { song: song._id },
            { lyrics: req.body.lyrics, synced: false },
            { upsert: true }
        );
    }

    await mirrorSongToTaxonomyDbs(song._id);

    // Populate relationships for response
    await song.populate('artists', 'name spotify_id images');
    await song.populate('album', 'name images release_date');
    res.status(201).json(song);
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(400).json({ 
      message: 'Failed to create song', 
      error: error.message,
      details: error.errors || {}
    });
  }
};

export const getSongs = async (req, res) => {       //Gets songs with filters 
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-popularity',
      genre,
      year,
      search,
      artist,
      album,
      category,
      mood,
      language,
      tags,
      has_audio
    } = req.query;

    const query = {};
    
    // Add genre filter: prefer song.genre, fallback to artist genres
    if (genre) {
      const orClauses = [{ genre: new RegExp(genre, 'i') }];
      try {
        const artistsWithGenre = await Artist.find({ 
          genres: { $in: [new RegExp(genre, 'i')] }
        }).select('_id');
        if (artistsWithGenre.length) {
          orClauses.push({ artists: { $in: artistsWithGenre.map(a => a._id) } });
        }
      } catch {}
      query.$or = orClauses;
    }
    
    // Add year filter (through album)
    if (year) {
      const albumsInYear = await Album.find({ 
        release_date: { $regex: `^${year}` }
      }).select('_id');
      query.album = { $in: albumsInYear.map(a => a._id) };
    }
    
    // Add search filter - use regex for partial matching (better for autocomplete)
    if (search) {
      const regexSearch = search.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: regexSearch, $options: 'i' } },
        { title: { $regex: regexSearch, $options: 'i' } }
      ];
    }
    
    // Add artist filter
    if (artist) {
      query.artists = artist;
    }
    
    // Add album filter
    if (album) {
      query.album = album;
    }

    // Category filter
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    // Add mood filter
    if (mood) {
      const moodRegex = new RegExp(escapeRegex(mood), 'i');
      const albumsWithMood = await Album.find({
        moods: { $in: [moodRegex] }
      }).select('_id');

      const moodClauses = [{ mood: moodRegex }];
      if (albumsWithMood.length > 0) {
        moodClauses.push({ album: { $in: albumsWithMood.map((item) => item._id) } });
      }

      if (query.$or) {
        query.$and = [...(query.$and || []), { $or: query.$or }, { $or: moodClauses }];
        delete query.$or;
      } else {
        query.$or = moodClauses;
      }
    }

    // Add language filter
    if (language) {
      query.language = { $regex: language, $options: 'i' };
    }

    // Add tags filter (comma-separated -> match any)
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : String(tags).split(',');
      const normalized = tagList.map(t => String(t).trim()).filter(Boolean);
      if (normalized.length) {
        query.tags = { $in: normalized };
      }
    }

    const limitNum = parseInt(limit, 10);
    const requestedPage = parseInt(page, 10) || 1;
    // Admin requests can pull the whole catalog at once for the admin tables;
    // public requests stay capped at 1000 to protect against accidental DOS.
    const maxLimit = isAdminRequest(req) ? 10000 : 1000;
    const actualLimit = limitNum > maxLimit ? maxLimit : limitNum;
    const uploadedOnly = has_audio === 'true' || has_audio === '1';

    let songsWithAudioState = [];
    let total = 0;

    if (uploadedOnly) {
      const visibleUploadedQuery = await buildVisibleSongQuery(req, {
        ...query,
        ...buildUploadedAudioVisibilityClause()
      });

      const candidateSongs = await Song.find(visibleUploadedQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images release_date')
        .sort(sort)
        .lean();

      const uploadedSongs = candidateSongs.filter((song) => annotateSongAudioState(song).has_uploaded_audio);
      total = uploadedSongs.length;
      const skip = Math.max(0, (requestedPage - 1) * actualLimit);
      songsWithAudioState = uploadedSongs.slice(skip, skip + actualLimit).map((song) => annotateSongAudioState(song));
    } else {
      const skip = Math.max(0, (requestedPage - 1) * actualLimit);
      const visibleQuery = await buildVisibleSongQuery(req, query);
      const songs = await Song.find(visibleQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images release_date')
        .sort(sort)
        .skip(skip)
        .limit(actualLimit)
        .lean();

      songsWithAudioState = songs.map((song) => annotateSongAudioState(song));
      total = await Song.countDocuments(visibleQuery);
    }

    res.json({
      songs: songsWithAudioState,
      pagination: {
        page: requestedPage,
        limit: actualLimit,
        total,
        pages: Math.ceil(total / actualLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch songs', error: error.message });
  }
};

export const getSongMoods = async (req, res) => {
  try {
    const [songMoods, artistMoodLists, albumMoodLists] = await Promise.all([
      Song.distinct('mood', { mood: { $exists: true, $nin: ['', null] } }),
      Artist.distinct('mood_tags'),
      Album.distinct('moods')
    ]);

    await ensureMoodsExist([
      ...songMoods,
      ...artistMoodLists,
      ...albumMoodLists
    ]);

    const normalized = await getRegisteredMoods();

    res.json({
      moods: normalized,
      total: normalized.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch moods', error: error.message });
  }
};

export const getAudioInventory = async (req, res) => {
  try {
    const [diskFiles, songs] = await Promise.all([
      collectAudioFilesFromDisk(),
      Song.find({})
        .select('name file_path audio_url')
        .sort({ updatedAt: -1 })
        .lean()
    ]);

    const linkedSongs = songs
      .map((song) => annotateSongAudioState(song))
      .filter((song) => song.has_uploaded_audio);

    const linkedFilePathSet = new Set(
      linkedSongs
        .map((song) => normalizeOptionalText(song.existing_audio_path))
        .filter(Boolean)
        .map((filePath) => path.resolve(filePath))
    );

    const normalizedDiskFiles = diskFiles.map((filePath) => path.resolve(filePath));
    const orphanFiles = normalizedDiskFiles.filter((filePath) => !linkedFilePathSet.has(filePath));

    res.json({
      total_files: normalizedDiskFiles.length,
      linked_song_count: linkedSongs.length,
      orphan_file_count: orphanFiles.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch audio inventory', error: error.message });
  }
};

export const getSong = async (req, res) => {
  try {
    const visibleQuery = await buildVisibleSongQuery(req, { _id: req.params.id });
    const song = await Song.findOne(visibleQuery)
      .populate('artists', 'name spotify_id images genres')
      .populate('album', 'name images release_date artists genres')
      .lean();

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch song', error: error.message });
  }
};

/**
 * Record a play event and return song details including storage location
 */
export const playSong = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user ? req.user.id : null;

    const visibleQuery = await buildVisibleSongQuery(req, { _id: id });
    const song = await Song.findOne(visibleQuery)
      .populate('artists')
      .populate('album');

    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const genreName = resolveGenreLabel(song);
    const filePath = song.file_path || (song.audio_url ? song.audio_url : 'No storage path set');
    const artistNames = Array.isArray(song.artists) ? song.artists.map((artist) => artist.name).join(', ') : 'Unknown Artist';

    const playbackInfo = {
      song_id: song._id,
      title: song.name,
      artist: artistNames,
      duration: song.duration_ms,
      genre: genreName,
      file_path: filePath,
      audio_url: song.audio_url,
      cover_art_url: song.cover_art_url
    };

    song.play_count = (song.play_count || 0) + 1;
    song.last_played_at = new Date();
    await song.save();

    if (userId) {
      try {
        await ListeningHistory.create({
          user: userId,
          song: song._id,
          genre: genreName,
          duration_listened_ms: song.duration_ms || 0
        });
      } catch (histErr) {
        console.error('Failed to record listening history:', histErr.message);
      }
    }

    try {
      broadcastNotification({
        type: 'SONG_PLAYED',
        message: `Playing: "${song.name}" by ${artistNames}`,
        storage_location: filePath,
        genre_info: genreName,
        analytics_info: genreName
      });
    } catch (notifyErr) {
      console.error('Failed to broadcast admin notification:', notifyErr.message);
    }

    res.json(playbackInfo);
  } catch (error) {
    res.status(500).json({ message: 'Failed to process song playback', error: error.message });
  }
};

/**
 * Get genre-based analytics
 */
export const getGenreStats = async (req, res) => {
  try {
    const stats = await ListeningHistory.aggregate([
      {
        $group: {
          _id: '$genre',
          play_count: { $sum: 1 },
          unique_users: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          genre_name: '$_id',
          play_count: 1,
          user_count: { $size: '$unique_users' }
        }
      },
      { $sort: { play_count: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch genre statistics', error: error.message });
  }
};

export const getForYouFeed = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 24, 60));

    const user = await User.findById(userId)
      .select('preferred_genres preferred_moods preferred_languages preferred_tags onboarded')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const cleanList = (value) =>
      Array.isArray(value)
        ? value.map((item) => String(item || '').trim()).filter(Boolean)
        : [];

    const genres = cleanList(user.preferred_genres);
    const moods = cleanList(user.preferred_moods);
    const languages = cleanList(user.preferred_languages);
    const tags = cleanList(user.preferred_tags);

    const preferences = { genres, moods, languages, tags };
    const hasAny = genres.length || moods.length || languages.length || tags.length;

    if (!hasAny) {
      return res.json({ songs: [], preferences, matched: false });
    }

    const buildGenreClause = async () => {
      if (!genres.length) return null;
      const regexes = genres.map((g) => new RegExp(escapeRegex(g), 'i'));
      const [artistIds, albumIds] = await Promise.all([
        Artist.find({ genres: { $in: regexes } }).select('_id').lean(),
        Album.find({ genres: { $in: regexes } }).select('_id').lean()
      ]);
      const orClauses = [
        { genre: { $in: regexes } },
        { genres: { $in: regexes } }
      ];
      if (artistIds.length) orClauses.push({ artists: { $in: artistIds.map((a) => a._id) } });
      if (albumIds.length) orClauses.push({ album: { $in: albumIds.map((a) => a._id) } });
      return { $or: orClauses };
    };

    const buildMoodClause = async () => {
      if (!moods.length) return null;
      const regexes = moods.map((m) => new RegExp(escapeRegex(m), 'i'));
      const albumIds = await Album.find({ moods: { $in: regexes } }).select('_id').lean();
      const orClauses = [{ mood: { $in: regexes } }];
      if (albumIds.length) orClauses.push({ album: { $in: albumIds.map((a) => a._id) } });
      return { $or: orClauses };
    };

    const buildLanguageClause = () => {
      if (!languages.length) return null;
      const regexes = languages.map((l) => new RegExp(escapeRegex(l), 'i'));
      return { language: { $in: regexes } };
    };

    const buildTagsClause = () => {
      if (!tags.length) return null;
      return { tags: { $in: tags } };
    };

    const [genreClause, moodClause] = await Promise.all([
      buildGenreClause(),
      buildMoodClause()
    ]);
    const languageClause = buildLanguageClause();
    const tagsClause = buildTagsClause();

    const allClauses = [genreClause, moodClause, languageClause, tagsClause].filter(Boolean);

    const runQuery = async (clauses) => {
      if (!clauses.length) return [];
      const matchQuery = clauses.length === 1 ? clauses[0] : { $and: clauses };
      const visibleQuery = await buildVisibleSongQuery(req, matchQuery);
      return Song.find(visibleQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images release_date')
        .sort({ popularity: -1, play_count: -1 })
        .limit(limit)
        .lean();
    };

    let songs = await runQuery(allClauses);

    // Relax progressively if too few results: drop tags, then language, then mood
    const fallbackOrder = [tagsClause, languageClause, moodClause];
    let workingClauses = [...allClauses];
    for (const clauseToDrop of fallbackOrder) {
      if (songs.length >= Math.min(limit, 8)) break;
      if (!clauseToDrop) continue;
      workingClauses = workingClauses.filter((c) => c !== clauseToDrop);
      const relaxed = await runQuery(workingClauses);
      const seen = new Set(songs.map((s) => String(s._id)));
      for (const candidate of relaxed) {
        if (!seen.has(String(candidate._id))) {
          songs.push(candidate);
          seen.add(String(candidate._id));
        }
        if (songs.length >= limit) break;
      }
    }

    const annotated = songs.slice(0, limit).map((song) => annotateSongAudioState(song));

    res.json({
      songs: annotated,
      preferences,
      matched: annotated.length > 0
    });
  } catch (error) {
    console.error('getForYouFeed error:', error);
    res.status(500).json({ message: 'Failed to fetch personalized feed', error: error.message });
  }
};

export const getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 12, 24));
    const hiddenArtistIdSet = await buildHiddenArtistIdSet(req);

    const [user, recentHistory] = await Promise.all([
      User.findById(userId)
        .populate({
          path: 'likedSongs',
          populate: [
            { path: 'artists', select: 'name genres' },
            { path: 'album', select: 'name genres' }
          ]
        })
        .select('likedSongs')
        .lean(),
      ListeningHistory.find({ user: userId })
        .sort({ played_at: -1 })
        .limit(30)
        .populate({
          path: 'song',
          populate: [
            { path: 'artists', select: 'name genres' },
            { path: 'album', select: 'name genres' }
          ]
        })
        .lean()
    ]);

    const historySongs = recentHistory
      .map((entry) => entry.song)
      .filter((song) => song && !songHasHiddenArtist(song, hiddenArtistIdSet));
    const likedSongs = (Array.isArray(user?.likedSongs) ? user.likedSongs : [])
      .filter((song) => song && !songHasHiddenArtist(song, hiddenArtistIdSet));
    const seedSongs = [...historySongs, ...likedSongs];

    if (seedSongs.length === 0) {
      const fallbackQuery = await buildVisibleSongQuery(req, {});
      const fallbackSongs = await Song.find(fallbackQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images release_date')
        .sort({ popularity: -1, play_count: -1 })
        .limit(limit)
        .lean();

      return res.json({
        title: 'Popular right now',
        reason: 'Recommended from trending songs',
        based_on: [],
        tracks: fallbackSongs
      });
    }

    const playedSongIds = new Set(historySongs.map((song) => String(song._id)));
    const likedSongIds = new Set(likedSongs.map((song) => String(song._id)));
    const excludedSongIds = new Set([...playedSongIds, ...likedSongIds]);
    const artistIds = new Set();
    const genres = new Set();
    const moods = new Set();

    seedSongs.forEach((song) => {
      (song.artists || []).forEach((artist) => {
        if (artist?._id) artistIds.add(String(artist._id));
        (artist?.genres || []).forEach((genre) => {
          const cleaned = String(genre || '').trim();
          if (cleaned) genres.add(cleaned);
        });
      });

      (song.genres || []).forEach((genre) => {
        const cleaned = String(genre || '').trim();
        if (cleaned) genres.add(cleaned);
      });

      const directGenre = String(song.genre || '').trim();
      if (directGenre) genres.add(directGenre);

      const mood = String(song.mood || '').trim();
      if (mood) moods.add(mood);
    });

    const keywordSet = buildSongKeywordSet(seedSongs);
    const keywordRegexes = Array.from(keywordSet).slice(0, 8).map((token) => new RegExp(escapeRegex(token), 'i'));

    const candidateQuery = {
      _id: { $nin: Array.from(excludedSongIds).map((id) => new mongoose.Types.ObjectId(id)) }
    };

    const orClauses = [];
    if (artistIds.size > 0) {
      orClauses.push({ artists: { $in: Array.from(artistIds).map((id) => new mongoose.Types.ObjectId(id)) } });
    }
    if (genres.size > 0) {
      const genreRegexes = Array.from(genres).slice(0, 8).map((genre) => new RegExp(escapeRegex(genre), 'i'));
      orClauses.push({ genre: { $in: genreRegexes } });
      orClauses.push({ genres: { $in: genreRegexes } });
    }
    if (moods.size > 0) {
      const moodRegexes = Array.from(moods).slice(0, 5).map((mood) => new RegExp(escapeRegex(mood), 'i'));
      orClauses.push({ mood: { $in: moodRegexes } });
    }
    if (keywordRegexes.length > 0) {
      orClauses.push({ name: { $in: keywordRegexes } });
      orClauses.push({ title: { $in: keywordRegexes } });
    }
    if (orClauses.length > 0) {
      candidateQuery.$or = orClauses;
    }

    const visibleCandidateQuery = await buildVisibleSongQuery(req, candidateQuery);
    const candidates = await Song.find(visibleCandidateQuery)
      .populate('artists', 'name spotify_id images genres')
      .populate('album', 'name images release_date')
      .sort({ popularity: -1, play_count: -1 })
      .limit(120)
      .lean();

    const scored = candidates.map((song) => {
      let score = 0;
      const matchedArtists = [];
      const matchedGenres = [];
      const matchedMoods = [];
      const matchedKeywords = [];

      (song.artists || []).forEach((artist) => {
        if (artistIds.has(String(artist?._id))) {
          matchedArtists.push(artist.name);
          score += 5;
        }
      });

      [song.genre, ...(song.genres || [])].filter(Boolean).forEach((genre) => {
        if (genres.has(String(genre).trim())) {
          matchedGenres.push(String(genre).trim());
          score += 3;
        }
      });

      if (song.mood && moods.has(String(song.mood).trim())) {
        matchedMoods.push(String(song.mood).trim());
        score += 2;
      }

      normalizeToken(song.name || song.title || '').forEach((token) => {
        if (keywordSet.has(token)) {
          matchedKeywords.push(token);
          score += 1;
        }
      });

      score += Math.min(2, Math.round((song.popularity || 0) / 35));
      score += Math.min(2, Math.round((song.play_count || 0) / 20));

      return {
        ...song,
        recommendation_score: score,
        recommendation_reason: formatReason({
          basedOnSong: historySongs[0]?.name || likedSongs[0]?.name || '',
          artistNames: matchedArtists,
          genreNames: matchedGenres,
          moodNames: matchedMoods
        }),
        recommendation_context: {
          artists: [...new Set(matchedArtists)],
          genres: [...new Set(matchedGenres)],
          moods: [...new Set(matchedMoods)],
          keywords: [...new Set(matchedKeywords)]
        }
      };
    })
      .filter((song) => song.recommendation_score > 0)
      .sort((left, right) => right.recommendation_score - left.recommendation_score)
      .slice(0, limit);

    const fallbackNeeded = scored.length < limit;
    if (fallbackNeeded) {
      const fallbackQuery = await buildVisibleSongQuery(req, {
        _id: { $nin: Array.from(excludedSongIds).map((id) => new mongoose.Types.ObjectId(id)) }
      });
      const fallbackSongs = await Song.find(fallbackQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images release_date')
        .sort({ popularity: -1, play_count: -1 })
        .limit(limit)
        .lean();

      fallbackSongs.forEach((song) => {
        if (scored.length < limit && !scored.some((item) => String(item._id) === String(song._id))) {
          scored.push({
            ...song,
            recommendation_score: 0,
            recommendation_reason: 'Trending pick for you',
            recommendation_context: { artists: [], genres: [], moods: [], keywords: [] }
          });
        }
      });
    }

    res.json({
      title: 'Because you listened to…',
      reason: formatReason({
        basedOnSong: historySongs[0]?.name || likedSongs[0]?.name || '',
        artistNames: Array.from(artistIds).length > 0 ? (historySongs[0]?.artists || []).map((artist) => artist.name).filter(Boolean) : [],
        genreNames: Array.from(genres),
        moodNames: Array.from(moods)
      }),
      based_on: seedSongs.slice(0, 3).map((song) => ({
        _id: song._id,
        name: song.name,
      })),
      tracks: scored
    });
  } catch (error) {
    console.error('Failed to get personalized recommendations:', error);
    res.status(500).json({ message: 'Failed to get personalized recommendations', error: error.message });
  }
};

export const getListeningAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const history = await ListeningHistory.find({ user: userId })
      .sort({ played_at: -1 })
      .limit(250)
      .populate({
        path: 'song',
        populate: [
          { path: 'artists', select: 'name' },
          { path: 'album', select: 'name' }
        ]
      })
      .lean();

    const validHistory = history.filter((entry) => entry.song);
    const totalPlays = validHistory.length;
    const totalListeningMinutes = Math.round(validHistory.reduce((sum, entry) => sum + (entry.duration_listened_ms || 0), 0) / 60000);

    const songCounts = new Map();
    const artistCounts = new Map();
    const genreCounts = new Map();
    const trendCounts = new Map(getRecentDayLabels(7).map((label) => [label, 0]));

    validHistory.forEach((entry) => {
      const song = entry.song;
      const songId = String(song._id);
      songCounts.set(songId, { song, count: (songCounts.get(songId)?.count || 0) + 1 });

      (song.artists || []).forEach((artist) => {
        const artistId = String(artist._id || artist.name);
        artistCounts.set(artistId, {
          artist,
          count: (artistCounts.get(artistId)?.count || 0) + 1
        });
      });

      const genreName = String(entry.genre || song.genre || 'Unknown').trim() || 'Unknown';
      genreCounts.set(genreName, (genreCounts.get(genreName) || 0) + 1);

      const dayKey = new Date(entry.played_at).toISOString().slice(0, 10);
      if (trendCounts.has(dayKey)) {
        trendCounts.set(dayKey, (trendCounts.get(dayKey) || 0) + 1);
      }
    });

    const topSong = Array.from(songCounts.values()).sort((left, right) => right.count - left.count)[0] || null;
    const topArtist = Array.from(artistCounts.values()).sort((left, right) => right.count - left.count)[0] || null;
    const topGenre = Array.from(genreCounts.entries()).sort((left, right) => right[1] - left[1])[0] || null;

    res.json({
      totalPlays,
      totalListeningMinutes,
      favoriteSong: topSong ? {
        _id: topSong.song._id,
        name: topSong.song.name,
        count: topSong.count
      } : null,
      favoriteArtist: topArtist ? {
        _id: topArtist.artist._id,
        name: topArtist.artist.name,
        count: topArtist.count
      } : null,
      favoriteGenre: topGenre ? {
        name: topGenre[0],
        count: topGenre[1]
      } : null,
      weeklyTrend: Array.from(trendCounts.entries()).map(([date, plays]) => ({ date, plays }))
    });
  } catch (error) {
    console.error('Failed to fetch listening analytics:', error);
    res.status(500).json({ message: 'Failed to fetch listening analytics', error: error.message });
  }
};

export const getSongBySpotifyId = async (req, res) => {
  try {
    const visibleQuery = await buildVisibleSongQuery(req, { spotify_id: req.params.spotifyId });
    const song = await Song.findOne(visibleQuery)
      .populate('artists', 'name spotify_id images genres')
      .populate('album', 'name images release_date artists')
      .lean();
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    res.json(song);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch song', error: error.message });
  }
};

export const getPopularSongs = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const visibleQuery = await buildVisibleSongQuery(req, { popularity: { $gt: 0 } });
    
    const songs = await Song.find(visibleQuery)
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch popular songs', error: error.message });
  }
};

export const getSongsByGenre = async (req, res) => {
  try {
    const { genre, limit = 20 } = req.query;
    
    if (!genre) {
      return res.status(400).json({ message: 'Genre parameter is required' });
    }
    
    const genreRegex = new RegExp(genre, 'i');
    
    // Find artists with this genre
    const artistsWithGenre = await Artist.find({ 
      genres: { $in: [genreRegex] }
    }).select('_id');
    
    // Find albums with this genre
    const albumsWithGenre = await Album.find({
      genres: { $in: [genreRegex] }
    }).select('_id');

    // Find songs that match the genre directly, OR belong to matching artists, OR belong to matching albums
    const visibleQuery = await buildVisibleSongQuery(req, { 
      $or: [
        { genre: genreRegex },
        { artists: { $in: artistsWithGenre.map(a => a._id) } },
        { album: { $in: albumsWithGenre.map(a => a._id) } }
      ]
    });

    const songs = await Song.find(visibleQuery)
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch songs by genre', error: error.message });
  }
};

export const getSongsByYear = async (req, res) => {
  try {
    const { year, limit = 20 } = req.query;
    
    if (!year) {
      return res.status(400).json({ message: 'Year parameter is required' });
    }
    
    const albumsInYear = await Album.find({ 
      release_date: { $regex: `^${year}` }
    }).select('_id');
    
    const visibleQuery = await buildVisibleSongQuery(req, { 
      album: { $in: albumsInYear.map(a => a._id) }
    });

    const songs = await Song.find(visibleQuery)
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images release_date')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch songs by year', error: error.message });
  }
};

export const searchSongs = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // For regex, escape special characters but preserve asterisks (they might be in song names)
    const regexQuery = q.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    
    let songs;
    try {
      // Try text search first (requires text index)
      const textQuery = await buildVisibleSongQuery(req, { 
        $text: { $search: q }
      });

      songs = await Song.find(textQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images')
        .sort({ score: { $meta: 'textScore' }, popularity: -1 })
        .limit(parseInt(limit))
        .lean();
    } catch (textError) {
      // Fallback to regex search if text index doesn't exist or fails
      const regexSearchQuery = await buildVisibleSongQuery(req, { 
        $or: [
          { name: { $regex: regexQuery, $options: 'i' } },
          { title: { $regex: regexQuery, $options: 'i' } },
          { lyrics: { $regex: regexQuery, $options: 'i' } }
        ]
      });

      songs = await Song.find(regexSearchQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images')
        .sort({ popularity: -1 })
        .limit(parseInt(limit))
        .lean();
    }
    
    // If no results with text search, try regex as fallback
    if (!songs || songs.length === 0) {
      const fallbackSearchQuery = await buildVisibleSongQuery(req, { 
        $or: [
          { name: { $regex: regexQuery, $options: 'i' } },
          { title: { $regex: regexQuery, $options: 'i' } },
          { lyrics: { $regex: regexQuery, $options: 'i' } }
        ]
      });

      songs = await Song.find(fallbackSearchQuery)
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images')
        .sort({ popularity: -1 })
        .limit(parseInt(limit))
        .lean();
    }

    const lyricMatches = await Lyric.find({
      lyrics: { $regex: regexQuery, $options: 'i' }
    })
      .select('song lyrics')
      .limit(Math.max(parseInt(limit, 10) * 3, 20))
      .lean();

    const lyricTextBySongId = new Map();
    const lyricSongIds = [];
    lyricMatches.forEach((entry) => {
      const songId = String(entry?.song || '');
      if (!songId) return;
      if (!lyricTextBySongId.has(songId)) {
        lyricTextBySongId.set(songId, entry.lyrics || '');
        lyricSongIds.push(entry.song);
      }
    });

    if (lyricSongIds.length > 0) {
      const existingIds = new Set((songs || []).map((song) => String(song._id)));
      const missingLyricIds = lyricSongIds.filter((songId) => !existingIds.has(String(songId)));

      if (missingLyricIds.length > 0) {
        const lyricSongQuery = await buildVisibleSongQuery(req, {
          _id: { $in: missingLyricIds }
        });

        const lyricSongs = await Song.find(lyricSongQuery)
          .populate('artists', 'name spotify_id images')
          .populate('album', 'name images')
          .sort({ popularity: -1 })
          .lean();

        songs = [...(songs || []), ...lyricSongs];
      }
    }

    const dedupedSongs = [];
    const seenSongIds = new Set();
    for (const song of (songs || [])) {
      const songId = String(song?._id || '');
      if (!songId || seenSongIds.has(songId)) continue;
      seenSongIds.add(songId);
      dedupedSongs.push(song);
      if (dedupedSongs.length >= parseInt(limit, 10)) break;
    }

    res.json(dedupedSongs.map((song) => annotateSongSearchMatch(song, q, lyricTextBySongId.get(String(song._id)) || '')));
  } catch (error) {
    res.status(500).json({ message: 'Failed to search songs', error: error.message });
  }
};

export const updateSong = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const unsetData = {};
    const existingSong = await Song.findById(req.params.id).select('name artists album file_path audio_url');

    if (!existingSong) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    // Remove internal fields if they leaked from body
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const uploadedAudio = req.files?.audio?.[0] || null;

    // Handle file uploads that do not depend on song metadata
    if (req.files) {
      if (req.files.cover) {
        updateData.cover_art_url = `/images/${req.files.cover[0].filename}`;
      }
    }

    if (updateData.remove_audio === 'true' || updateData.remove_audio === true) {
      delete updateData.remove_audio;
      delete updateData.audio_url;
      delete updateData.file_path;
      unsetData.audio_url = 1;
      unsetData.file_path = 1;

      if (existingSong.file_path && fs.existsSync(existingSong.file_path)) {
        try {
          fs.unlinkSync(existingSong.file_path);
        } catch (unlinkError) {
          console.error('Failed to remove audio file:', unlinkError);
        }
      }
    } else {
      delete updateData.remove_audio;
    }

    // Handle numeric/boolean fields from FormData
    if (updateData.duration_ms) {
      updateData.duration_ms = Number(updateData.duration_ms);
    } else if (updateData.duration) {
      updateData.duration_ms = Number(updateData.duration) * 1000;
      delete updateData.duration;
    }
    if (updateData.track_number) updateData.track_number = Number(updateData.track_number);
    if (updateData.disc_number) updateData.disc_number = Number(updateData.disc_number);
    if (updateData.popularity) updateData.popularity = Number(updateData.popularity);
    if (updateData.explicit !== undefined) {
      updateData.explicit = updateData.explicit === 'true' || updateData.explicit === true;
    }

    // Handle nested external_urls (often sent as external_urls.spotify from FormData)
    if (updateData['external_urls.spotify']) {
      updateData.external_urls = { ...updateData.external_urls, spotify: updateData['external_urls.spotify'] };
      delete updateData['external_urls.spotify'];
    } else if (typeof updateData.external_urls === 'string') {
      try { updateData.external_urls = JSON.parse(updateData.external_urls); } catch {}
    }

    // Handle Artists (JSON string or array)
    if (updateData.artists) {
      if (typeof updateData.artists === 'string') {
        if (updateData.artists.startsWith('[')) {
          try { updateData.artists = JSON.parse(updateData.artists); } catch {}
        } else {
           if (updateData.artists.includes(',')) {
             updateData.artists = updateData.artists.split(',').map(s => s.trim()).filter(Boolean);
           } else {
             updateData.artists = [updateData.artists];
           }
        }
      }
    }

    // Handle Tags
    if (!updateData.tags && req.body['tags[]']) {
      updateData.tags = req.body['tags[]'];
    }

    if (updateData.tags) {
       if (typeof updateData.tags === 'string') {
         if (updateData.tags.startsWith('[')) {
           try { updateData.tags = JSON.parse(updateData.tags); } catch {}
         } else {
           updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(Boolean);
         }
       }
       if (Array.isArray(updateData.tags)) {
         updateData.tags = updateData.tags.map(t => String(t).trim()).filter(Boolean);
       } else {
         updateData.tags = [String(updateData.tags).trim()];
       }
    }

    // Persist taxonomy fields from admin edits as clean strings
    ['genre', 'category', 'mood', 'language'].forEach((field) => {
      if (updateData[field] !== undefined) {
        const normalized = normalizeOptionalText(updateData[field]);
        if (normalized === '') {
          delete updateData[field];
          unsetData[field] = 1;
        } else {
          updateData[field] = normalized;
        }
      }
    });

    if (updateData.is_visible !== undefined) {
      updateData.is_visible = updateData.is_visible === 'true' || updateData.is_visible === true;
    }
    if (updateData.hidden_reason !== undefined) {
      updateData.hidden_reason = String(updateData.hidden_reason || '').trim();
    }

    if (updateData.mood) {
      await ensureMoodsExist([updateData.mood]);
    }

    // Improved Genre handling - Map text names to ObjectId references
    if (updateData.genres !== undefined) {
      if (typeof updateData.genres === 'string') {
        if (updateData.genres.startsWith('[')) {
          try { updateData.genres = JSON.parse(updateData.genres); } catch {}
        } else {
          updateData.genres = updateData.genres.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(updateData.genres) && updateData.genres.length > 0) {
        updateData.genre = updateData.genres[0];
      }
    } else if (updateData.genre !== undefined) {
      if (updateData.genre === '' || updateData.genre === null) {
        delete updateData.genre;
        updateData.genres = [];
      } else {
        updateData.genres = [updateData.genre];
      }
    }

    // If album is being updated, maybe inherit genres?
    if (updateData.album && !updateData.genres) {
       try {
         const album = await Album.findById(updateData.album);
         if (album && album.genres && album.genres.length > 0) {
           updateData.genres = album.genres;
           updateData.genre = album.genres[0];
         }
       } catch {}
    }

    if (uploadedAudio) {
      const nextAudio = await moveAudioToCatalogPath({
        tempPath: uploadedAudio.path,
        originalName: uploadedAudio.originalname,
        songName: updateData.name || existingSong.name,
        artistIds: updateData.artists || existingSong.artists || [],
        albumId: updateData.album !== undefined ? updateData.album : existingSong.album
      });
      updateData.audio_url = nextAudio.audio_url;
      updateData.file_path = nextAudio.file_path;

      if (existingSong.file_path && fs.existsSync(existingSong.file_path) && path.resolve(existingSong.file_path) !== nextAudio.file_path) {
        try {
          fs.unlinkSync(existingSong.file_path);
        } catch (unlinkError) {
          console.error('Failed to remove previous audio file:', unlinkError);
        }
      }
    }

    const updateOperations = {};
    if (Object.keys(updateData).length > 0) {
      updateOperations.$set = updateData;
    }
    if (Object.keys(unsetData).length > 0) {
      updateOperations.$unset = unsetData;
    }

    const song = await Song.findByIdAndUpdate(
      req.params.id,
      updateOperations,
      { new: true }
    )
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .lean();
    
    // Handle Lyrics File Upload (Update)
    if (req.files && req.files.lyricsFile) {
      try {
        const lrcPath = req.files.lyricsFile[0].path;
        const lrcLines = await parseLRC(lrcPath);
        
        await Lyric.findOneAndUpdate(
          { song: song._id },
          { 
            lines: lrcLines,
            synced: true,
            source: 'file'
          },
          { upsert: true, new: true }
        );
        
        const rawText = fs.readFileSync(lrcPath, 'utf8');
        await Song.findByIdAndUpdate(song._id, { lyrics: rawText });
      } catch (err) {
        console.error('Error processing lyrics file update:', err);
      }
    } else if (req.body.lyrics) {
         await Lyric.findOneAndUpdate(
             { song: song._id },
             { lyrics: req.body.lyrics, synced: false },
             { upsert: true }
         );
    }

    await mirrorSongToTaxonomyDbs(song._id);
    
    res.json(song);
  } catch (error) {
    console.error('[SongController] updateSong error details:', error);
    res.status(400).json({ 
      message: 'Failed to update song', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const deleteSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const audioCandidates = buildSongFileCandidates(song);
    audioCandidates.forEach((candidatePath) => {
      try {
        if (fs.existsSync(candidatePath)) {
          fs.unlinkSync(candidatePath);
        }
      } catch (unlinkError) {
        console.error('Failed to remove deleted song audio file:', unlinkError);
      }
    });

    // Also delete associated lyrics
    await Lyric.findOneAndDelete({ song: req.params.id });
    await removeSongFromTaxonomyDbs(song._id);
    
    res.json({ success: true, message: 'Song deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete song', error: error.message });
  }
};

export const incrementPlayCount = async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { play_count: 1 } },
      { new: true }
    )
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .lean();
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    res.json(song);
  } catch (error) {
    res.status(500).json({ message: 'Failed to increment play count', error: error.message });
  }
};

export const getLyrics = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .select('lyrics name title')
      .lean();
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    res.json({ 
      lyrics: song.lyrics || '', 
      title: song.title || song.name,
      name: song.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lyrics', error: error.message });
  }
};

export const updateLyrics = async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { lyrics: req.body.lyrics },
      { new: true }
    )
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .lean();
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    res.json(song);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update lyrics', error: error.message });
  }
};

export const populateSongCategories = async (req, res) => {
  try {
    const {
      dryRun = false,
      limit = 1000,
      overwriteGenre = false,
      overwriteCategory = false
    } = req.body || {};

    const parsedLimit = Math.max(parseInt(limit, 10) || 0, 0);
    const lookups = await getSongTaxonomyLookups();
    let query = Song.find({})
      .select('_id name artists album genre genres category tags explicit')
      .populate('artists', 'name genres')
      .populate('album', 'name genres release_date');

    if (parsedLimit > 0) {
      query = query.limit(parsedLimit);
    }

    const songs = await query.lean();
    const updates = [];

    for (const song of songs) {
      const { updates: nextSet, reasons } = classifySongTaxonomy(song, lookups, {
        overwriteGenre,
        overwriteCategory
      });

      if (Object.keys(nextSet).length > 0) {
        updates.push({ id: song._id, set: nextSet, name: song.name, reasons });
      }
    }

    if (dryRun) {
      return res.json({
        message: 'Dry run complete',
        updates: updates.slice(0, 50),
        totalUpdates: updates.length,
        totalSongs: songs.length
      });
    }

    const bulk = updates.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(String(item.id)) },
        update: { $set: item.set }
      }
    }));

    if (bulk.length) {
      await Song.bulkWrite(bulk);
    }

    res.json({
      success: true,
      updated: bulk.length,
      totalSongs: songs.length,
      preview: updates.slice(0, 10)
    });
  } catch (error) {
    console.error('Populate categories error:', error);
    res.status(500).json({ message: 'Failed to populate song categories', error: error.message });
  }
};
