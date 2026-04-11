import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config();

const normalizeIds = (items = []) => Array.from(new Set(items.map((item) => String(item)).filter(Boolean)));

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const collection = mongoose.connection.db.collection('liked_songs');
  const exists = await collection.countDocuments({}, { limit: 1 }).catch(() => 0);

  if (!exists) {
    console.log('No liked_songs documents found. Nothing to migrate.');
    await mongoose.connection.close();
    return;
  }

  const likedEntries = await collection.find({}).toArray();
  const likesByUser = new Map();

  likedEntries.forEach((entry) => {
    const userId = String(entry.user || '');
    const songId = String(entry.song || '');
    if (!userId || !songId) return;
    const current = likesByUser.get(userId) || [];
    current.push(songId);
    likesByUser.set(userId, current);
  });

  for (const [userId, songIds] of likesByUser.entries()) {
    const user = await User.findById(userId).select('likedSongs');
    if (!user) continue;

    user.likedSongs = normalizeIds([...(user.likedSongs || []).map(String), ...songIds]);
    await user.save();
  }

  await collection.drop().catch((error) => {
    if (error?.codeName !== 'NamespaceNotFound') {
      throw error;
    }
  });

  console.log(`Migrated likes for ${likesByUser.size} users and dropped liked_songs collection.`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('Failed to migrate liked songs:', error);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
