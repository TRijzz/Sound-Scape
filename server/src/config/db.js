import mongoose from 'mongoose';

const fixIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Drop existing non-sparse spotify_id indexes if they exist
    const collections = ['artists', 'albums', 'songs'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        
        // Find and drop non-sparse spotify_id index
        const spotifyIndex = indexes.find(idx => 
          idx.key && idx.key.spotify_id === 1 && !idx.sparse
        );
        
        if (spotifyIndex) {
          await collection.dropIndex(spotifyIndex.name);
          console.log(`✓ Dropped non-sparse spotify_id index from ${collectionName}`);
        }
      } catch (err) {
        if (err.code !== 27) { // 27 = IndexNotFound
          console.error(`Error fixing indexes for ${collectionName}:`, err.message);
        }
      }
    }
    
    // The sparse indexes will be created automatically by Mongoose when models are loaded
  } catch (error) {
    console.error('Error fixing indexes:', error.message);
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('MongoDB connected');
  
  // Fix indexes after connection
  await fixIndexes();
};
