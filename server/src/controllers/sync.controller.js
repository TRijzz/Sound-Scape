import SpotifySyncService from '../scripts/spotify-sync.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const syncService = new SpotifySyncService();

const normalizeFolderGenre = (genre) => {
  const raw = String(genre || '').trim().toLowerCase();
  if (!raw) return 'Uncategorized';
  if (['hiphop', 'hip-hop', 'hip hop', 'rap'].includes(raw)) return 'HipHop';
  if (['soft pop', 'soft_pop', 'soft-pop'].includes(raw)) return 'Soft Pop';
  if (['funk rock', 'funk_rock', 'funk-rock'].includes(raw)) return 'Funk Rock';
  if (['pop'].includes(raw)) return 'Pop';
  if (['rock'].includes(raw)) return 'Rock';
  if (['jazz'].includes(raw)) return 'Jazz';
  if (['nepali'].includes(raw)) return 'Nepali';
  return String(genre).trim();
};

export const syncData = async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    if (!syncService.spotifyApi.getAccessToken()) {
      await syncService.initialize();
    }

    const result = await syncService.completeSync(query, options);
    res.json({ message: 'Data sync completed successfully', result });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Failed to sync data', error: error.message });
  }
};

export const refreshData = async (req, res) => {
  try {
    if (!syncService.spotifyApi.getAccessToken()) {
      await syncService.initialize();
    }

    await syncService.refreshData();
    res.json({ message: 'Data refresh completed successfully' });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Failed to refresh data', error: error.message });
  }
};

export const getSyncStatus = async (req, res) => {
  try {
    const stats = {
      artists: await Artist.countDocuments({ sync_source: 'spotify' }),
      albums: await Album.countDocuments({ sync_source: 'spotify' }),
      tracks: await Song.countDocuments({ sync_source: 'spotify' }),
      lastSync: await Artist.findOne({ sync_source: 'spotify' })
        .sort({ last_synced: -1 })
        .select('last_synced')
        .lean()
    };

    res.json({ message: 'Sync status retrieved successfully', stats });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ message: 'Failed to get sync status', error: error.message });
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

    async function* walk(dir) {
      const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const dirent of dirents) {
        const result = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
          yield* walk(result);
        } else {
          yield result;
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

        if (parts.length >= 2) {
          genre = normalizeFolderGenre(parts[0]);
          if (parts.length >= 3) {
            artistName = parts[1];
            if (parts.length >= 4) {
              albumName = parts[2];
            }
          }
        }

        let artistId = null;
        if (artistName !== 'Unknown Artist') {
          let artist = await Artist.findOne({ name: { $regex: new RegExp(`^${artistName}$`, 'i') } });
          if (!artist) {
            artist = await Artist.create({ name: artistName, genres: [genre], images: [] });
          } else if (!artist.genres.some((value) => value.toLowerCase() === genre.toLowerCase())) {
            artist.genres.push(genre);
            await artist.save();
          }
          artistId = artist._id;
        }

        let albumId = null;
        if (albumName) {
          let album = await Album.findOne({ name: { $regex: new RegExp(`^${albumName}$`, 'i') }, artists: artistId });
          if (!album) {
            album = await Album.create({
              name: albumName,
              artists: artistId ? [artistId] : [],
              genres: [genre],
              release_date: new Date().toISOString().split('T')[0]
            });
          }
          albumId = album._id;
        }

        const urlPath = '/songs/' + relPath.split(path.sep).join('/');
        const songData = {
          name: fileName,
          audio_url: urlPath,
          genre,
          genres: [genre],
          artists: artistId ? [artistId] : [],
          album: albumId,
          duration_ms: 0,
          file_path: filePath,
          category: genre === 'HipHop' ? 'Hip-Hop Essentials' : genre === 'Pop' || genre === 'Soft Pop' ? 'Pop Songs' : 'Uncategorized'
        };

        const song = await Song.findOne({ audio_url: urlPath });
        if (song) {
          song.genre = genre;
          song.genres = [genre];
          if (artistId && (!song.artists || song.artists.length === 0)) song.artists = [artistId];
          if (albumId && !song.album) song.album = albumId;
          if (!song.file_path) song.file_path = filePath;
          if (!song.category) song.category = songData.category;
          await song.save();
          stats.updated++;
        } else {
          await Song.create(songData);
          stats.added++;
        }
      } catch (err) {
        stats.errors++;
        stats.errors_details.push({ file: filePath, error: err?.message || String(err) });
      }
    }

    res.json({ message: 'Folder sync completed', stats });
  } catch (error) {
    console.error('Folder sync error:', error);
    res.status(500).json({ message: 'Folder sync failed', error: error.message });
  }
};
