import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';
import { ensureMoodsExist } from '../utils/moodRegistry.js';

const isAdminRequest = (req) => {
  return Boolean(req.isAdmin);
};

const visibleArtistQuery = {
  is_visible: { $ne: false },
  publish_status: { $ne: 'hidden' }
};

const toTrimmedString = (value) => {
  if (value === undefined || value === null) return undefined;
  const next = String(value).trim();
  return next || '';
};

const toStringArray = (value) => {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value : String(value).split(',');
  return items
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
};

const normalizeImages = (value) => {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => {
      if (typeof item === 'string') return { url: item.trim() };
      if (!item || !item.url) return null;
      return {
        url: String(item.url).trim(),
        height: item.height,
        width: item.width
      };
    })
    .filter((item) => item && item.url);
};

const normalizeLinkMap = (value, keys = []) => {
  if (!value || typeof value !== 'object') return undefined;
  return keys.reduce((acc, key) => {
    if (value[key] === undefined) return acc;
    acc[key] = toTrimmedString(value[key]);
    return acc;
  }, {});
};

const booleanFields = ['is_featured', 'is_visible', 'is_verified'];
const stringFields = [
  'name',
  'display_name',
  'bio',
  'image_url',
  'cover_image_url',
  'language',
  'country',
  'region',
  'hidden_reason',
  'publish_status',
  'spotify_id'
];
const numberFields = ['popularity', 'priority_score'];
const arrayFields = ['genres', 'tags', 'mood_tags'];

const buildArtistPayload = (body = {}) => {
  const payload = {};

  stringFields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = toTrimmedString(body[field]);
  });

  numberFields.forEach((field) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') return;
    const parsed = Number(body[field]);
    if (!Number.isNaN(parsed)) payload[field] = parsed;
  });

  booleanFields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = toBoolean(body[field]);
  });

  arrayFields.forEach((field) => {
    const value = toStringArray(body[field]);
    if (value !== undefined) payload[field] = value;
  });

  const images = normalizeImages(body.images);
  if (images !== undefined) payload.images = images;

  const socialLinks = normalizeLinkMap(body.social_links, ['instagram', 'x', 'tiktok', 'youtube', 'website']);
  if (socialLinks && Object.keys(socialLinks).length > 0) payload.social_links = socialLinks;

  const externalIds = normalizeLinkMap(body.external_ids, ['spotify', 'apple_music', 'musicbrainz']);
  if (externalIds && Object.keys(externalIds).length > 0) payload.external_ids = externalIds;

  const externalUrls = normalizeLinkMap(body.external_urls, ['spotify']);
  if (externalUrls && Object.keys(externalUrls).length > 0) payload.external_urls = externalUrls;

  if (body.followers && typeof body.followers === 'object') {
    payload.followers = {
      href: toTrimmedString(body.followers.href),
      total: Number(body.followers.total) || 0
    };
  }

  if (payload.spotify_id === '') delete payload.spotify_id;
  if (payload.image_url === '') delete payload.image_url;
  if (payload.cover_image_url === '') delete payload.cover_image_url;

  return payload;
};

const normalizeArtist = (artist) => ({
  ...artist,
  images: artist.images && Array.isArray(artist.images) && artist.images.length > 0
    ? artist.images
    : artist.image_url
      ? [{ url: artist.image_url }]
      : []
});

const applyUploadedArtistImages = (payload, files = {}) => {
  const profileFile = files?.profileImage?.[0];
  const coverFile = files?.coverImage?.[0];

  if (profileFile) {
    payload.image_url = `/images/${profileFile.filename}`;
    payload.images = [{
      url: payload.image_url,
      height: 640,
      width: 640
    }];
  }

  if (coverFile) {
    payload.cover_image_url = `/images/${coverFile.filename}`;
  }
};

export const createArtist = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Artist name is required' });
    }

    const artistData = buildArtistPayload(req.body);
    applyUploadedArtistImages(artistData, req.files);
    artistData.name = req.body.name.trim();
    if (Array.isArray(artistData.mood_tags) && artistData.mood_tags.length > 0) {
      await ensureMoodsExist(artistData.mood_tags);
    }
    if (req.user?.id) {
      artistData.created_by = req.user.id;
      artistData.last_edited_by = req.user.id;
    }
    artistData.last_edited_at = new Date();

    const artist = await Artist.create(artistData);
    res.status(201).json(normalizeArtist(artist.toObject()));
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

    const query = isAdminRequest(req) ? {} : { ...visibleArtistQuery };
    
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
    const normalizedArtists = artists.map(normalizeArtist);

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
    const artist = await Artist.findOne({
      _id: req.params.id,
      ...(isAdminRequest(req) ? {} : visibleArtistQuery)
    }).lean();
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }
    
    // Normalize images
    res.json(normalizeArtist(artist));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artist', error: error.message });
  }
};

export const getArtistBySpotifyId = async (req, res) => {
  try {
    const artist = await Artist.findOne({
      spotify_id: req.params.spotifyId,
      ...(isAdminRequest(req) ? {} : visibleArtistQuery)
    }).lean();
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

    const artist = await Artist.findOne({
      _id: req.params.id,
      ...(isAdminRequest(req) ? {} : visibleArtistQuery)
    });
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

    const artist = await Artist.findOne({
      _id: req.params.id,
      ...(isAdminRequest(req) ? {} : visibleArtistQuery)
    });
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const tracks = await Song.find({ artists: req.params.id })
      .populate('album', 'name images')
      .populate('artists', 'name spotify_id images')
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
    
    const artists = await Artist.find({
      popularity: { $gt: 0 },
      ...(isAdminRequest(req) ? {} : visibleArtistQuery)
    })
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Ensure images field is always included and properly formatted
    const normalizedArtists = artists.map(normalizeArtist);
    
    res.json(normalizedArtists);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch popular artists', error: error.message });
  }
};

export const getGenres = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Aggregate genres from artists
    const artistGenres = await Artist.aggregate([
      { $unwind: "$genres" },
      { $group: { _id: "$genres", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    // Transform to simple array
    const genres = artistGenres.map(g => g._id);
    
    // If not enough, maybe add some defaults or from songs?
    // For now just return what we have
    res.json({ genres });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch genres', error: error.message });
  }
};

export const getArtistsByGenre = async (req, res) => {
  try {
    const { genre, limit = 20 } = req.query;
    
    if (!genre) {
      return res.status(400).json({ message: 'Genre parameter is required' });
    }
    
    const artists = await Artist.find({ 
      genres: { $in: [new RegExp(genre, 'i')] },
      ...(isAdminRequest(req) ? {} : visibleArtistQuery)
    })
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Normalize images
    const normalizedArtists = artists.map(normalizeArtist);
    
    res.json(normalizedArtists);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artists by genre', error: error.message });
  }
};

export const updateArtist = async (req, res) => {
  try {
    const updates = buildArtistPayload(req.body);
    applyUploadedArtistImages(updates, req.files);
    if (Array.isArray(updates.mood_tags) && updates.mood_tags.length > 0) {
      await ensureMoodsExist(updates.mood_tags);
    }
    if (req.user?.id) updates.last_edited_by = req.user.id;
    updates.last_edited_at = new Date();

    const unset = {};
    [
      'display_name',
      'bio',
      'image_url',
      'cover_image_url',
      'language',
      'country',
      'region',
      'hidden_reason',
      'spotify_id'
    ].forEach((field) => {
      if (updates[field] === '') {
        delete updates[field];
        unset[field] = 1;
      }
    });

    const artist = await Artist.findByIdAndUpdate(
      req.params.id,
      {
        ...(Object.keys(updates).length ? { $set: updates } : {}),
        ...(Object.keys(unset).length ? { $unset: unset } : {})
      },
      { new: true, runValidators: true }
    ).lean();
    
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }
    
    // Normalize images
    res.json(normalizeArtist(artist));
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
