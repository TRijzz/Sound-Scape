import Song from '../models/Song.js';
import ListeningHistory from '../models/ListeningHistory.js'; // Added ListeningHistory model
import { broadcastNotification } from './notification.controller.js'; // Added notification broadcaster
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Lyric from '../models/Lyric.js';
import { parseLRC } from '../utils/lrcParser.js';
import mongoose from 'mongoose';
import fs from 'fs';
import { classifySongTaxonomy, getSongTaxonomyLookups } from '../utils/songTaxonomy.js';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export const createSong = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Song name is required' });
    }

    const songData = {
      name: req.body.name.trim(),
    };
    
    // Handle file uploads
    if (req.files) {
      if (req.files.audio) {
        songData.audio_url = `/songs/${req.files.audio[0].filename}`;
        songData.file_path = req.files.audio[0].path; // Actual server path for storage location identification
      }
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

export const getSongs = async (req, res) => {
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
      tags
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
      query.mood = { $regex: mood, $options: 'i' };
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

    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    // Allow high limits for admin pages (up to 1000)
    const actualLimit = limitNum > 1000 ? 1000 : limitNum;
    
    const songs = await Song.find(query)
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images release_date')
      .sort(sort)
      .skip(skip)
      .limit(actualLimit)
      .lean();

    const total = await Song.countDocuments(query);

    res.json({
      songs,
      pagination: {
        page: parseInt(page),
        limit: actualLimit,
        total,
        pages: Math.ceil(total / actualLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch songs', error: error.message });
  }
};

export const getSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
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

    const song = await Song.findById(id)
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

export const getSongBySpotifyId = async (req, res) => {
  try {
    const song = await Song.findOne({ spotify_id: req.params.spotifyId })
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
    
    const songs = await Song.find({ popularity: { $gt: 0 } })
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
    const songs = await Song.find({ 
      $or: [
        { genre: genreRegex },
        { artists: { $in: artistsWithGenre.map(a => a._id) } },
        { album: { $in: albumsWithGenre.map(a => a._id) } }
      ]
    })
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
    
    const songs = await Song.find({ 
      album: { $in: albumsInYear.map(a => a._id) }
    })
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
      songs = await Song.find({ 
        $text: { $search: q }
      })
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images')
        .sort({ score: { $meta: 'textScore' }, popularity: -1 })
        .limit(parseInt(limit))
        .lean();
    } catch (textError) {
      // Fallback to regex search if text index doesn't exist or fails
      songs = await Song.find({ 
        $or: [
          { name: { $regex: regexQuery, $options: 'i' } },
          { title: { $regex: regexQuery, $options: 'i' } }
        ]
      })
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images')
        .sort({ popularity: -1 })
        .limit(parseInt(limit))
        .lean();
    }
    
    // If no results with text search, try regex as fallback
    if (!songs || songs.length === 0) {
      songs = await Song.find({ 
        $or: [
          { name: { $regex: regexQuery, $options: 'i' } },
          { title: { $regex: regexQuery, $options: 'i' } }
        ]
      })
        .populate('artists', 'name spotify_id images')
        .populate('album', 'name images')
        .sort({ popularity: -1 })
        .limit(parseInt(limit))
        .lean();
    }
    
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search songs', error: error.message });
  }
};

export const updateSong = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Remove internal fields if they leaked from body
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Handle file uploads
    if (req.files) {
      if (req.files.audio) {
        updateData.audio_url = `/songs/${req.files.audio[0].filename}`;
        updateData.file_path = req.files.audio[0].path;
      }
      if (req.files.cover) {
        updateData.cover_art_url = `/images/${req.files.cover[0].filename}`;
      }
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
        updateData[field] = normalized === '' ? null : normalized;
      }
    });

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
        updateData.genre = null;
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

    const song = await Song.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    )
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .lean();
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

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

    // Also delete associated lyrics
    await Lyric.findOneAndDelete({ song: req.params.id });
    
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


