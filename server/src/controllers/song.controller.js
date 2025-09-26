import Song from '../models/Song.js';

export const createSong = async (req, res) => {
  const song = await Song.create(req.body);
  res.status(201).json(song);
};

export const getSongs = async (req, res) => {
  const items = await Song.find().populate('artist').lean();
  res.json(items);
};

export const getSong = async (req, res) => {
  const item = await Song.findById(req.params.id).populate('artist').lean();
  if (!item) return res.status(404).json({ message: 'Song not found' });
  res.json(item);
};

export const updateSong = async (req, res) => {
  const item = await Song.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('artist')
    .lean();
  if (!item) return res.status(404).json({ message: 'Song not found' });
  res.json(item);
};

export const deleteSong = async (req, res) => {
  const item = await Song.findByIdAndDelete(req.params.id).lean();
  if (!item) return res.status(404).json({ message: 'Song not found' });
  res.json({ success: true });
};

export const incrementPlayCount = async (req, res) => {
  const item = await Song.findByIdAndUpdate(
    req.params.id,
    { $inc: { play_count: 1 } },
    { new: true }
  ).lean();
  if (!item) return res.status(404).json({ message: 'Song not found' });
  res.json(item);
};

export const getLyrics = async (req, res) => {
  const item = await Song.findById(req.params.id).select('lyrics title').lean();
  if (!item) return res.status(404).json({ message: 'Song not found' });
  res.json({ lyrics: item.lyrics || '', title: item.title });
};

export const updateLyrics = async (req, res) => {
  const item = await Song.findByIdAndUpdate(
    req.params.id,
    { lyrics: req.body.lyrics },
    { new: true }
  ).lean();
  if (!item) return res.status(404).json({ message: 'Song not found' });
  res.json(item);
};
