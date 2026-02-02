import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Lyric from '../models/Lyric.js';
import { parseLRC } from '../utils/lrcParser.js';
import mongoose from 'mongoose';
import fs from 'fs';

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
    if (req.body.category) songData.category = req.body.category.trim();
    if (req.body.genre) songData.genre = req.body.genre.trim();
    if (req.body.mood) songData.mood = req.body.mood.trim();
    if (req.body.language) songData.language = req.body.language.trim();
    
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
    
    const artistsWithGenre = await Artist.find({ 
      genres: { $in: [new RegExp(genre, 'i')] }
    }).select('_id');
    
    const songs = await Song.find({ 
      artists: { $in: artistsWithGenre.map(a => a._id) }
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

    // Handle file uploads
    if (req.files) {
      if (req.files.audio) {
        updateData.audio_url = `/songs/${req.files.audio[0].filename}`;
      }
      if (req.files.cover) {
        updateData.cover_art_url = `/images/${req.files.cover[0].filename}`;
      }
    }

    // Handle numeric/boolean fields from FormData
    if (updateData.duration_ms) updateData.duration_ms = Number(updateData.duration_ms);
    if (updateData.track_number) updateData.track_number = Number(updateData.track_number);
    if (updateData.disc_number) updateData.disc_number = Number(updateData.disc_number);
    if (updateData.popularity) updateData.popularity = Number(updateData.popularity);
    if (updateData.explicit !== undefined) {
      updateData.explicit = updateData.explicit === 'true' || updateData.explicit === true;
    }

    // Handle Artists (JSON string or array)
    if (updateData.artists) {
      if (typeof updateData.artists === 'string') {
        if (updateData.artists.startsWith('[')) {
          try { updateData.artists = JSON.parse(updateData.artists); } catch {}
        } else {
           // If it's just one ID string, wrap it. If comma separated, split it.
           // Usually IDs don't have commas.
           if (updateData.artists.includes(',')) {
             updateData.artists = updateData.artists.split(',').map(s => s.trim()).filter(Boolean);
           } else {
             updateData.artists = [updateData.artists];
           }
        }
      }
    }

    // Handle Tags
    // Check if tags[] exists in body if tags is missing or empty
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
       // Ensure it's array of strings
       if (Array.isArray(updateData.tags)) {
         updateData.tags = updateData.tags.map(t => String(t).trim()).filter(Boolean);
       } else {
         updateData.tags = [String(updateData.tags).trim()];
       }
    }

    const song = await Song.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
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
        
        // Update raw text on Song model
        const rawText = fs.readFileSync(lrcPath, 'utf8');
        await Song.findByIdAndUpdate(song._id, { lyrics: rawText });
      } catch (err) {
        console.error('Error processing lyrics file update:', err);
      }
    } else if (req.body.lyrics) {
         // Update text lyrics
         await Lyric.findOneAndUpdate(
             { song: song._id },
             { lyrics: req.body.lyrics, synced: false },
             { upsert: true }
         );
    }
    
    res.json(song);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update song', error: error.message });
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
    const { dryRun = false, limit = 1000 } = req.body || {};

    const songs = await Song.find({}).select('_id name artists album genre mood language category tags audio_features explicit popularity').limit(parseInt(limit)).lean();
    const updates = [];

    for (const s of songs) {
      const set = {};

      // Genre: prefer existing; else infer from first artist or album
      if (!s.genre) {
        let inferredGenre = '';
        if (s.artists && s.artists.length) {
          const artist = await Artist.findById(s.artists[0]).select('genres').lean();
          if (artist && Array.isArray(artist.genres) && artist.genres.length) {
            inferredGenre = String(artist.genres[0] || '').toLowerCase();
          }
        }
        if (!inferredGenre && s.album) {
          const alb = await Album.findById(s.album).select('genres').lean();
          if (alb && Array.isArray(alb.genres) && alb.genres.length) {
            inferredGenre = String(alb.genres[0] || '').toLowerCase();
          }
        }
        if (inferredGenre) set.genre = inferredGenre;
      }

      // Mood: derive from audio features when available
      if (!s.mood && s.audio_features) {
        const { valence = 0, energy = 0, acousticness = 0 } = s.audio_features || {};
        let mood = '';
        if (energy >= 0.75) mood = 'energetic';
        else if (valence >= 0.65 && energy >= 0.4) mood = 'happy';
        else if (valence <= 0.35 && energy <= 0.5) mood = 'sad';
        else if (acousticness >= 0.6 || energy <= 0.45) mood = 'chill';
        if (mood) set.mood = mood;
      }

      // Category: derive from genre or mood
      if (!s.category) {
        const g = (set.genre || s.genre || '').toLowerCase();
        const m = (set.mood || s.mood || '').toLowerCase();
        let category = '';
        if (g.includes('pop')) category = 'Pop Songs';
        else if (g.includes('rock')) category = 'Top Rock';
        else if (m.includes('chill')) category = 'Chill Vibes';
        else if (g.includes('hip') || g.includes('rap')) category = 'Hip-Hop Essentials';
        if (category) set.category = category;
      }

      // Language: leave if existing; otherwise skip (cannot infer reliably)
      // Tags: add helpful tags based on attributes
      const tagSet = new Set([...(s.tags || [])]);
      if (s.explicit) tagSet.add('explicit');
      const energy = s.audio_features?.energy ?? null;
      if (typeof energy === 'number') {
        if (energy >= 0.75) tagSet.add('high-energy');
        else if (energy <= 0.35) tagSet.add('low-energy');
      }
      if (s.album) {
        const alb = await Album.findById(s.album).select('release_date').lean();
        const year = alb?.release_date ? String(alb.release_date).slice(0, 4) : '';
        if (year) {
          const decade = year.slice(0, 3) + '0s';
          tagSet.add(decade);
        }
      }
      if (tagSet.size && (!s.tags || tagSet.size !== s.tags.length)) set.tags = Array.from(tagSet);

      if (Object.keys(set).length) {
        updates.push({ id: s._id, set });
      }
    }

    if (dryRun) {
      return res.json({ message: 'Dry run complete', updates: updates.slice(0, 50), totalUpdates: updates.length });
    }

    const bulk = updates.map(u => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(String(u.id)) },
        update: { $set: u.set }
      }
    }));
    if (bulk.length) await Song.bulkWrite(bulk);

    res.json({ success: true, updated: bulk.length });
  } catch (error) {
    console.error('Populate categories error:', error);
    res.status(500).json({ message: 'Failed to populate song categories', error: error.message });
  }
};
