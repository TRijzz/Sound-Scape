import Album from '../models/Album.js';
import Song from '../models/Song.js';

export const createAlbum = async (req, res) => {
  try {
    const album = await Album.create(req.body);
    res.status(201).json(album);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create album', error: error.message });
  }
};

export const getAlbums = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-popularity',
      genre,
      year,
      search
    } = req.query;

    const query = {};
    
    // Add genre filter
    if (genre) {
      query.genres = { $in: [new RegExp(genre, 'i')] };
    }
    
    // Add year filter
    if (year) {
      query.release_date = { $regex: `^${year}` };
    }
    
    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    
    const albums = await Album.find(query)
      .populate('artists', 'name spotify_id images popularity')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Album.countDocuments(query);

    res.json({
      albums,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch albums', error: error.message });
  }
};

export const getAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id)
      .populate('artists', 'name spotify_id images popularity genres')
      .lean();
    
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }
    
    res.json(album);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch album', error: error.message });
  }
};

export const getAlbumBySpotifyId = async (req, res) => {
  try {
    const album = await Album.findOne({ spotify_id: req.params.spotifyId })
      .populate('artists', 'name spotify_id images popularity genres')
      .lean();
    
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }
    
    res.json(album);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch album', error: error.message });
  }
};

export const getAlbumTracks = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const album = await Album.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    const tracks = await Song.find({ album: req.params.id })
      .populate('artists', 'name spotify_id')
      .sort({ disc_number: 1, track_number: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Song.countDocuments({ album: req.params.id });

    res.json({
      album: {
        id: album._id,
        name: album.name,
        images: album.images
      },
      tracks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch album tracks', error: error.message });
  }
};

export const updateAlbum = async (req, res) => {
  try {
    const album = await Album.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('artists', 'name spotify_id images');
    
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }
    
    res.json(album);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update album', error: error.message });
  }
};

export const deleteAlbum = async (req, res) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);
    
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }
    
    // Also delete associated tracks
    await Song.deleteMany({ album: req.params.id });
    
    res.json({ success: true, message: 'Album and associated tracks deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete album', error: error.message });
  }
};

export const getPopularAlbums = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const albums = await Album.find({ popularity: { $gt: 0 } })
      .populate('artists', 'name spotify_id images')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch popular albums', error: error.message });
  }
};

export const getAlbumsByGenre = async (req, res) => {
  try {
    const { genre, limit = 20 } = req.query;
    
    if (!genre) {
      return res.status(400).json({ message: 'Genre parameter is required' });
    }
    
    const albums = await Album.find({ 
      genres: { $in: [new RegExp(genre, 'i')] }
    })
      .populate('artists', 'name spotify_id images')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch albums by genre', error: error.message });
  }
};

export const getAlbumsByYear = async (req, res) => {
  try {
    const { year, limit = 20 } = req.query;
    
    if (!year) {
      return res.status(400).json({ message: 'Year parameter is required' });
    }
    
    const albums = await Album.find({ 
      release_date: { $regex: `^${year}` }
    })
      .populate('artists', 'name spotify_id images')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch albums by year', error: error.message });
  }
};
