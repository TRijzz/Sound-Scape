
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo');
    console.log('Connected');
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: 'songs' }).toArray();
    if (collections.length > 0) {
      const song = await db.collection('songs').findOne({});
      console.log('Sample Song Genre Type:', typeof song.genre);
      console.log('Sample Song Genre Value:', song.genre);
    } else {
      console.log('Songs collection not found');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
