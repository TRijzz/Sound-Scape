import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';

async function fixIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop existing spotify_id indexes
    try {
      await db.collection('artists').dropIndex('spotify_id_1');
      console.log('✓ Dropped spotify_id_1 index from artists');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ Index spotify_id_1 does not exist on artists');
      } else {
        console.error('Error dropping artists index:', err.message);
      }
    }

    try {
      await db.collection('albums').dropIndex('spotify_id_1');
      console.log('✓ Dropped spotify_id_1 index from albums');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ Index spotify_id_1 does not exist on albums');
      } else {
        console.error('Error dropping albums index:', err.message);
      }
    }

    try {
      await db.collection('songs').dropIndex('spotify_id_1');
      console.log('✓ Dropped spotify_id_1 index from songs');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ Index spotify_id_1 does not exist on songs');
      } else {
        console.error('Error dropping songs index:', err.message);
      }
    }

    // The sparse indexes will be created automatically when the models are loaded
    console.log('\n✓ Indexes dropped. Sparse indexes will be recreated on next server start.');
    console.log('  Restart your server to recreate the indexes with sparse: true');

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();

