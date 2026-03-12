import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
const rootUri = mongoUri.replace(/\/[^/?]+(\?.*)?$/, '$1');

const normalizeLabel = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '')
  .trim();

const cleanName = (value) => String(value || '').trim();

const fallbackCollectionName = (label) => cleanName(label)
  .replace(/&/g, 'And')
  .replace(/[^A-Za-z0-9]+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_|_$/g, '') || 'Uncategorized';

const resolveCollectionName = (label, existingCollections) => {
  const normalized = normalizeLabel(label);
  const existing = existingCollections.find((name) => normalizeLabel(name) === normalized);
  return existing || fallbackCollectionName(label);
};

const resolveGenreName = (song, genreNamesById) => {
  const direct = song.genre;
  if (direct && typeof direct === 'string' && genreNamesById.has(direct)) {
    return genreNamesById.get(direct);
  }
  if (direct && typeof direct === 'object' && direct.toString && genreNamesById.has(direct.toString())) {
    return genreNamesById.get(direct.toString());
  }
  if (typeof direct === 'string' && !/^[a-f\d]{24}$/i.test(direct)) {
    return cleanName(direct);
  }
  if (Array.isArray(song.genres) && song.genres.length > 0) {
    const first = song.genres[0];
    if (typeof first === 'string' && genreNamesById.has(first)) {
      return genreNamesById.get(first);
    }
    return cleanName(first);
  }
  return 'Uncategorized';
};

const resolveCategoryName = (song) => cleanName(song.category) || 'Uncategorized';

const buildSongCopy = (song, genreName, categoryName) => ({
  ...song,
  genre_label: genreName,
  category_label: categoryName,
  source_database: 'vinyl_demo',
  source_collection: 'songs'
});

const syncCollections = async (targetDb, sourceNames, songsByLabel, existingCollections) => {
  const stats = [];

  for (const label of sourceNames) {
    const collectionName = resolveCollectionName(label, existingCollections);
    const collectionExists = existingCollections.includes(collectionName);
    if (!collectionExists) {
      await targetDb.createCollection(collectionName);
      existingCollections.push(collectionName);
    }

    const collection = targetDb.collection(collectionName);
    const docs = songsByLabel.get(label) || [];

    await collection.deleteMany({});
    if (docs.length > 0) {
      await collection.insertMany(docs, { ordered: false });
    }

    stats.push({ label, collectionName, count: docs.length });
  }

  return stats;
};

const client = new MongoClient(rootUri);

try {
  await client.connect();

  const mainDb = client.db('vinyl_demo');
  const genreDb = client.db('genre');
  const categoriesDb = client.db('categories');

  const [songs, genres, categories, existingGenreCollections, existingCategoryCollections] = await Promise.all([
    mainDb.collection('songs').find({}).toArray(),
    mainDb.collection('genres').find({}).project({ name: 1 }).toArray(),
    mainDb.collection('categories').find({}).project({ name: 1 }).toArray(),
    genreDb.listCollections({}, { nameOnly: true }).toArray(),
    categoriesDb.listCollections({}, { nameOnly: true }).toArray()
  ]);

  const genreNamesById = new Map(genres.map((genre) => [String(genre._id), cleanName(genre.name)]));

  const existingGenreNames = existingGenreCollections.map((collection) => collection.name);
  const existingCategoryNames = existingCategoryCollections.map((collection) => collection.name);

  const genreNameSet = new Set([
    ...genres.map((genre) => cleanName(genre.name)),
    ...existingGenreNames,
    ...songs.map((song) => resolveGenreName(song, genreNamesById))
  ].filter(Boolean));

  const categoryNameSet = new Set([
    ...categories.map((category) => cleanName(category.name)),
    ...existingCategoryNames,
    ...songs.map((song) => resolveCategoryName(song))
  ].filter(Boolean));

  const genreNames = Array.from(genreNameSet).sort((left, right) => left.localeCompare(right));
  const categoryNames = Array.from(categoryNameSet).sort((left, right) => left.localeCompare(right));

  const songsByGenre = new Map(genreNames.map((name) => [name, []]));
  const songsByCategory = new Map(categoryNames.map((name) => [name, []]));

  for (const song of songs) {
    const genreName = resolveGenreName(song, genreNamesById);
    const categoryName = resolveCategoryName(song);
    const songCopy = buildSongCopy(song, genreName, categoryName);

    if (!songsByGenre.has(genreName)) songsByGenre.set(genreName, []);
    songsByGenre.get(genreName).push(songCopy);

    if (!songsByCategory.has(categoryName)) songsByCategory.set(categoryName, []);
    songsByCategory.get(categoryName).push(songCopy);
  }

  for (const categoryName of categoryNames) {
    const docs = songsByCategory.get(categoryName) || [];
    if (docs.length === 0 && songsByGenre.has(categoryName)) {
      songsByCategory.set(categoryName, songsByGenre.get(categoryName));
    }
  }

  const [genreStats, categoryStats] = await Promise.all([
    syncCollections(genreDb, genreNames, songsByGenre, existingGenreNames),
    syncCollections(categoriesDb, categoryNames, songsByCategory, existingCategoryNames)
  ]);

  console.log(JSON.stringify({
    genreCollectionCount: genreStats.length,
    categoryCollectionCount: categoryStats.length,
    populatedGenreCollections: genreStats.filter((item) => item.count > 0).length,
    populatedCategoryCollections: categoryStats.filter((item) => item.count > 0).length,
    sampleGenreCollections: genreStats.slice(0, 15),
    sampleCategoryCollections: categoryStats.slice(0, 15)
  }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.close();
}
