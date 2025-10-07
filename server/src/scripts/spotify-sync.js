import SpotifyWebApi from 'spotify-web-api-node';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';
import { connectDB } from '../config/db.js';

dotenv.config();

class SpotifySyncService {
  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
    this.syncedArtists = new Map();
    this.syncedAlbums = new Map();
  }

  async initialize() {
    try {
      await connectDB();
      await this.refreshAccessToken();
      console.log('Spotify Sync Service initialized');
    } catch (error) {
      console.error('Failed to initialize Spotify Sync Service:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body['access_token']);
      console.log('Spotify access token refreshed');
    } catch (error) {
      console.error('Error refreshing Spotify access token:', error);
      throw error;
    }
  }

  // Search and sync artists by query
  async syncArtistsByQuery(query, limit = 50) {
    try {
      console.log(`Searching for artists: "${query}"`);
      const searchResult = await this.spotifyApi.searchArtists(query, { limit });
      const artists = searchResult.body.artists.items;

      const syncedArtists = [];
      for (const spotifyArtist of artists) {
        const artist = await this.syncArtist(spotifyArtist);
        if (artist) syncedArtists.push(artist);
      }

      console.log(`Synced ${syncedArtists.length} artists`);
      return syncedArtists;
    } catch (error) {
      console.error('Error syncing artists by query:', error);
      throw error;
    }
  }

  // Sync a single artist
  async syncArtist(spotifyArtist) {
    try {
      if (!spotifyArtist.id) return null;

      // Check if artist already exists
      let artist = await Artist.findOne({ spotify_id: spotifyArtist.id });
      
      if (artist) {
        console.log(`Artist already exists: ${artist.name}`);
        this.syncedArtists.set(spotifyArtist.id, artist._id);
        return artist;
      }

      // Create new artist
      const artistData = {
        spotify_id: spotifyArtist.id,
        name: spotifyArtist.name || 'Unknown Artist',
        images: spotifyArtist.images || [],
        external_urls: spotifyArtist.external_urls || {},
        genres: spotifyArtist.genres || [],
        popularity: spotifyArtist.popularity || 0,
        followers: spotifyArtist.followers || { total: 0 },
        last_synced: new Date(),
        sync_source: 'spotify'
      };

      artist = await Artist.create(artistData);
      this.syncedArtists.set(spotifyArtist.id, artist._id);
      console.log(`Created artist: ${artist.name}`);
      
      return artist;
    } catch (error) {
      console.error(`Error syncing artist ${spotifyArtist.name}:`, error);
      return null;
    }
  }

  // Sync albums for an artist
  async syncArtistAlbums(artistId, limit = 50) {
    try {
      console.log(`Fetching albums for artist: ${artistId}`);
      const albumsResult = await this.spotifyApi.getArtistAlbums(artistId, { 
        limit,
        include_groups: 'album,single,compilation'
      });
      
      const albums = albumsResult.body.items;
      const syncedAlbums = [];

      for (const spotifyAlbum of albums) {
        const album = await this.syncAlbum(spotifyAlbum);
        if (album) syncedAlbums.push(album);
      }

      console.log(`Synced ${syncedAlbums.length} albums for artist`);
      return syncedAlbums;
    } catch (error) {
      console.error('Error syncing artist albums:', error);
      throw error;
    }
  }

  // Sync a single album
  async syncAlbum(spotifyAlbum) {
    try {
      if (!spotifyAlbum.id) return null;

      // Check if album already exists
      let album = await Album.findOne({ spotify_id: spotifyAlbum.id });
      
      if (album) {
        console.log(`Album already exists: ${album.name}`);
        this.syncedAlbums.set(spotifyAlbum.id, album._id);
        return album;
      }

      // Get artist IDs
      const artistIds = [];
      for (const spotifyArtist of spotifyAlbum.artists || []) {
        if (this.syncedArtists.has(spotifyArtist.id)) {
          artistIds.push(this.syncedArtists.get(spotifyArtist.id));
        } else {
          // Sync the artist first
          const artist = await this.syncArtist(spotifyArtist);
          if (artist) {
            artistIds.push(artist._id);
          }
        }
      }

      // Create new album
      const albumData = {
        spotify_id: spotifyAlbum.id,
        name: spotifyAlbum.name,
        album_type: spotifyAlbum.album_type,
        total_tracks: spotifyAlbum.total_tracks,
        release_date: spotifyAlbum.release_date,
        release_date_precision: spotifyAlbum.release_date_precision,
        artists: artistIds,
        images: spotifyAlbum.images || [],
        external_urls: spotifyAlbum.external_urls || {},
        popularity: spotifyAlbum.popularity || 0,
        last_synced: new Date(),
        sync_source: 'spotify'
      };

      album = await Album.create(albumData);
      this.syncedAlbums.set(spotifyAlbum.id, album._id);
      console.log(`Created album: ${album.name}`);
      
      return album;
    } catch (error) {
      console.error(`Error syncing album ${spotifyAlbum.name}:`, error);
      return null;
    }
  }

  // Sync tracks for an album
  async syncAlbumTracks(albumId, limit = 50) {
    try {
      console.log(`Fetching tracks for album: ${albumId}`);
      const tracksResult = await this.spotifyApi.getAlbumTracks(albumId, { limit });
      
      const tracks = tracksResult.body.items;
      const syncedTracks = [];

      for (const spotifyTrack of tracks) {
        const track = await this.syncTrack(spotifyTrack, albumId);
        if (track) syncedTracks.push(track);
      }

      console.log(`Synced ${syncedTracks.length} tracks for album`);
      return syncedTracks;
    } catch (error) {
      console.error('Error syncing album tracks:', error);
      throw error;
    }
  }

  // Sync a single track
  async syncTrack(spotifyTrack, albumSpotifyId = null) {
    try {
      if (!spotifyTrack.id) return null;

      // Check if track already exists
      let track = await Song.findOne({ spotify_id: spotifyTrack.id });
      
      if (track) {
        console.log(`Track already exists: ${track.name}`);
        return track;
      }

      // Get artist IDs
      const artistIds = [];
      for (const spotifyArtist of spotifyTrack.artists || []) {
        if (this.syncedArtists.has(spotifyArtist.id)) {
          artistIds.push(this.syncedArtists.get(spotifyArtist.id));
        } else {
          // Sync the artist first
          const artist = await this.syncArtist(spotifyArtist);
          if (artist) {
            artistIds.push(artist._id);
          }
        }
      }

      // Get album ID
      let albumId = null;
      if (albumSpotifyId && this.syncedAlbums.has(albumSpotifyId)) {
        albumId = this.syncedAlbums.get(albumSpotifyId);
      }

      // Create new track
      const trackData = {
        spotify_id: spotifyTrack.id,
        name: spotifyTrack.name || 'Unknown Track',
        title: spotifyTrack.name || 'Unknown Track', // Legacy field
        artists: artistIds,
        artist: artistIds[0], // Legacy field for backward compatibility
        album: albumId,
        duration_ms: spotifyTrack.duration_ms || 0,
        duration: Math.floor((spotifyTrack.duration_ms || 0) / 1000), // Legacy field
        track_number: spotifyTrack.track_number,
        disc_number: spotifyTrack.disc_number,
        explicit: spotifyTrack.explicit,
        external_urls: spotifyTrack.external_urls || {},
        preview_url: spotifyTrack.preview_url,
        last_synced: new Date(),
        sync_source: 'spotify'
      };

      track = await Song.create(trackData);
      console.log(`Created track: ${track.name}`);
      
      return track;
    } catch (error) {
      console.error(`Error syncing track ${spotifyTrack.name}:`, error);
      return null;
    }
  }

  // Sync audio features for tracks
  async syncTrackAudioFeatures(trackIds) {
    try {
      console.log(`Fetching audio features for ${trackIds.length} tracks`);
      const featuresResult = await this.spotifyApi.getAudioFeaturesForTracks(trackIds);
      
      const features = featuresResult.body.audio_features;
      const updatedTracks = [];

      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const trackId = trackIds[i];
        
        if (feature) {
          await Song.findByIdAndUpdate(trackId, {
            audio_features: {
              danceability: feature.danceability,
              energy: feature.energy,
              key: feature.key,
              loudness: feature.loudness,
              mode: feature.mode,
              speechiness: feature.speechiness,
              acousticness: feature.acousticness,
              instrumentalness: feature.instrumentalness,
              liveness: feature.liveness,
              valence: feature.valence,
              tempo: feature.tempo,
              time_signature: feature.time_signature
            }
          });
          updatedTracks.push(trackId);
        }
      }

      console.log(`Updated audio features for ${updatedTracks.length} tracks`);
      return updatedTracks;
    } catch (error) {
      console.error('Error syncing audio features:', error);
      throw error;
    }
  }

  // Complete sync process for a search query
  async completeSync(query, options = {}) {
    const {
      artistLimit = 20,
      albumLimit = 50,
      trackLimit = 50,
      includeAudioFeatures = true
    } = options;

    try {
      console.log(`Starting complete sync for query: "${query}"`);
      
      // 1. Search and sync artists
      const artists = await this.syncArtistsByQuery(query, artistLimit);
      
      // 2. For each artist, sync their albums
      for (const artist of artists) {
        const albums = await this.syncArtistAlbums(artist.spotify_id, albumLimit);
        
        // 3. For each album, sync its tracks
        for (const album of albums) {
          await this.syncAlbumTracks(album.spotify_id, trackLimit);
        }
      }

      // 4. Optionally sync audio features
      if (includeAudioFeatures) {
        const tracks = await Song.find({ 
          spotify_id: { $exists: true },
          'audio_features.tempo': { $exists: false }
        }).limit(100);
        
        if (tracks.length > 0) {
          const trackIds = tracks.map(track => track.spotify_id);
          await this.syncTrackAudioFeatures(trackIds);
        }
      }

      console.log('Complete sync finished successfully');
      return {
        artists: artists.length,
        albums: await Album.countDocuments({ sync_source: 'spotify' }),
        tracks: await Song.countDocuments({ sync_source: 'spotify' })
      };
    } catch (error) {
      console.error('Error in complete sync:', error);
      throw error;
    }
  }

  // Refresh existing data
  async refreshData() {
    try {
      console.log('Starting data refresh...');
      
      // Get all synced data
      const artists = await Artist.find({ sync_source: 'spotify' });
      const albums = await Album.find({ sync_source: 'spotify' });
      const tracks = await Song.find({ sync_source: 'spotify' });

      console.log(`Found ${artists.length} artists, ${albums.length} albums, ${tracks.length} tracks to refresh`);

      // Refresh artists
      for (const artist of artists) {
        try {
          const spotifyArtist = await this.spotifyApi.getArtist(artist.spotify_id);
          await Artist.findByIdAndUpdate(artist._id, {
            popularity: spotifyArtist.body.popularity,
            followers: spotifyArtist.body.followers,
            last_synced: new Date()
          });
        } catch (error) {
          console.error(`Error refreshing artist ${artist.name}:`, error);
        }
      }

      // Refresh albums
      for (const album of albums) {
        try {
          const spotifyAlbum = await this.spotifyApi.getAlbum(album.spotify_id);
          await Album.findByIdAndUpdate(album._id, {
            popularity: spotifyAlbum.body.popularity,
            last_synced: new Date()
          });
        } catch (error) {
          console.error(`Error refreshing album ${album.name}:`, error);
        }
      }

      // Refresh tracks
      for (const track of tracks) {
        try {
          const spotifyTrack = await this.spotifyApi.getTrack(track.spotify_id);
          await Song.findByIdAndUpdate(track._id, {
            popularity: spotifyTrack.body.popularity,
            last_synced: new Date()
          });
        } catch (error) {
          console.error(`Error refreshing track ${track.name}:`, error);
        }
      }

      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const query = args[1];

  const syncService = new SpotifySyncService();
  await syncService.initialize();

  try {
    switch (command) {
      case 'sync':
        if (!query) {
          console.error('Please provide a search query');
          process.exit(1);
        }
        const result = await syncService.completeSync(query);
        console.log('Sync completed:', result);
        break;
      
      case 'refresh':
        await syncService.refreshData();
        break;
      
      default:
        console.log('Usage:');
        console.log('  node spotify-sync.js sync "search query"  - Sync data for a search query');
        console.log('  node spotify-sync.js refresh             - Refresh existing data');
        break;
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Export for use in other modules
export default SpotifySyncService;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('spotify-sync.js')) {
  main();
}
