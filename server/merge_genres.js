
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function mergeDuplicateGenres() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
    const baseUri = mongoUri.substring(0, mongoUri.lastIndexOf('/') + 1);
    const genreDbUri = baseUri + 'genre';

    console.log(`📡 Connecting to 'genre' database: ${genreDbUri}`);
    const genreConn = await mongoose.createConnection(genreDbUri).asPromise();
    console.log('✓ Connected');

    // 1. Define the merge plan
    // We'll move everything into the cleaner 'HipHop' collection
    const mergePlan = {
      'Hip_Hop': 'HipHop',
      'rap': 'HipHop'
    };

    for (const [source, target] of Object.entries(mergePlan)) {
      const sourceCol = genreConn.collection(source);
      const targetCol = genreConn.collection(target);

      const songs = await sourceCol.find({}).toArray();
      
      if (songs.length > 0) {
        console.log(`📂 Found ${songs.length} songs in collection "${source}". Moving to "${target}"...`);
        
        // Move songs
        await targetCol.insertMany(songs);
        
        // Delete old collection
        await sourceCol.drop();
        console.log(`✅ Collection "${source}" merged and deleted.`);
      } else {
        console.log(`ℹ️ Collection "${source}" is already empty or doesn't exist.`);
      }
    }

    // 2. Report final counts
    const finalCol = genreConn.collection('HipHop');
    const finalCount = await finalCol.countDocuments();
    console.log(`\n📊 Final "HipHop" collection now contains ${finalCount} songs.`);

    console.log('\n✅ Merging complete. Duplicate collections have been cleaned up.');
    
    await genreConn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during merge:', err);
    process.exit(1);
  }
}

mergeDuplicateGenres();
