import mongoose from 'mongoose';

const listeningHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true, index: true },
    genre: { type: String, required: true, index: true },
    played_at: { type: Date, default: Date.now },
    duration_listened_ms: { type: Number, default: 0 },
  },
  { timestamps: true }
);

listeningHistorySchema.index({ genre: 1, played_at: -1 });
listeningHistorySchema.index({ user: 1, played_at: -1 });

export default mongoose.model('ListeningHistory', listeningHistorySchema);
