import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true, select: false },
    avatar_url: { type: String },
    bio: { type: String, default: '' },
    username: { type: String },
    googleId: { type: String, index: true },
    refreshTokenHash: { type: String, select: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false, index: true },
    emailVerificationExpires: { type: Date, select: false },
    emailVerificationCodeHash: { type: String, select: false, index: true },
    emailVerificationCodeExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false, index: true },
    passwordResetExpires: { type: Date, select: false },
    passwordChangeOtpHash: { type: String, select: false, index: true },
    passwordChangeOtpExpires: { type: Date, select: false },
    passwordChangeOtpAttempts: { type: Number, select: false, default: 0 },
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    followed_artists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }],
    followed_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    onboarded: { type: Boolean, default: false },
    preferred_genres: [{ type: String }],
    preferred_moods: [{ type: String }],
    preferred_languages: [{ type: String }],
    preferred_tags: [{ type: String }],
    purchased_vinyls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vinyl' }],
    active_vinyl: { type: mongoose.Schema.Types.ObjectId, ref: 'Vinyl' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {          // Passwords are converted into hashes
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {     //Compares login password with stored hash to verify user identity
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
