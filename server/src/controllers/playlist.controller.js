import Playlist from '../models/Playlist.js';

export const createPlaylist = async (req, res) => {
  const body = { ...req.body, user: req.user.id };
  const playlist = await Playlist.create(body);
  res.status(201).json(playlist);
};

export const getMyPlaylists = async (req, res) => {
  const items = await Playlist.find({ user: req.user.id }).populate('songs').lean();
  res.json(items);
};

export const getPlaylist = async (req, res) => {
  const item = await Playlist.findById(req.params.id).populate('songs').lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json(item);
};

export const updatePlaylist = async (req, res) => {
  const item = await Playlist.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    req.body,
    { new: true }
  )
    .populate('songs')
    .lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json(item);
};

export const deletePlaylist = async (req, res) => {
  const item = await Playlist.findOneAndDelete({ _id: req.params.id, user: req.user.id }).lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json({ success: true });
};

export const addSongToPlaylist = async (req, res) => {
  const item = await Playlist.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $addToSet: { songs: req.body.songId } },
    { new: true }
  )
    .populate('songs')
    .lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json(item);
};

export const removeSongFromPlaylist = async (req, res) => {
  const item = await Playlist.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $pull: { songs: req.body.songId } },
    { new: true }
  )
    .populate('songs')
    .lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json(item);
};
