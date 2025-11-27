import mongoose from 'mongoose';

const likedSongSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true, index: true },
  },
  { timestamps: true, collection: 'liked_songs' }
);

likedSongSchema.index({ user: 1, song: 1 }, { unique: true });

export default mongoose.model('LikedSong', likedSongSchema);

