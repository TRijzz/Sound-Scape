import Playlist from '../models/Playlist.js';

const playlistPopulate = [
  {
    path: 'user',
    select: 'name username email avatar_url'
  },
  {
    path: 'songs',
    populate: [
      { path: 'album', select: 'name images' },
      { path: 'artists', select: 'name spotify_id images' }
    ]
  }
];

const populatePlaylistQuery = (query) => {
  let nextQuery = query;
  for (const config of playlistPopulate) {
    nextQuery = nextQuery.populate(config);
  }
  return nextQuery;
};

const normalizePlaylistPayload = (body = {}) => {
  const payload = { ...body };

  if (Object.prototype.hasOwnProperty.call(payload, 'visibility')) {
    payload.is_public = payload.visibility === 'public';
    delete payload.visibility;
  }

  return payload;
};

const isOwner = (playlist, userId) => String(playlist?.user?._id || playlist?.user || '') === String(userId || '');

export const createPlaylist = async (req, res) => {
  const body = { ...normalizePlaylistPayload(req.body), user: req.user.id };
  const playlist = await Playlist.create(body);
  const populated = await populatePlaylistQuery(Playlist.findById(playlist._id)).lean();
  res.status(201).json(populated || playlist);
};

export const getMyPlaylists = async (req, res) => {
  const items = await populatePlaylistQuery(Playlist.find({ user: req.user.id })).lean();
  res.json(items);
};

export const getPlaylist = async (req, res) => {
  const item = await populatePlaylistQuery(Playlist.findById(req.params.id)).lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  if (!item.is_public && !isOwner(item, req.user?.id)) {
    return res.status(403).json({ message: 'This playlist is private' });
  }
  res.json(item);
};

export const updatePlaylist = async (req, res) => {
  const item = await populatePlaylistQuery(Playlist.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    normalizePlaylistPayload(req.body),
    { new: true }
  )).lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json(item);
};

export const deletePlaylist = async (req, res) => {
  const item = await Playlist.findOneAndDelete({ _id: req.params.id, user: req.user.id }).lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json({ success: true });
};

export const addSongToPlaylist = async (req, res) => {
  const item = await populatePlaylistQuery(Playlist.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $addToSet: { songs: req.body.songId } },
    { new: true }
  )).lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json(item);
};

export const removeSongFromPlaylist = async (req, res) => {
  const item = await populatePlaylistQuery(Playlist.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $pull: { songs: req.body.songId } },
    { new: true }
  )).lean();
  if (!item) return res.status(404).json({ message: 'Playlist not found' });
  res.json(item);
};
