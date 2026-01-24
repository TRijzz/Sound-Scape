import mongoose from 'mongoose';

const lyricSchema = new mongoose.Schema(
  {
    song: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Song', 
      required: true, 
      unique: true 
    },
    lines: [{
      time: { type: Number, required: true }, // time in milliseconds
      text: { type: String, default: '' }
    }],
    synced: { type: Boolean, default: true },
    source: { type: String } // e.g., 'file', 'spotify', 'user'
  },
  { timestamps: true }
);

export default mongoose.model('Lyric', lyricSchema);
