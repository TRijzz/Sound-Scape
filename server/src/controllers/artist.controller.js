import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';

export const createArtist = async (req, res) => {
  try {
    const artist = await Artist.create(req.body);
    res.status(201).json(artist);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create artist', error: error.message });
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
    
    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    
    const artists = await Artist.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Artist.countDocuments(query);

    res.json({
      artists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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
    res.json(artist);
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
    
    res.json(artists);
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
    
    res.json(artists);
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
    
    res.json(artist);
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