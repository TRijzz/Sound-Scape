import Category from '../models/Category.js';

export const createCategory = async (req, res) => {
  try {
    const { name, description, cover_image, is_public } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const cat = await Category.create({
      name,
      description,
      cover_image,
      is_public: !!is_public,
      user: req.user.id,
    });
    res.status(201).json(cat);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create category', error: error.message });
  }
};

export const getMyCategories = async (req, res) => {
  try {
    const cats = await Category.find({ user: req.user.id })
      .sort('-updatedAt')
      .lean();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const query = { is_public: true };
    if (search) query.name = new RegExp(search, 'i');
    const cats = await Category.find(query).sort('name').lean();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id)
      .populate('songs')
      .lean();
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    // Only allow access if public or owner
    if (!cat.is_public && String(cat.user) !== String(req.user?.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch category', error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updates = req.body || {};
    const cat = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updates,
      { new: true, runValidators: true }
    ).populate('songs');
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update category', error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
};

export const addSongToCategory = async (req, res) => {
  try {
    const { songId } = req.body || {};
    if (!songId) return res.status(400).json({ message: 'songId required' });
    const cat = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $addToSet: { songs: songId } },
      { new: true }
    ).populate('songs');
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ message: 'Failed to add song', error: error.message });
  }
};

export const removeSongFromCategory = async (req, res) => {
  try {
    const { songId } = req.body || {};
    if (!songId) return res.status(400).json({ message: 'songId required' });
    const cat = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $pull: { songs: songId } },
      { new: true }
    ).populate('songs');
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ message: 'Failed to remove song', error: error.message });
  }
};

