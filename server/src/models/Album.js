import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema(
  {
    // Spotify fields
    spotify_id: { type: String, unique: true, index: true },
    name: { type: String, required: true, index: true },
    album_type: { type: String, enum: ['album', 'single', 'compilation'] },
    total_tracks: { type: Number },
    release_date: { type: String },
    release_date_precision: { type: String, enum: ['year', 'month', 'day'] },
    
    // Artists relationship
    artists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }],
    
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
    
    // Additional metadata
    label: String,
    copyrights: [{
      text: String,
      type: String
    }],
    
    // Sync metadata
    last_synced: { type: Date, default: Date.now },
    sync_source: { type: String, default: 'spotify' }
  },
  { timestamps: true }
);

// Index for better search performance
albumSchema.index({ name: 'text', genres: 'text' });
albumSchema.index({ popularity: -1 });
albumSchema.index({ release_date: -1 });

export default mongoose.model('Album', albumSchema);
