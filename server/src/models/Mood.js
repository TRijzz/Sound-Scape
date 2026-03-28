import mongoose from 'mongoose';

const moodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    normalized_name: { type: String, required: true, unique: true, trim: true, index: true }
  },
  { timestamps: true }
);

export default mongoose.model('Mood', moodSchema);
