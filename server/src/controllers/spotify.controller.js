import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';

dotenv.config();

// Initialize Spotify API with credentials but don't refresh token at startup
// Token will only be refreshed during scheduled updates
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback'
});

// Refresh access token function - only called by scheduled jobs, not on startup
export const refreshAccessToken = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('Spotify access token refreshed for scheduled update');
    return data.body['access_token'];
  } catch (error) {
    console.error('Error refreshing Spotify access token:', error);
    throw error;
  }
};

// Search for tracks - MongoDB only
export const searchTracks = async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Only search in MongoDB, no Spotify API calls
    const songs = await Song.find({ 
      $text: { $search: query }
    })
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images')
      .sort({ score: { $meta: 'textScore' }, popularity: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();
    
    // Format response to match Spotify API structure
    const response = {
      tracks: {
        items: songs,
        total: songs.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        href: req.originalUrl,
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ message: 'Failed to search tracks', error: error.message });
  }
};

// Get track details - MongoDB only
export const getTrack = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Track ID is required' });
    }
    
    // Only query MongoDB, no Spotify API calls
    const song = await Song.findOne({ spotify_id: id })
      .populate('artists', 'name spotify_id images genres')
      .populate('album', 'name images release_date artists')
      .lean();
    
    if (!song) {
      return res.status(404).json({ message: 'Track not found in database' });
    }
    
    res.json(song);
  } catch (error) {
    console.error('Error getting track:', error);
    res.status(500).json({ message: 'Failed to get track details', error: error.message });
  }
};

// Get artist details - MongoDB only
export const getArtist = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Artist ID is required' });
    }
    
    // Only query MongoDB, no Spotify API calls
    const artist = await Artist.findOne({ spotify_id: id }).lean();
    
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found in database' });
    }
    
    res.json(artist);
  } catch (error) {
    console.error('Error getting artist:', error);
    res.status(500).json({ message: 'Failed to get artist details', error: error.message });
  }
};

// Get artist's top tracks - MongoDB only
export const getArtistTopTracks = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Artist ID is required' });
    }
    
    // Find the artist by Spotify ID
    const artist = await Artist.findOne({ spotify_id: id });
    
    if (!artist) {
      return res.status(404).json({ message: 'Artist not found in database' });
    }
    
    // Get top tracks from MongoDB based on popularity
    const topTracks = await Song.find({ artists: artist._id })
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images release_date')
      .sort({ popularity: -1 })
      .limit(10)
      .lean();
    
    res.json({ tracks: topTracks });
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    res.status(500).json({ message: 'Failed to get artist top tracks', error: error.message });
  }
};

// Get album details - MongoDB only
export const getAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Album ID is required' });
    }
    
    // Only query MongoDB, no Spotify API calls
    const album = await Album.findOne({ spotify_id: id })
      .populate('artists', 'name spotify_id images')
      .lean();
    
    if (!album) {
      return res.status(404).json({ message: 'Album not found in database' });
    }
    
    res.json(album);
  } catch (error) {
    console.error('Error getting album:', error);
    res.status(500).json({ message: 'Failed to get album details', error: error.message });
  }
};

// Get album tracks - MongoDB only
export const getAlbumTracks = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Album ID is required' });
    }
    
    // Find the album by Spotify ID
    const album = await Album.findOne({ spotify_id: id });
    
    if (!album) {
      return res.status(404).json({ message: 'Album not found in database' });
    }
    
    // Get tracks from MongoDB
    const tracks = await Song.find({ album: album._id })
      .populate('artists', 'name spotify_id images')
      .sort({ track_number: 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      items: tracks,
      total: tracks.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      href: req.originalUrl
    });
  } catch (error) {
    console.error('Error getting album tracks:', error);
    res.status(500).json({ message: 'Failed to get album tracks', error: error.message });
  }
};

// Get recommendations - MongoDB only
export const getRecommendations = async (req, res) => {
  try {
    const { seed_artists, seed_tracks, seed_genres, limit = 20 } = req.query;
    
    if (!seed_artists && !seed_tracks && !seed_genres) {
      return res.status(400).json({ 
        message: 'At least one seed (artists, tracks, or genres) is required' 
      });
    }
    
    let query = {};
    let artistIds = [];
    let genreList = [];
    
    // Process seed artists
    if (seed_artists) {
      const spotifyArtistIds = seed_artists.split(',');
      const artists = await Artist.find({ spotify_id: { $in: spotifyArtistIds } });
      artistIds = artists.map(artist => artist._id);
      
      // Collect genres from these artists for better recommendations
      artists.forEach(artist => {
        if (artist.genres && artist.genres.length) {
          genreList = [...genreList, ...artist.genres];
        }
      });
    }
    
    // Process seed tracks
    if (seed_tracks) {
      const spotifyTrackIds = seed_tracks.split(',');
      const tracks = await Song.find({ spotify_id: { $in: spotifyTrackIds } })
        .populate('artists');
      
      // Add artists from these tracks
      tracks.forEach(track => {
        if (track.artists && track.artists.length) {
          artistIds = [...artistIds, ...track.artists.map(a => a._id)];
          
          // Add genres from these artists too
          track.artists.forEach(artist => {
            if (artist.genres && artist.genres.length) {
              genreList = [...genreList, ...artist.genres];
            }
          });
        }
      });
    }
    
    // Process seed genres
    if (seed_genres) {
      genreList = [...genreList, ...seed_genres.split(',')];
    }
    
    // Remove duplicates
    artistIds = [...new Set(artistIds)];
    genreList = [...new Set(genreList)];
    
    // Build query based on collected data
    if (artistIds.length > 0) {
      // Find songs by similar artists
      query.artists = { $in: artistIds };
    } else if (genreList.length > 0) {
      // If no direct artist matches, use genres
      const artistsWithGenres = await Artist.find({ 
        genres: { $in: genreList.map(g => new RegExp(g, 'i')) }
      }).select('_id');
      
      query.artists = { $in: artistsWithGenres.map(a => a._id) };
    } else {
      // Fallback to popular songs if no other criteria
      query.popularity = { $gt: 50 };
    }
    
    // Get recommendations from MongoDB
    const recommendations = await Song.find(query)
      .populate('artists', 'name spotify_id images genres')
      .populate('album', 'name images release_date')
      .sort({ popularity: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({ tracks: recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Failed to get recommendations', error: error.message });
  }
};

// Search function (comprehensive) - MongoDB only
export const search = async (req, res) => {
  try {
    const { query, type = 'track,artist,album', limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const types = type.split(',');
    const response = {};
    const limitPerType = Math.ceil(parseInt(limit) / types.length);
    
    // Only search in MongoDB, no Spotify API calls
    const promises = [];
    
    if (types.includes('track') || types.includes('tracks')) {
      promises.push(
        Song.find({ $text: { $search: query } })
          .populate('artists', 'name spotify_id images')
          .populate('album', 'name images')
          .sort({ score: { $meta: 'textScore' }, popularity: -1 })
          .skip(parseInt(offset))
          .limit(limitPerType)
          .lean()
          .then(songs => {
            response.tracks = {
              items: songs,
              total: songs.length,
              limit: limitPerType,
              offset: parseInt(offset),
              href: req.originalUrl
            };
          })
      );
    }
    
    if (types.includes('artist') || types.includes('artists')) {
      promises.push(
        Artist.find({ $text: { $search: query } })
          .sort({ score: { $meta: 'textScore' }, popularity: -1 })
          .skip(parseInt(offset))
          .limit(limitPerType)
          .lean()
          .then(artists => {
            response.artists = {
              items: artists,
              total: artists.length,
              limit: limitPerType,
              offset: parseInt(offset),
              href: req.originalUrl
            };
          })
      );
    }
    
    if (types.includes('album') || types.includes('albums')) {
      promises.push(
        Album.find({ $text: { $search: query } })
          .populate('artists', 'name spotify_id images')
          .sort({ score: { $meta: 'textScore' }, popularity: -1 })
          .skip(parseInt(offset))
          .limit(limitPerType)
          .lean()
          .then(albums => {
            response.albums = {
              items: albums,
              total: albums.length,
              limit: limitPerType,
              offset: parseInt(offset),
              href: req.originalUrl
            };
          })
      );
    }
    
    await Promise.all(promises);
    res.json(response);
  } catch (error) {
    console.error('Error searching MongoDB:', error);
    res.status(500).json({ message: 'Failed to search database', error: error.message });
  }
};

// Search for artists - MongoDB only
export const searchArtists = async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Only search in MongoDB, no Spotify API calls
    const artists = await Artist.find({ 
      $text: { $search: query }
    })
      .sort({ score: { $meta: 'textScore' }, popularity: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();
    
    // Format response to match Spotify API structure
    const response = {
      artists: {
        items: artists,
        total: artists.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        href: req.originalUrl,
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error searching artists:', error);
    res.status(500).json({ message: 'Failed to search artists', error: error.message });
  }
};

// Search for albums - MongoDB only
export const searchAlbums = async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Only search in MongoDB, no Spotify API calls
    const albums = await Album.find({ 
      $text: { $search: query }
    })
      .populate('artists', 'name spotify_id images')
      .sort({ score: { $meta: 'textScore' }, popularity: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();
    
    // Format response to match Spotify API structure
    const response = {
      albums: {
        items: albums,
        total: albums.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        href: req.originalUrl,
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error searching albums:', error);
    res.status(500).json({ message: 'Failed to search albums', error: error.message });
  }
};