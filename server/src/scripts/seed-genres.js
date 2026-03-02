import mongoose from 'mongoose';
import Genre from '../models/Genre.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const genres = [
  { name: 'HipHop', description: 'Hip hop music, also known as rap music' },
  { name: 'Pop', description: 'Popular music is a genre of popular music that originated in its modern form during the mid-1950s' },
  { name: 'Rock', description: 'Rock music is a broad genre of popular music that originated as "rock and roll" in the United States' },
  { name: 'Jazz', description: 'Jazz is a music genre that originated in the African-American communities of New Orleans' },
  { name: 'Other', description: 'Other genres' }
];

const seedGenres = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
    console.log(`Connecting to: ${uri}`);
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB');

    for (const genreData of genres) {
      await Genre.findOneAndUpdate(
        { name: genreData.name },
        genreData,
        { upsert: true, new: true }
      );
      console.log(`✓ Seeded genre: ${genreData.name}`);
    }

    console.log('✓ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedGenres();
