import mongoose from 'mongoose';

const artistSchema = new mongoose.Schema(
  {
    // Spotify fields - sparse unique index allows multiple null values
    spotify_id: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, index: true },
    
    // Images
    images: [{
      url: String,
      height: Number,
      width: Number
    }],
    
    // External URLs
    external_urls: {
      spotify: String
    },
    
    // Genres and popularity
    genres: [String],
    popularity: { type: Number, min: 0, max: 100 },
    followers: {
      href: String,
      total: { type: Number, default: 0 }
    },
    
    // Legacy fields (for backward compatibility)
    bio: { type: String },
    image_url: { type: String },
    
    // Sync metadata
    last_synced: { type: Date, default: Date.now },
    sync_source: { type: String, default: 'spotify' }
  },
  { timestamps: true }
);

// Index for better search performance
artistSchema.index({ name: 'text', genres: 'text' });
artistSchema.index({ popularity: -1 });
artistSchema.index({ 'followers.total': -1 });

export default mongoose.model('Artist', artistSchema);
