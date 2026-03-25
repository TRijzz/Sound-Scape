import mongoose from 'mongoose';

const artistSchema = new mongoose.Schema(
  {
    // Spotify fields - sparse unique index allows multiple null values
    spotify_id: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, index: true },
    display_name: { type: String, trim: true },
    
    // Images
    images: [{
      url: String,
      height: Number,
      width: Number
    }],
    cover_image_url: { type: String, trim: true },
    
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

    // Discovery and admin metadata
    tags: [{ type: String, index: true }],
    mood_tags: [{ type: String, index: true }],
    language: { type: String, trim: true, index: true },
    country: { type: String, trim: true, index: true },
    region: { type: String, trim: true, index: true },
    is_featured: { type: Boolean, default: false, index: true },
    is_visible: { type: Boolean, default: true, index: true },
    publish_status: {
      type: String,
      enum: ['published', 'draft', 'hidden'],
      default: 'published',
      index: true
    },
    hidden_reason: { type: String, trim: true },
    priority_score: { type: Number, default: 0, index: true },
    is_verified: { type: Boolean, default: false, index: true },
    social_links: {
      instagram: { type: String, trim: true },
      x: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      youtube: { type: String, trim: true },
      website: { type: String, trim: true }
    },
    external_ids: {
      spotify: { type: String, trim: true },
      apple_music: { type: String, trim: true },
      musicbrainz: { type: String, trim: true }
    },

    // Lightweight audit info
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_edited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_edited_at: { type: Date },
    
    // Sync metadata
    last_synced: { type: Date, default: Date.now },
    sync_source: { type: String, default: 'spotify' }
  },
  { timestamps: true }
);

// Index for better search performance
artistSchema.index(
  { name: 'text', genres: 'text' },
  { language_override: 'search_language' }
);
artistSchema.index({ popularity: -1 });
artistSchema.index({ 'followers.total': -1 });
artistSchema.index({ is_visible: 1, is_featured: 1, priority_score: -1 });

export default mongoose.model('Artist', artistSchema);
