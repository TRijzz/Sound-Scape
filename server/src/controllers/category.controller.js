import Song from '../models/Song.js';
import {
  createTaxonomyEntry,
  deleteTaxonomyEntry,
  getTaxonomyEntry,
  listTaxonomyEntries,
  updateTaxonomyEntry
} from '../utils/taxonomyStore.js';

const DB_NAME = 'categories';

const enrichCategory = async (entry) => {
  const songCount = await Song.countDocuments({ category: entry.name });
  return {
    ...entry,
    song_count: songCount
  };
};

export const createCategory = async (req, res) => {
  try {
    const category = await createTaxonomyEntry(DB_NAME, req.body || {}, { is_public: true });
    res.status(201).json(await enrichCategory(category));
  } catch (error) {
    res.status(400).json({ message: 'Failed to create category', error: error.message });
  }
};

export const getMyCategories = async (req, res) => {
  res.json([]);
};

export const getCategories = async (req, res) => {
  try {
    const categories = await listTaxonomyEntries(DB_NAME, { search: req.query.search || '' });
    res.json(await Promise.all(categories.map(enrichCategory)));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const category = await getTaxonomyEntry(DB_NAME, req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const songs = await Song.find({ category: category.name })
      .populate('artists', 'name spotify_id images')
      .populate('album', 'name images release_date')
      .limit(100)
      .lean();

    res.json({
      ...(await enrichCategory(category)),
      songs
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch category', error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const result = await updateTaxonomyEntry(DB_NAME, req.params.id, req.body || {}, { is_public: true });
    if (result.previousName !== result.entry.name) {
      await Song.updateMany(
        { category: result.previousName },
        { $set: { category: result.entry.name } }
      );
    }

    res.json(await enrichCategory(result.entry));
  } catch (error) {
    const status = error.message === 'Entry not found' ? 404 : 400;
    res.status(status).json({ message: 'Failed to update category', error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await deleteTaxonomyEntry(DB_NAME, req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Song.updateMany(
      { category: category.name },
      { $set: { category: 'Uncategorized' } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
};

export const addSongToCategory = async (req, res) => {
  try {
    const { songId } = req.body || {};
    if (!songId) return res.status(400).json({ message: 'songId required' });

    const category = await getTaxonomyEntry(DB_NAME, req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Song.findByIdAndUpdate(songId, { $set: { category: category.name } });
    res.json(await enrichCategory(category));
  } catch (error) {
    res.status(400).json({ message: 'Failed to add song', error: error.message });
  }
};

export const removeSongFromCategory = async (req, res) => {
  try {
    const { songId } = req.body || {};
    if (!songId) return res.status(400).json({ message: 'songId required' });

    const category = await getTaxonomyEntry(DB_NAME, req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Song.findByIdAndUpdate(songId, { $set: { category: 'Uncategorized' } });
    res.json(await enrichCategory(category));
  } catch (error) {
    res.status(400).json({ message: 'Failed to remove song', error: error.message });
  }
};
