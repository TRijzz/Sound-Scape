import Vinyl from '../models/Vinyl.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';

export const listVinyls = async (req, res) => {
  try {
    const items = await Vinyl.find().populate('album', 'name').populate('song', 'name').lean();
    res.json({ vinyls: items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createVinyl = async (req, res) => {
  try {
    const { name, image_base64, mime_type = 'image/png', albumId, songId } = req.body || {};
    if (!name || !image_base64) {
      return res.status(400).json({ message: 'name and image_base64 required' });
    }
    const payload = { name: String(name).trim(), image_base64, mime_type };
    if (albumId) payload.album = albumId;
    if (songId) payload.song = songId;
    const created = await Vinyl.create(payload);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteVinyl = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Vinyl.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getVinylImage = async (req, res) => {
  try {
    const { id } = req.params;
    const v = await Vinyl.findById(id);
    if (!v) return res.status(404).json({ message: 'Not found' });
    const buf = Buffer.from(v.image_base64, 'base64');
    res.setHeader('Content-Type', v.mime_type || 'image/png');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
