import mongoose from 'mongoose';

const songSchema = new mongoose.Schema(
  {
    // Spotify fields
    spotify_id: { type: String, unique: true, index: true },
    name: { type: String, required: true, index: true },
    
    // Legacy field for backward compatibility
    title: { type: String, index: true },
    
    // Relationships
    artists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }],
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
    
    // Track details
    duration_ms: { type: Number, required: true },
    track_number: { type: Number },
    disc_number: { type: Number, default: 1 },
    explicit: { type: Boolean, default: false },
    
    // Audio features (can be populated from Spotify Audio Features API)
    audio_features: {
      danceability: { type: Number, min: 0, max: 1 },
      energy: { type: Number, min: 0, max: 1 },
      key: { type: Number, min: 0, max: 11 },
      loudness: { type: Number },
      mode: { type: Number, enum: [0, 1] },
      speechiness: { type: Number, min: 0, max: 1 },
      acousticness: { type: Number, min: 0, max: 1 },
      instrumentalness: { type: Number, min: 0, max: 1 },
      liveness: { type: Number, min: 0, max: 1 },
      valence: { type: Number, min: 0, max: 1 },
      tempo: { type: Number },
      time_signature: { type: Number }
    },
    
    // External URLs
    external_urls: {
      spotify: String
    },
    
    // Preview
    preview_url: String,
    
    // Popularity
    popularity: { type: Number, min: 0, max: 100 },
    
    // Legacy fields (for backward compatibility)
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist' },
    duration: { type: Number },
    cover_art_url: { type: String },
    audio_url: { type: String },
    lyrics: { type: String },
    play_count: { type: Number, default: 0 },
    
    // Sync metadata
    last_synced: { type: Date, default: Date.now },
    sync_source: { type: String, default: 'spotify' }
  },
  { timestamps: true }
);

// Index for better search performance
songSchema.index({ name: 'text' });
songSchema.index({ popularity: -1 });
songSchema.index({ 'audio_features.tempo': 1 });
songSchema.index({ 'audio_features.energy': 1 });
songSchema.index({ 'audio_features.valence': 1 });

// Virtual for duration in seconds
songSchema.virtual('duration_seconds').get(function() {
  return Math.floor(this.duration_ms / 1000);
});

// Ensure virtual fields are serialized
songSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Song', songSchema);
