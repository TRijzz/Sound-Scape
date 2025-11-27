import User from '../models/User.js';
import LikedSong from '../models/LikedSong.js';

export const me = async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  const likes = await LikedSong.find({ user: req.user.id }).select('song').lean();
  const likedSongs = likes.map(l => l.song).filter(Boolean);
  res.json({ ...user, likedSongs });
};

export const getUsers = async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
};

export const getUser = async (req, res) => {
  const { id } = req.params;
  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const user = await User.findById(id).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateUser = async (req, res) => {
  const { name, avatar_url } = req.body;
  const { id } = req.params;
  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { name, avatar_url } },
    { new: true }
  ).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const user = await User.findByIdAndDelete(id).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ success: true });
};

export const getLikedSongs = async (req, res) => {
  const likes = await LikedSong.find({ user: req.user.id }).populate('song').lean();
  const songs = likes.map(l => l.song).filter(Boolean);
  res.json(songs);
};

export const likeSong = async (req, res) => {
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ message: 'songId required' });
  try {
    await LikedSong.updateOne(
      { user: req.user.id, song: songId },
      { $setOnInsert: { user: req.user.id, song: songId, createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to like song' });
  }
};

export const unlikeSong = async (req, res) => {
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ message: 'songId required' });
  await LikedSong.deleteOne({ user: req.user.id, song: songId });
  res.json({ success: true });
};
