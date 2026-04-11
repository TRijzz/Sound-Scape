import User from '../models/User.js';
import Vinyl from '../models/Vinyl.js';
import Artist from '../models/Artist.js';
import Playlist from '../models/Playlist.js';

const userIdFromRequest = (req) => req.user?.id || req.user?._id;
const publicUserSelect = 'name username avatar_url bio preferred_genres';

const mapPublicUser = (user) => {
  if (!user) return null;
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    username: user.username || '',
    avatar_url: user.avatar_url || '',
    bio: user.bio || '',
    preferred_genres: Array.isArray(user.preferred_genres) ? user.preferred_genres : [],
  };
};

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

  const likedSongs = Array.isArray(user.likedSongs)
    ? user.likedSongs.map((songId) => String(songId)).filter(Boolean)
    : [];
  const followedArtists = Array.isArray(user.followed_artists)
    ? user.followed_artists.map((artistId) => String(artistId)).filter(Boolean)
    : [];
  const followedUsers = Array.isArray(user.followed_users)
    ? user.followed_users.map((followedUserId) => String(followedUserId)).filter(Boolean)
    : [];
  return { ...user, likedSongs, followedArtists, followedUsers };
};

export const me = async (req, res) => {
  const user = await buildUserPayload(userIdFromRequest(req));
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const getUsers = async (req, res) => {
  const users = await User.find()
    .populate(vinylPopulate)
    .lean();
  res.json(users);
};

export const searchPublicUsers = async (req, res) => {
  const query = String(req.query?.q || req.query?.search || '').trim();
  const limit = Math.max(1, Math.min(25, Number(req.query?.limit) || 10));

  if (!query) {
    return res.json({ users: [] });
  }

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({
    $or: [
      { name: regex },
      { username: regex },
      { bio: regex }
    ]
  })
    .select(publicUserSelect)
    .sort({ name: 1 })
    .limit(limit)
    .lean();

  res.json({ users: users.map(mapPublicUser).filter(Boolean) });
};

export const getPublicUser = async (req, res) => {
  const { id } = req.params;
  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const user = await User.findById(id)
    .select(`${publicUserSelect} followed_users`)
    .populate({ path: 'followed_users', select: publicUserSelect })
    .lean();

  if (!user) return res.status(404).json({ message: 'User not found' });

  const [followerCount, publicPlaylistCount, followerUsers, publicPlaylists] = await Promise.all([
    User.countDocuments({ followed_users: id }),
    Playlist.countDocuments({ user: id, is_public: true }),
    User.find({ followed_users: id })
      .select(publicUserSelect)
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean(),
    Playlist.find({ user: id, is_public: true })
      .populate({ path: 'user', select: 'name username avatar_url' })
      .populate({
        path: 'songs',
        populate: [
          { path: 'album', select: 'name images' },
          { path: 'artists', select: 'name spotify_id images' }
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean()
  ]);

  const followingUsers = Array.isArray(user.followed_users)
    ? user.followed_users.map(mapPublicUser).filter(Boolean)
    : [];

  res.json({
    ...mapPublicUser(user),
    stats: {
      publicPlaylists: publicPlaylistCount,
      followers: followerCount,
      following: followingUsers.length,
    },
    publicPlaylists,
    followers: followerUsers.map(mapPublicUser).filter(Boolean),
    following: followingUsers,
  });
};

export const getUser = async (req, res) => {
  const { id } = req.params;
  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const user = await User.findById(id)
    .populate(vinylPopulate)
    .lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateUser = async (req, res) => {
  const {
    name,
    avatar_url,
    bio,
    onboarded,
    followed_artists,
    followed_users,
    preferred_genres,
    preferred_moods,
    preferred_languages,
    preferred_tags
  } = req.body || {};
  const { id } = req.params;

  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const requesterId = String(userIdFromRequest(req) || '');
  if (!req.isAdmin && requesterId !== String(id)) {
    return res.status(403).json({ message: 'You can only update your own profile' });
  }

  const set = {};
  if (typeof name === 'string') set.name = name.trim();
  if (typeof avatar_url === 'string') set.avatar_url = avatar_url;
  if (typeof bio === 'string') set.bio = bio.trim();
  if (typeof onboarded === 'boolean') set.onboarded = onboarded;
  if (Array.isArray(followed_artists)) {
    const normalizedArtistIds = Array.from(new Set(followed_artists.map((artistId) => String(artistId)).filter(Boolean)));
    if (normalizedArtistIds.length > 0) {
      const existingArtists = await Artist.find({ _id: { $in: normalizedArtistIds } }).select('_id').lean();
      const existingArtistIds = new Set(existingArtists.map((artist) => String(artist._id)));
      const invalidArtistIds = normalizedArtistIds.filter((artistId) => !existingArtistIds.has(artistId));
      if (invalidArtistIds.length > 0) {
        return res.status(400).json({ message: 'Some artist IDs are invalid', invalid_artist_ids: invalidArtistIds });
      }
    }
    set.followed_artists = normalizedArtistIds;
  }
  if (Array.isArray(followed_users)) {
    const normalizedRequesterId = String(requesterId);
    const normalizedUserIds = Array.from(
      new Set(
        followed_users
          .map((followedUserId) => String(followedUserId))
          .filter((followedUserId) => followedUserId && followedUserId !== normalizedRequesterId)
      )
    );
    if (normalizedUserIds.length > 0) {
      const existingUsers = await User.find({ _id: { $in: normalizedUserIds } }).select('_id').lean();
      const existingUserIds = new Set(existingUsers.map((user) => String(user._id)));
      const invalidUserIds = normalizedUserIds.filter((followedUserId) => !existingUserIds.has(followedUserId));
      if (invalidUserIds.length > 0) {
        return res.status(400).json({ message: 'Some user IDs are invalid', invalid_user_ids: invalidUserIds });
      }
    }
    set.followed_users = normalizedUserIds;
  }
  if (Array.isArray(preferred_genres)) set.preferred_genres = preferred_genres.map(String);
  if (Array.isArray(preferred_moods)) set.preferred_moods = preferred_moods.map(String);
  if (Array.isArray(preferred_languages)) set.preferred_languages = preferred_languages.map(String);
  if (Array.isArray(preferred_tags)) set.preferred_tags = preferred_tags.map(String);

  const profileImageFile = req.files?.profileImage?.[0];
  if (profileImageFile) {
    set.avatar_url = `/images/${profileImageFile.filename}`;
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: set },
    { new: true }
  ).lean();

  if (!user) return res.status(404).json({ message: 'User not found' });
  const hydratedUser = await buildUserPayload(id);
  res.json(hydratedUser || user);
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

export const getLikedSongs = async (req, res) => {                  //Gets the liked songs of the user
  const userId = userIdFromRequest(req);
  const user = await User.findById(userId)
    .populate({
      path: 'likedSongs',
      populate: [
        { path: 'album', select: 'name images' },
        { path: 'artists', select: 'name spotify_id images' }
      ]
    })
    .lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(Array.isArray(user.likedSongs) ? user.likedSongs.filter(Boolean) : []);
};

export const likeSong = async (req, res) => {               //Saves Liked Songs
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ message: 'songId required' });
  try {
    const userId = userIdFromRequest(req);
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { likedSongs: songId } },
      { new: true }
    ).select('likedSongs').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      success: true,
      likedSongs: Array.isArray(user?.likedSongs)
        ? user.likedSongs.map((likedSongId) => String(likedSongId)).filter(Boolean)
        : []
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to like song' });
  }
};

export const purchaseVinyl = async (req, res) => {          //Saves Purchased Vinyles
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

export const unlikeSong = async (req, res) => {           //Removes Liked Songs
  const { songId } = req.body || {};
  if (!songId) return res.status(400).json({ message: 'songId required' });
  const userId = userIdFromRequest(req);
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { likedSongs: songId } },
    { new: true }
  ).select('likedSongs').lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    success: true,
    likedSongs: Array.isArray(user?.likedSongs)
      ? user.likedSongs.map((likedSongId) => String(likedSongId)).filter(Boolean)
      : []
  });
};

export const getFollowedArtists = async (req, res) => {
  const user = await User.findById(userIdFromRequest(req))
    .populate({ path: 'followed_artists', select: 'name images image_url followers genres popularity' })
    .lean();

  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(Array.isArray(user.followed_artists) ? user.followed_artists : []);
};

export const followArtist = async (req, res) => {
  const { artistId } = req.body || {};
  if (!artistId) return res.status(400).json({ message: 'artistId required' });

  const artist = await Artist.findById(artistId).select('_id').lean();
  if (!artist) {
    return res.status(404).json({ message: 'Artist not found' });
  }

  const user = await User.findByIdAndUpdate(
    userIdFromRequest(req),
    { $addToSet: { followed_artists: artistId } },
    { new: true }
  ).select('followed_artists').lean();

  res.json({
    success: true,
    followedArtists: Array.isArray(user?.followed_artists)
      ? user.followed_artists.map((followedArtistId) => String(followedArtistId)).filter(Boolean)
      : []
  });
};

export const unfollowArtist = async (req, res) => {
  const { artistId } = req.body || {};
  if (!artistId) return res.status(400).json({ message: 'artistId required' });

  const user = await User.findByIdAndUpdate(
    userIdFromRequest(req),
    { $pull: { followed_artists: artistId } },
    { new: true }
  ).select('followed_artists').lean();

  res.json({
    success: true,
    followedArtists: Array.isArray(user?.followed_artists)
      ? user.followed_artists.map((followedArtistId) => String(followedArtistId)).filter(Boolean)
      : []
  });
};

export const followUser = async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const requesterId = String(userIdFromRequest(req) || '');
  const normalizedUserId = String(userId);

  if (requesterId === normalizedUserId) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  const targetUser = await User.findById(normalizedUserId).select('_id').lean();
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const user = await User.findByIdAndUpdate(
    requesterId,
    { $addToSet: { followed_users: normalizedUserId } },
    { new: true }
  ).select('followed_users').lean();

  res.json({
    success: true,
    followedUsers: Array.isArray(user?.followed_users)
      ? user.followed_users.map((followedUserId) => String(followedUserId)).filter(Boolean)
      : []
  });
};

export const unfollowUser = async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const requesterId = String(userIdFromRequest(req) || '');
  const normalizedUserId = String(userId);

  const user = await User.findByIdAndUpdate(
    requesterId,
    { $pull: { followed_users: normalizedUserId } },
    { new: true }
  ).select('followed_users').lean();

  res.json({
    success: true,
    followedUsers: Array.isArray(user?.followed_users)
      ? user.followed_users.map((followedUserId) => String(followedUserId)).filter(Boolean)
      : []
  });
};

export const setActiveVinyl = async (req, res) => {         //Sets the Active Vinyl for the user
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

export const updateUserVinyls = async (req, res) => {
  const { id } = req.params;
  const { purchased_vinyls = [], active_vinyl = null } = req.body || {};

  if (!id || (typeof id === 'string' && id.length !== 24)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const normalizedVinylIds = Array.from(
      new Set((Array.isArray(purchased_vinyls) ? purchased_vinyls : []).map((vinylId) => String(vinylId)).filter(Boolean))
    );

    if (normalizedVinylIds.length > 0) {
      const existingVinyls = await Vinyl.find({ _id: { $in: normalizedVinylIds } }).select('_id').lean();
      const existingVinylIds = new Set(existingVinyls.map((vinyl) => String(vinyl._id)));
      const missingVinylIds = normalizedVinylIds.filter((vinylId) => !existingVinylIds.has(vinylId));
      if (missingVinylIds.length > 0) {
        return res.status(400).json({ message: 'Some vinyl IDs are invalid', invalid_vinyl_ids: missingVinylIds });
      }
    }

    let normalizedActiveVinyl = active_vinyl ? String(active_vinyl) : null;
    if (normalizedActiveVinyl && !normalizedVinylIds.includes(normalizedActiveVinyl)) {
      normalizedActiveVinyl = null;
    }

    user.purchased_vinyls = normalizedVinylIds;
    user.active_vinyl = normalizedActiveVinyl;
    await user.save();

    const hydratedUser = await buildUserPayload(id);
    return res.json({
      message: 'User vinyl ownership updated successfully',
      user: hydratedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user vinyl ownership', error: error.message });
  }
};
