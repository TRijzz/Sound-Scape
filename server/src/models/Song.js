import mongoose from 'mongoose';

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    album: { type: String },
    duration: { type: Number, required: true },
    cover_art_url: { type: String },
    audio_url: { type: String, required: true },
    lyrics: { type: String },
    play_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Song', songSchema);
