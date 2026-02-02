import Category from '../models/Category.js';

export const createCategory = async (req, res) => {
  try {
    const { name, description, cover_image, is_public } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    
    const categoryData = {
      name,
      description,
      cover_image,
      is_public: !!is_public,
    };
    
    if (req.user) {
      categoryData.user = req.user.id;
    }
    
    const cat = await Category.create(categoryData);
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
    // Admins can see all, regular users see public
    const query = {}; 
    if (!req.isAdmin) {
       query.is_public = true;
    }
    
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
    
    // Allow access if public, or if owner, or if admin
    const isOwner = req.user && String(cat.user) === String(req.user.id);
    if (!cat.is_public && !isOwner && !req.isAdmin) {
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
    const query = { _id: req.params.id };
    
    // If not admin, restrict to owner
    if (!req.isAdmin && req.user) {
      query.user = req.user.id;
    } else if (!req.isAdmin && !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const cat = await Category.findOneAndUpdate(
      query,
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
    const query = { _id: req.params.id };
    
    // If not admin, restrict to owner
    if (!req.isAdmin && req.user) {
      query.user = req.user.id;
    } else if (!req.isAdmin && !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const cat = await Category.findOneAndDelete(query);
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
    
    const query = { _id: req.params.id };
    // If not admin, restrict to owner
    if (!req.isAdmin && req.user) {
      query.user = req.user.id;
    } else if (!req.isAdmin && !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const cat = await Category.findOneAndUpdate(
      query,
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
    
    const query = { _id: req.params.id };
    // If not admin, restrict to owner
    if (!req.isAdmin && req.user) {
      query.user = req.user.id;
    } else if (!req.isAdmin && !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const cat = await Category.findOneAndUpdate(
      query,
      { $pull: { songs: songId } },
      { new: true }
    ).populate('songs');
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (error) {
    res.status(400).json({ message: 'Failed to remove song', error: error.message });
  }
};
