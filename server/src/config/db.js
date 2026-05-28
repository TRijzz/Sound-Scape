import mongoose from 'mongoose';
import Song from '../models/Song.js';

const fixIndexes = async () => {
  try {
    const db = mongoose.connection.db;

    // Drop existing non-sparse spotify_id indexes if they exist.
    const collections = ['artists', 'albums', 'songs'];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();

        const spotifyIndex = indexes.find((idx) => idx.key && idx.key.spotify_id === 1 && !idx.sparse);

        if (spotifyIndex) {
          await collection.dropIndex(spotifyIndex.name);
          console.log(`Dropped non-sparse spotify_id index from ${collectionName}`);
        }

        if (collectionName === 'songs') {
          const legacySongTextIndex = indexes.find(
            (idx) => idx.key && idx.key._fts === 'text' && idx.language_override !== 'search_language'
          );

          if (legacySongTextIndex) {
            await collection.dropIndex(legacySongTextIndex.name);
            console.log('Dropped legacy songs text index with conflicting language override');
          }
        }
      } catch (err) {
        if (err.code !== 27) {
          console.error(`Error fixing indexes for ${collectionName}:`, err.message);
        }
      }
    }

    try {
      await Song.syncIndexes();
      console.log('Synced Song indexes');
    } catch (syncErr) {
      console.error('Error syncing Song indexes:', syncErr.message);
    }
  } catch (error) {
    console.error('Error fixing indexes:', error.message);
  }
};

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/vinyl_demo';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');

    await fixIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Make sure MongoDB is running and the connection string is correct.');
    console.error('Connection string:', process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/vinyl_demo');
    process.exit(1);
  }
};
