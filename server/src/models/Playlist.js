import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    is_public: { type: Boolean, default: false },
    color: { type: String, default: '#0B0F1A' },
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Playlist', playlistSchema);
