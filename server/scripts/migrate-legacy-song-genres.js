import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Song from '../src/models/Song.js';
import Album from '../src/models/Album.js';
import Artist from '../src/models/Artist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isLegacyGenreId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

const normalizeGenreName = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (['hiphop', 'hip-hop', 'hip hop', 'rap', 'trap music', 'hiphop rap'].includes(raw)) return 'HipHop';
  if (['soft pop', 'soft_pop', 'soft-pop', 'pop', 'pop songs'].includes(raw)) return 'Soft Pop';
  if (['funk rock', 'funk_rock', 'funk-rock'].includes(raw)) return 'Funk Rock';
  if (['nepali', 'nepali pop', 'rai', 'raï', 'newari'].includes(raw)) return 'Nepali';
  if (['r&b', 'rnb', 'r and b'].includes(raw)) return 'R&B';
  if (['alternative rock'].includes(raw)) return 'Alternative Rock';
  return String(value || '').trim();
};

const fallbackFromCategory = (category) => {
  const raw = String(category || '').trim().toLowerCase();
  if (raw === 'pop songs') return 'Soft Pop';
  if (raw === 'hip-hop essentials') return 'HipHop';
  return 'Uncategorized';
};

await mongoose.connect(process.env.MONGO_URI);

const songs = await Song.find({ genre: { $regex: '^[a-f0-9]{24}$', $options: 'i' } })
  .populate('album', 'genres name')
  .populate('artists', 'genres name')
  .lean();

let updated = 0;
for (const song of songs) {
  let nextGenre = '';

  if (Array.isArray(song.album?.genres) && song.album.genres.length > 0) {
    nextGenre = normalizeGenreName(song.album.genres[0]);
  }

  if (!nextGenre && Array.isArray(song.artists)) {
    for (const artist of song.artists) {
      if (Array.isArray(artist?.genres) && artist.genres.length > 0) {
        nextGenre = normalizeGenreName(artist.genres[0]);
        if (nextGenre) break;
      }
    }
  }

  if (!nextGenre) {
    nextGenre = fallbackFromCategory(song.category);
  }

  if (!nextGenre) {
    nextGenre = 'Uncategorized';
  }

  const nextGenres = Array.isArray(song.genres) && song.genres.length > 0
    ? song.genres.map((value) => (isLegacyGenreId(value) ? nextGenre : normalizeGenreName(value) || nextGenre))
    : [nextGenre];

  await Song.updateOne(
    { _id: song._id },
    {
      $set: {
        genre: nextGenre,
        genres: nextGenres
      }
    }
  );
  updated += 1;
}

console.log(JSON.stringify({ updatedSongs: updated }, null, 2));
await mongoose.disconnect();
