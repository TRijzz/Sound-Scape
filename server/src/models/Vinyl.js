import mongoose from 'mongoose';

const vinylSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image_base64: { type: String, required: true }, // data without prefix
    mime_type: { type: String, default: 'image/png' },
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
    song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' }
  },
  { timestamps: true }
);

export default mongoose.model('Vinyl', vinylSchema);
