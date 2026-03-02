import mongoose from 'mongoose';

const genreSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      enum: ['HipHop', 'Pop', 'Rock', 'Jazz', 'Other'] // Predefined list from user requirement
    },
    slug: { type: String, unique: true, index: true },
    description: { type: String },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

genreSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

export default mongoose.model('Genre', genreSchema);
