import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import {
  createTaxonomyEntry,
  deleteTaxonomyEntry,
  getTaxonomyEntry,
  listTaxonomyEntries,
  updateTaxonomyEntry
} from '../utils/taxonomyStore.js';

const DB_NAME = 'genre';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactMatch = (value = '') => new RegExp(`^${escapeRegex(value)}$`, 'i');

export const getGenres = async (req, res) => {
  try {
    const genres = await listTaxonomyEntries(DB_NAME, { search: req.query.search || '' });
    res.json(genres.map((genre) => ({
      ...genre,
      is_active: true
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch genres', error: error.message });
  }
};

export const createGenre = async (req, res) => {
  try {
    const genre = await createTaxonomyEntry(DB_NAME, req.body || {}, { is_active: true });
    res.status(201).json(genre);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create genre', error: error.message });
  }
};

export const updateGenre = async (req, res) => {
  try {
    const result = await updateTaxonomyEntry(DB_NAME, req.params.id, req.body || {}, { is_active: true });
    if (result.previousName !== result.entry.name) {
      const previousRegex = exactMatch(result.previousName);
      await Promise.all([
        Song.updateMany(
          { genre: previousRegex },
          { $set: { genre: result.entry.name } }
        ),
        Song.updateMany(
          { genres: previousRegex },
          { $set: { 'genres.$[item]': result.entry.name } },
          { arrayFilters: [{ item: previousRegex }] }
        ),
        Artist.updateMany(
          { genres: previousRegex },
          { $set: { 'genres.$[item]': result.entry.name } },
          { arrayFilters: [{ item: previousRegex }] }
        ),
        Album.updateMany(
          { genres: previousRegex },
          { $set: { 'genres.$[item]': result.entry.name } },
          { arrayFilters: [{ item: previousRegex }] }
        )
      ]);
    }

    res.json(result.entry);
  } catch (error) {
    const status = error.message === 'Entry not found' ? 404 : 400;
    res.status(status).json({ message: 'Failed to update genre', error: error.message });
  }
};

export const deleteGenre = async (req, res) => {
  try {
    const genre = await getTaxonomyEntry(DB_NAME, req.params.id);
    if (!genre) {
      return res.status(404).json({ message: 'Genre not found' });
    }

    await deleteTaxonomyEntry(DB_NAME, req.params.id);
    const previousRegex = exactMatch(genre.name);

    await Promise.all([
      Song.updateMany({ genre: previousRegex }, { $set: { genre: 'Uncategorized' } }),
      Song.updateMany(
        { genres: previousRegex },
        { $set: { 'genres.$[item]': 'Uncategorized' } },
        { arrayFilters: [{ item: previousRegex }] }
      ),
      Artist.updateMany(
        { genres: previousRegex },
        { $pull: { genres: genre.name } }
      ),
      Album.updateMany(
        { genres: previousRegex },
        { $pull: { genres: genre.name } }
      )
    ]);

    res.json({ message: 'Genre deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete genre', error: error.message });
  }
};
