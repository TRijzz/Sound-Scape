import mongoose from 'mongoose';

const artistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    bio: { type: String },
    image_url: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Artist', artistSchema);
