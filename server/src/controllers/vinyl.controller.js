import Vinyl from '../models/Vinyl.js';

const normalizeVinylPayload = (payload = {}) => ({
  ...payload,
  albumId: payload.albumId || null,
  songId: payload.songId || null,
});

const vinylPopulate = [
  { path: 'albumId' },
  { path: 'songId' },
  { path: 'tracklist.songId' },
];

export const createVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.create(normalizeVinylPayload(req.body));
    const hydrated = await Vinyl.findById(vinyl._id).populate(vinylPopulate).lean();
    res.status(201).json(hydrated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create vinyl', error: error.message });
  }
};

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

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);

    const vinyls = await Vinyl.find(query)
      .populate(vinylPopulate)
      .sort(sort)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean();
    const total = await Vinyl.countDocuments(query);
    res.json({ vinyls, total, page: parsedPage, pages: Math.ceil(total / parsedLimit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vinyls', error: error.message });
  }
};

export const getVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.findById(req.params.id)
      .populate(vinylPopulate)
      .lean();
    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }
    res.json(vinyl);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vinyl', error: error.message });
  }
};

export const updateVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.findByIdAndUpdate(
      req.params.id,
      normalizeVinylPayload(req.body),
      { new: true, runValidators: true }
    ).populate(vinylPopulate);
    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }
    res.json(vinyl);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update vinyl', error: error.message });
  }
};

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
