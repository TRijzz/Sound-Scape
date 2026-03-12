import mongoose from 'mongoose';

const vinylSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    artist: { type: String, required: true, trim: true },
    image_url: { type: String },
    image_base64: { type: String },
    mime_type: { type: String },
    price: { type: Number, required: true, min: 0 },
    is_available: { type: Boolean, default: true },
    display_in_store: { type: Boolean, default: false },
    is_featured: { type: Boolean, default: false },
    albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
    songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
    tracklist: [
      {
        name: { type: String },
        duration: { type: String },
        songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' }
      }
    ],
    release_year: { type: Number },
  },
  { timestamps: true }
);

vinylSchema.index({ name: 'text', artist: 'text' });

export default mongoose.model('Vinyl', vinylSchema);
