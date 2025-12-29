import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';

export const createArtist = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Artist name is required' });
    }

    const artistData = {
      name: req.body.name.trim(),
    };
    
    // Only add optional fields if they exist
    if (req.body.bio) artistData.bio = req.body.bio;
    if (req.body.image_url) artistData.image_url = req.body.image_url;
    if (req.body.images) artistData.images = req.body.images;
    if (req.body.genres) {
      artistData.genres = Array.isArray(req.body.genres) ? req.body.genres : [req.body.genres];
    }
    if (req.body.popularity !== undefined) artistData.popularity = req.body.popularity;
    // Only include spotify_id if it's provided and not empty/null - this prevents null from being set
    if (req.body.spotify_id && typeof req.body.spotify_id === 'string' && req.body.spotify_id.trim()) {
      artistData.spotify_id = req.body.spotify_id.trim();
    }

    const artist = await Artist.create(artistData);
    res.status(201).json(artist);
  } catch (error) {
    console.error('Error creating artist:', error);
    res.status(400).json({ 
      message: 'Failed to create artist', 
      error: error.message,
      details: error.errors || {}
    });
  }
};

export const getArtists = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-popularity',
      genre,
      search
    } = req.query;

    const query = {};
    
    // Add genre filter
    if (genre) {
      query.genres = { $in: [new RegExp(genre, 'i')] };
    }
    
    // Add search filter - use regex if text search index doesn't exist
    if (search) {
      try {
        query.$text = { $search: search };
      } catch {
        // Fallback to regex if text index doesn't exist
        query.name = { $regex: search, $options: 'i' };
      }
    }

    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    // Allow high limits for admin pages (up to 1000)
    const actualLimit = limitNum > 1000 ? 1000 : limitNum;
    
    const artists = await Artist.find(query)
      .sort(sort)
      .skip(skip)
      .limit(actualLimit)
      .lean();

    const total = await Artist.countDocuments(query);

    // Normalize images for all artists
    const normalizedArtists = artists.map(artist => ({
      ...artist,
      images: artist.images && Array.isArray(artist.images) && artist.images.length > 0 
        ? artist.images 
        : artist.image_url 
          ? [{ url: artist.image_url }] 
          : []
    }));

    res.json({
      artists: normalizedArtists,
      pagination: {
        page: parseInt(page),
        limit: actualLimit,
        total,
        pages: Math.ceil(total / actualLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artists', error: error.message });
  }
};

export const getArtist = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).lean();
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }
    
    // Normalize images
    const normalizedArtist = {
      ...artist,
      images: artist.images && Array.isArray(artist.images) && artist.images.length > 0 
        ? artist.images 
        : artist.image_url 
          ? [{ url: artist.image_url }] 
          : []
    };
    res.json(normalizedArtist);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artist', error: error.message });
  }
};

export const getArtistBySpotifyId = async (req, res) => {
  try {
    const artist = await Artist.findOne({ spotify_id: req.params.spotifyId }).lean();
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }
    res.json(artist);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artist', error: error.message });
  }
};

export const getArtistAlbums = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const artist = await Artist.findById(req.params.id);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const albums = await Album.find({ artists: req.params.id })
      .populate('artists', 'name spotify_id images')
      .sort({ release_date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Album.countDocuments({ artists: req.params.id });

    res.json({
      artist: {
        id: artist._id,
        name: artist.name,
        images: artist.images
      },
      albums,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artist albums', error: error.message });
  }
};

export const getArtistTopTracks = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const artist = await Artist.findById(req.params.id);
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const tracks = await Song.find({ artists: req.params.id })
      .populate('album', 'name images')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      artist: {
        id: artist._id,
        name: artist.name,
        images: artist.images
      },
      tracks
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artist top tracks', error: error.message });
  }
};

export const getPopularArtists = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const artists = await Artist.find({ popularity: { $gt: 0 } })
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Ensure images field is always included and properly formatted
    const normalizedArtists = artists.map(artist => ({
      ...artist,
      images: artist.images && Array.isArray(artist.images) && artist.images.length > 0 
        ? artist.images 
        : artist.image_url 
          ? [{ url: artist.image_url }] 
          : []
    }));
    
    res.json(normalizedArtists);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch popular artists', error: error.message });
  }
};

export const getArtistsByGenre = async (req, res) => {
  try {
    const { genre, limit = 20 } = req.query;
    
    if (!genre) {
      return res.status(400).json({ message: 'Genre parameter is required' });
    }
    
    const artists = await Artist.find({ 
      genres: { $in: [new RegExp(genre, 'i')] }
    })
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Normalize images
    const normalizedArtists = artists.map(artist => ({
      ...artist,
      images: artist.images && Array.isArray(artist.images) && artist.images.length > 0 
        ? artist.images 
        : artist.image_url 
          ? [{ url: artist.image_url }] 
          : []
    }));
    
    res.json(normalizedArtists);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artists by genre', error: error.message });
  }
};

export const updateArtist = async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).lean();
    
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }
    
    // Normalize images
    const normalizedArtist = {
      ...artist,
      images: artist.images && Array.isArray(artist.images) && artist.images.length > 0 
        ? artist.images 
        : artist.image_url 
          ? [{ url: artist.image_url }] 
          : []
    };
    
    res.json(normalizedArtist);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update artist', error: error.message });
  }
};

export const deleteArtist = async (req, res) => {
  try {
    const artist = await Artist.findByIdAndDelete(req.params.id);
    
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }
    
    // Also delete associated albums and tracks
    await Album.deleteMany({ artists: req.params.id });
    await Song.deleteMany({ artists: req.params.id });
    
    res.json({ success: true, message: 'Artist and associated data deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete artist', error: error.message });
  }
};

export const populateArtistGenres = async (req, res) => {
  try {
    const { dryRun = false, limit = 0 } = req.body || {};
    const query = { $or: [ { genres: { $exists: false } }, { genres: { $size: 0 } } ] };
    const lim = parseInt(limit) || undefined;
    const artists = await Artist.find(query).limit(lim).lean();

    const updates = [];

    for (const artist of artists) {
      const songs = await Song.find({ artists: artist._id }).select('genre album').lean();
      const counts = {};
      for (const s of songs) {
        const sg = String(s.genre || '').trim().toLowerCase();
        if (sg) counts[sg] = (counts[sg] || 0) + 1;
        if (!sg && s.album) {
          const alb = await Album.findById(s.album).select('genres').lean();
          (alb?.genres || []).forEach(g => {
            const k = String(g || '').trim().toLowerCase();
            if (k) counts[k] = (counts[k] || 0) + 1;
          });
        }
      }
      const genres = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([g]) => g)
        .slice(0, 3);

      if (genres.length) {
        if (!dryRun) {
          await Artist.findByIdAndUpdate(artist._id, { genres });
        }
        updates.push({ artistId: artist._id, name: artist.name, genres });
      }
    }

    res.json({ updated: updates.length, dryRun: !!dryRun, updates });
  } catch (error) {
    res.status(500).json({ message: 'Failed to populate artist genres', error: error.message });
  }
};
