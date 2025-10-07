import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';

export const createSong = async (req, res) => {
  try {
    const song = await Song.create(req.body);
    res.status(201).json(song);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create song', error: error.message });
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
      album
    } = req.query;

    const query = {};
    
    // Add genre filter (through artists)
    if (genre) {
      const artistsWithGenre = await Artist.find({ 
        genres: { $in: [new RegExp(genre, 'i')] }
      }).select('_id');
      query.artists = { $in: artistsWithGenre.map(a => a._id) };
    }
    
    // Add year filter (through album)
    if (year) {
      const albumsInYear = await Album.find({ 
        release_date: { $regex: `^${year}` }
      }).select('_id');
      query.album = { $in: albumsInYear.map(a => a._id) };
    }
    
    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }
    
    // Add artist filter
    if (artist) {
      query.artists = artist;
    }
    
    // Add album filter
    if (album) {
      query.album = album;
    }

    const skip = (page - 1) * limit;
    
    const songs = await Song.find(query)
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images release_date')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Song.countDocuments(query);

    res.json({
      songs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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
    
    const songs = await Song.find({ 
      $text: { $search: q }
    })
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .sort({ score: { $meta: 'textScore' }, popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search songs', error: error.message });
  }
};

export const updateSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    )
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .lean();
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
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
