import Artist from '../models/Artist.js';

export const createArtist = async (req, res) => {
  const artist = await Artist.create(req.body);
  res.status(201).json(artist);
};

export const getArtists = async (req, res) => {
  const items = await Artist.find().lean();
  res.json(items);
};

export const getArtist = async (req, res) => {
  const item = await Artist.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ message: 'Artist not found' });
  res.json(item);
};

export const updateArtist = async (req, res) => {
  const item = await Artist.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!item) return res.status(404).json({ message: 'Artist not found' });
  res.json(item);
};

export const deleteArtist = async (req, res) => {
  const item = await Artist.findByIdAndDelete(req.params.id).lean();
  if (!item) return res.status(404).json({ message: 'Artist not found' });
  res.json({ success: true });
};