import SpotifySyncService from '../scripts/spotify-sync.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Genre from '../models/Genre.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize sync service
const syncService = new SpotifySyncService();

export const syncData = async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Initialize the service if not already done
    if (!syncService.spotifyApi.getAccessToken()) {
      await syncService.initialize();
    }

    const result = await syncService.completeSync(query, options);
    
    res.json({
      message: 'Data sync completed successfully',
      result
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      message: 'Failed to sync data', 
      error: error.message 
    });
  }
};

export const refreshData = async (req, res) => {
  try {
    // Initialize the service if not already done
    if (!syncService.spotifyApi.getAccessToken()) {
      await syncService.initialize();
    }

    await syncService.refreshData();
    
    res.json({
      message: 'Data refresh completed successfully'
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ 
      message: 'Failed to refresh data', 
      error: error.message 
    });
  }
};

export const getSyncStatus = async (req, res) => {
  try {
    const Artist = (await import('../models/Artist.js')).default;
    const Album = (await import('../models/Album.js')).default;
    const Song = (await import('../models/Song.js')).default;

    const stats = {
      artists: await Artist.countDocuments({ sync_source: 'spotify' }),
      albums: await Album.countDocuments({ sync_source: 'spotify' }),
      tracks: await Song.countDocuments({ sync_source: 'spotify' }),
      lastSync: await Artist.findOne({ sync_source: 'spotify' })
        .sort({ last_synced: -1 })
        .select('last_synced')
        .lean()
    };

    res.json({
      message: 'Sync status retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ 
      message: 'Failed to get sync status', 
      error: error.message 
    });
  }
};

export const syncFromFolders = async (req, res) => {
  try {
    const publicDir = path.join(__dirname, '../../../public');
    const songsDir = path.join(publicDir, 'songs');
    
    if (!fs.existsSync(songsDir)) {
      return res.status(404).json({ message: 'Songs directory not found' });
    }

    const stats = { added: 0, updated: 0, errors: 0, skipped: 0, errors_details: [] };
    
    // Recursive walker
    async function* walk(dir) {
      const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
          yield* walk(res);
        } else {
          yield res;
        }
      }
    }

    for await (const filePath of walk(songsDir)) {
      if (!/\.(mp3|wav|ogg|m4a|flac)$/i.test(filePath)) continue;

      try {
        const relPath = path.relative(songsDir, filePath);
        const parts = relPath.split(path.sep);
        const fileName = path.basename(filePath, path.extname(filePath));
        
        let genre = 'Uncategorized';
        let artistName = 'Unknown Artist';
        let albumName = '';
        
        // Infer metadata from folder structure
        // Expected: Genre/Artist/Album/Song or Genre/Artist/Song
        if (parts.length >= 2) {
            genre = parts[0]; // Top folder is Genre
            if (parts.length >= 3) {
                artistName = parts[1]; // Second folder is Artist
                if (parts.length >= 4) {
                    albumName = parts[2]; // Third folder is Album
                }
            } else {
                // Genre/Song.mp3 -> Artist unknown
            }
        }

        // 1. Find or Create Artist
        let artistId = null;
        if (artistName !== 'Unknown Artist') {
            let artist = await Artist.findOne({ name: { $regex: new RegExp(`^${artistName}$`, 'i') } });
            if (!artist) {
                artist = await Artist.create({ 
                    name: artistName,
                    genres: [genre],
                    images: [] // Placeholder
                });
            } else {
                // Update genre if not present
                if (!artist.genres.some(g => g.toLowerCase() === genre.toLowerCase())) {
                    artist.genres.push(genre);
                    await artist.save();
                }
            }
            artistId = artist._id;
        }

        // 2. Find or Create Album (optional)
        let albumId = null;
        if (albumName) {
            let album = await Album.findOne({ name: { $regex: new RegExp(`^${albumName}$`, 'i') }, artists: artistId });
            if (!album) {
                album = await Album.create({
                    name: albumName,
                    artists: artistId ? [artistId] : [],
                    genres: [genre],
                    release_date: new Date().toISOString().split('T')[0] // Unknown date
                });
            }
            albumId = album._id;
        }

        // Normalize/ensure Genre document exists (map folder names to allowed enum)
        const normalizeGenreName = (g) => {
            if (!g) return 'Other';
            const raw = String(g).trim().toLowerCase();
            if (['hiphop', 'hip-hop', 'hip hop', 'rap'].includes(raw)) return 'HipHop';
            if (['pop'].includes(raw)) return 'Pop';
            if (['rock'].includes(raw)) return 'Rock';
            if (['jazz'].includes(raw)) return 'Jazz';
            return 'Other';
        };
        const genreName = normalizeGenreName(genre);
        let genreDoc = await Genre.findOne({ name: genreName });
        if (!genreDoc) {
            genreDoc = await Genre.create({ name: genreName });
        }

        // 3. Upsert Song
        // Normalize path separators to forward slashes for URL
        const urlPath = '/songs/' + relPath.split(path.sep).join('/');
        
        const songData = {
            name: fileName,
            audio_url: urlPath,
            genre: genreDoc._id,
            artists: artistId ? [artistId] : [],
            album: albumId,
            duration_ms: 0, // Would need ffprobe/music-metadata to get real duration
            file_path: filePath
        };

        // Check if song exists by audio_url (file path)
        let song = await Song.findOne({ audio_url: urlPath });
        if (song) {
            // Update metadata if changed (optional, maybe user edited manually?)
            // Let's only update if missing important fields or force update
            // For now, assume folder structure is truth for Genre/Artist
            song.genre = genreDoc._id;
            if (artistId && (!song.artists || song.artists.length === 0)) song.artists = [artistId];
            if (albumId && !song.album) song.album = albumId;
            if (!song.file_path) song.file_path = filePath;
            await song.save();
            stats.updated++;
        } else {
            await Song.create(songData);
            stats.added++;
        }

      } catch (err) {
        stats.errors++;
        stats.errors_details.push({ file: filePath, error: err && err.message ? err.message : String(err) });
      }
    }

    res.json({ message: 'Folder sync completed', stats });
  } catch (error) {
    console.error('Folder sync error:', error);
    res.status(500).json({ message: 'Folder sync failed', error: error.message });
  }
};
