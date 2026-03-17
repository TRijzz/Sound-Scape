import Vinyl from '../models/Vinyl.js';
import Album from '../models/Album.js';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

const normalizeVinylPayload = (payload = {}, files = {}) => {
  const normalized = {
    ...payload,
    albumId: payload.albumId || null,
    songId: payload.songId || null,
  };

  if (files?.vinylImage?.[0]) {
    normalized.image_url = `/images/${files.vinylImage[0].filename}`;
    normalized.image_base64 = undefined;
    normalized.mime_type = files.vinylImage[0].mimetype || 'image/png';
  }

  if (normalized.price !== undefined) normalized.price = Number(normalized.price);
  if (normalized.release_year !== undefined && normalized.release_year !== '') {
    normalized.release_year = Number(normalized.release_year);
  } else if (normalized.release_year === '') {
    normalized.release_year = undefined;
  }
  if (normalized.display_in_store !== undefined) normalized.display_in_store = normalized.display_in_store === 'true' || normalized.display_in_store === true;
  if (normalized.is_available !== undefined) normalized.is_available = normalized.is_available === 'true' || normalized.is_available === true;
  if (normalized.is_featured !== undefined) normalized.is_featured = normalized.is_featured === 'true' || normalized.is_featured === true;

  if (!normalized.image_base64) delete normalized.image_base64;
  if (!normalized.mime_type && !files?.vinylImage?.[0]) delete normalized.mime_type;

  return normalized;
};

const vinylPopulate = [
  { path: 'albumId' },
  { path: 'songId' },
  { path: 'tracklist.songId' },
];

export const createVinyl = async (req, res) => {
  try {
    const vinyl = await Vinyl.create(normalizeVinylPayload(req.body, req.files));
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
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      const matchingAlbums = await Album.find({ name: searchRegex }).select('_id').lean();
      const matchingAlbumIds = matchingAlbums.map((album) => album._id);

      query.$or = [
        { name: searchRegex },
        { artist: searchRegex },
        { description: searchRegex },
        ...(matchingAlbumIds.length > 0 ? [{ albumId: { $in: matchingAlbumIds } }] : []),
      ];
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
      normalizeVinylPayload(req.body, req.files),
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
