import User from '../models/User.js';
import LikedSong from '../models/LikedSong.js';
import Vinyl from '../models/Vinyl.js';

const userIdFromRequest = (req) => req.user?.id || req.user?._id;

const vinylPopulate = [
  {
    path: 'purchased_vinyls',
    populate: [
      { path: 'albumId' },
      { path: 'songId' },
      { path: 'tracklist.songId', populate: [{ path: 'album' }, { path: 'artists', select: 'name images' }] },
    ],
  },
  {
    path: 'active_vinyl',
    populate: [
      { path: 'albumId' },
      { path: 'songId' },
      { path: 'tracklist.songId', populate: [{ path: 'album' }, { path: 'artists', select: 'name images' }] },
    ],
  },
];

const buildUserPayload = async (userId) => {
  const user = await User.findById(userId)
    .populate(vinylPopulate)
    .lean();

  if (!user) return null;

  const likes = await LikedSong.find({ user: userId }).select('song').lean();
  const likedSongs = likes.map((like) => like.song).filter(Boolean);
  return { ...user, likedSongs };
};

export const me = async (req, res) => {
  const user = await buildUserPayload(userIdFromRequest(req));
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
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
  const likes = await LikedSong.find({ user: userIdFromRequest(req) })
    .populate({
      path: 'song',
      populate: [
        { path: 'album', select: 'name images' },
        { path: 'artists', select: 'name spotify_id images' }
      ]
    })
    .lean();
  const songs = likes.map((like) => like.song).filter(Boolean);
  res.json(songs);
};

export const likeSong = async (req, res) => {
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ message: 'songId required' });
  try {
    await LikedSong.updateOne(
      { user: userIdFromRequest(req), song: songId },
      { $setOnInsert: { user: userIdFromRequest(req), song: songId, createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to like song' });
  }
};

export const purchaseVinyl = async (req, res) => {
  const { vinylId } = req.body;
  const userId = userIdFromRequest(req);

  try {
    const user = await User.findById(userId);
    const vinyl = await Vinyl.findById(vinylId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!vinyl) {
      return res.status(404).json({ message: 'Vinyl not found' });
    }

    const alreadyOwned = user.purchased_vinyls.some((ownedVinylId) => String(ownedVinylId) === String(vinylId));
    if (alreadyOwned) {
      return res.status(400).json({ message: 'Vinyl already purchased' });
    }

    user.purchased_vinyls.push(vinylId);
    user.active_vinyl = vinylId;
    await user.save();

    const hydratedUser = await buildUserPayload(userId);
    res.json({
      message: 'Vinyl purchased successfully',
      purchased_vinyls: hydratedUser?.purchased_vinyls || [],
      active_vinyl: hydratedUser?.active_vinyl || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unlikeSong = async (req, res) => {
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ message: 'songId required' });
  await LikedSong.deleteOne({ user: userIdFromRequest(req), song: songId });
  res.json({ success: true });
};

export const setActiveVinyl = async (req, res) => {
  const { vinylId } = req.body;
  const userId = userIdFromRequest(req);

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!vinylId) {
      user.active_vinyl = null;
      await user.save();
      return res.json({ message: 'Active vinyl cleared', active_vinyl: null });
    }

    const ownsVinyl = user.purchased_vinyls.some((ownedVinylId) => String(ownedVinylId) === String(vinylId));
    if (!ownsVinyl) {
      return res.status(403).json({ message: 'You have not purchased this vinyl' });
    }

    user.active_vinyl = vinylId;
    await user.save();

    const hydratedUser = await buildUserPayload(userId);
    res.json({ message: 'Active vinyl set successfully', active_vinyl: hydratedUser?.active_vinyl || null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
