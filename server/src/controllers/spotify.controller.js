import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Spotify API with credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback'
});

// Refresh access token periodically
const refreshAccessToken = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('Spotify access token refreshed');
    
    // Token expires in 1 hour, refresh a bit earlier
    setTimeout(refreshAccessToken, (data.body['expires_in'] - 60) * 1000);
  } catch (error) {
    console.error('Error refreshing Spotify access token:', error);
    // Try again in 30 seconds
    setTimeout(refreshAccessToken, 30000);
  }
};

// Initial token refresh
refreshAccessToken();

// Search for tracks
export const searchTracks = async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const data = await spotifyApi.searchTracks(query, { limit, offset });
    res.json(data.body);
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ message: 'Failed to search tracks', error: error.message });
  }
};

// Get track details
export const getTrack = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Track ID is required' });
    }
    
    const data = await spotifyApi.getTrack(id);
    res.json(data.body);
  } catch (error) {
    console.error('Error getting track:', error);
    res.status(500).json({ message: 'Failed to get track details', error: error.message });
  }
};

// Get artist details
export const getArtist = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Artist ID is required' });
    }
    
    const data = await spotifyApi.getArtist(id);
    res.json(data.body);
  } catch (error) {
    console.error('Error getting artist:', error);
    res.status(500).json({ message: 'Failed to get artist details', error: error.message });
  }
};

// Get artist's top tracks
export const getArtistTopTracks = async (req, res) => {
  try {
    const { id } = req.params;
    const { country = 'US' } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Artist ID is required' });
    }
    
    const data = await spotifyApi.getArtistTopTracks(id, country);
    res.json(data.body);
  } catch (error) {
    console.error('Error getting artist top tracks:', error);
    res.status(500).json({ message: 'Failed to get artist top tracks', error: error.message });
  }
};

// Get album details
export const getAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Album ID is required' });
    }
    
    const data = await spotifyApi.getAlbum(id);
    res.json(data.body);
  } catch (error) {
    console.error('Error getting album:', error);
    res.status(500).json({ message: 'Failed to get album details', error: error.message });
  }
};

// Get album tracks
export const getAlbumTracks = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Album ID is required' });
    }
    
    const data = await spotifyApi.getAlbumTracks(id, { limit, offset });
    res.json(data.body);
  } catch (error) {
    console.error('Error getting album tracks:', error);
    res.status(500).json({ message: 'Failed to get album tracks', error: error.message });
  }
};

// Get recommendations
export const getRecommendations = async (req, res) => {
  try {
    const { seed_artists, seed_tracks, seed_genres, limit = 20 } = req.query;
    
    if (!seed_artists && !seed_tracks && !seed_genres) {
      return res.status(400).json({ 
        message: 'At least one seed (artists, tracks, or genres) is required' 
      });
    }
    
    const options = { limit };
    if (seed_artists) options.seed_artists = seed_artists.split(',');
    if (seed_tracks) options.seed_tracks = seed_tracks.split(',');
    if (seed_genres) options.seed_genres = seed_genres.split(',');
    
    const data = await spotifyApi.getRecommendations(options);
    res.json(data.body);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Failed to get recommendations', error: error.message });
  }
};

// Search function (comprehensive)
export const search = async (req, res) => {
  try {
    const { query, type = 'track,artist,album', limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const data = await spotifyApi.search(query, type.split(','), { limit, offset });
    res.json(data.body);
  } catch (error) {
    console.error('Error searching Spotify:', error);
    res.status(500).json({ message: 'Failed to search Spotify', error: error.message });
  }
};

// Search for artists
export const searchArtists = async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const data = await spotifyApi.searchArtists(query, { limit, offset });
    res.json(data.body);
  } catch (error) {
    console.error('Error searching artists:', error);
    res.status(500).json({ message: 'Failed to search artists', error: error.message });
  }
};

// Search for albums
export const searchAlbums = async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const data = await spotifyApi.searchAlbums(query, { limit, offset });
    res.json(data.body);
  } catch (error) {
    console.error('Error searching albums:', error);
    res.status(500).json({ message: 'Failed to search albums', error: error.message });
  }
};