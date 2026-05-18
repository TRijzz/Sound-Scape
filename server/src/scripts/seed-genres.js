import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { displayNameToCollectionName } from '../utils/taxonomyStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const genres = [
  { name: 'HipHop', description: 'Hip hop music, also known as rap music' },
  { name: 'Pop', description: 'Popular music genre' },
  { name: 'Rock', description: 'Rock music genre' },
  { name: 'Jazz', description: 'Jazz music genre' },
  { name: 'Other', description: 'Other genres' }
];

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
const rootUri = mongoUri.replace(/\/[^/?]+(\?.*)?$/, '$1');

const client = new MongoClient(rootUri);

try {
  await client.connect();
  const db = client.db('genre');
  const existing = (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name);
  const meta = db.collection('__taxonomy_meta');

  for (const genre of genres) {
    const collectionName = displayNameToCollectionName(genre.name, existing);
    if (!existing.includes(collectionName)) {
      await db.createCollection(collectionName);
      existing.push(collectionName);
    }
    await meta.updateOne(
      { collectionName },
      { $set: { collectionName, name: genre.name, description: genre.description, is_active: true } },
      { upsert: true }
    );
    console.log(`Seeded genre collection: ${collectionName}`);
  }

  console.log('Genre database seeding completed successfully');
} catch (error) {
  console.error('Genre database seeding failed:', error);
  process.exitCode = 1;
} finally {
  await client.close();
}
