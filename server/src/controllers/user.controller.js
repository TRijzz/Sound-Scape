import User from '../models/User.js';
import LikedSong from '../models/LikedSong.js';
import Vinyl from '../models/Vinyl.js';

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
  const { name, avatar_url, onboarded, preferred_genres, preferred_moods, preferred_languages, preferred_tags } = req.body || {};
  const { id } = req.params;
  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const set = {};
  if (typeof name === 'string') set.name = name;
  if (typeof avatar_url === 'string') set.avatar_url = avatar_url;
  if (typeof onboarded === 'boolean') set.onboarded = onboarded;
  if (Array.isArray(preferred_genres)) set.preferred_genres = preferred_genres.map(String);
  if (Array.isArray(preferred_moods)) set.preferred_moods = preferred_moods.map(String);
  if (Array.isArray(preferred_languages)) set.preferred_languages = preferred_languages.map(String);
  if (Array.isArray(preferred_tags)) set.preferred_tags = preferred_tags.map(String);

  const user = await User.findByIdAndUpdate(
    id,
    { $set: set },
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
  const likes = await LikedSong.find({ user: req.user.id })
    .populate({
      path: 'song',
      populate: [
        { path: 'album', select: 'name images' },
        { path: 'artists', select: 'name spotify_id images' }
      ]
    })
    .lean();
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

// @desc    Purchase a vinyl
// @route   POST /api/users/purchase-vinyl
// @access  Private
export const purchaseVinyl = async (req, res) => {
  const { vinylId } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    const vinyl = await Vinyl.findById(vinylId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }

    // Check if the user already owns the vinyl
    if (user.purchased_vinyls.includes(vinylId)) {
      return res.status(400).json({ message: 'Vinyl already purchased' });
    }

    user.purchased_vinyls.push(vinylId);
    await user.save();

    res.json({ message: 'Vinyl purchased successfully', purchased_vinyls: user.purchased_vinyls });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unlikeSong = async (req, res) => {
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ message: 'songId required' });
  await LikedSong.deleteOne({ user: req.user.id, song: songId });
  res.json({ success: true });
};

// @desc    Set active vinyl
// @route   POST /api/users/set-active-vinyl
// @access  Private
export const setActiveVinyl = async (req, res) => {
  const { vinylId } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If vinylId is null, clear the active vinyl
    if (!vinylId) {
      user.active_vinyl = null;
      await user.save();
      return res.json({ message: 'Active vinyl cleared', active_vinyl: null });
    }

    // Check if the user has purchased the vinyl
    if (!user.purchased_vinyls.includes(vinylId)) {
      return res.status(403).json({ message: 'You have not purchased this vinyl' });
    }

    user.active_vinyl = vinylId;
    await user.save();

    res.json({ message: 'Active vinyl set successfully', active_vinyl: user.active_vinyl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
