import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ADMIN_DB_NAME = 'admin';
const ADMIN_COLLECTION_NAME = 'admin';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    is_active: { type: Boolean, default: true },
    last_login_at: { type: Date },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const adminConnection = mongoose.connection.useDb(ADMIN_DB_NAME, { useCache: true });

export default adminConnection.models.Admin || adminConnection.model('Admin', adminSchema, ADMIN_COLLECTION_NAME);
