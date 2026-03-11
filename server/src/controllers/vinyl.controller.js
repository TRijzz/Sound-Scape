import Vinyl from '../models/Vinyl.js';

// Create a new vinyl
export const createVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.create(req.body);
    res.status(201).json(vinyl);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create vinyl', error: error.message });
  }
};

// Get all vinyls
export const getVinyls = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', search, display_in_store } = req.query;
    const query = {};
    if (search) {
      query.$text = { $search: search };
    }
    if (display_in_store !== undefined) {
      query.display_in_store = display_in_store === 'true';
    }
    const vinyls = await Vinyl.find(query)
      .populate('albumId')
      .populate('songId')
      .populate('tracklist.songId')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Vinyl.countDocuments(query);
    res.json({ vinyls, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vinyls', error: error.message });
  }
};

// Get a single vinyl by ID
export const getVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.findById(req.params.id)
      .populate('albumId')
      .populate('songId')
      .populate('tracklist.songId')
      .lean();
    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }
    res.json(vinyl);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vinyl', error: error.message });
  }
};

// Update a vinyl by ID
export const updateVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }
    res.json(vinyl);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update vinyl', error: error.message });
  }
};

// Delete a vinyl by ID
export const deleteVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.findByIdAndDelete(req.params.id);
    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }
    res.json({ message: 'Vinyl deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete vinyl', error: error.message });
  }
};
