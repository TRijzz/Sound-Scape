import Song from '../models/Song.js';
import {
  createTaxonomyEntry,
  displayNameToCollectionName,
  getCollectionNames,
  getTaxonomyDb
} from './taxonomyStore.js';

const cleanName = (value = '', fallback = 'Uncategorized') => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const buildSongCopy = (song) => {
  const genreName = cleanName(song.genre);
  const categoryName = cleanName(song.category);

  return {
    ...song,
    genre_label: genreName,
    category_label: categoryName,
    source_database: 'vinyl_demo',
    source_collection: 'songs'
  };
};

const ensureTaxonomyCollection = async (dbName, label) => {
  const safeLabel = cleanName(label);
  const existingCollections = await getCollectionNames(dbName);
  const collectionName = displayNameToCollectionName(safeLabel, existingCollections);

  if (!existingCollections.includes(collectionName)) {
    await createTaxonomyEntry(dbName, { name: safeLabel }, dbName === 'genre' ? { is_active: true } : { is_public: true });
  }

  return displayNameToCollectionName(safeLabel, await getCollectionNames(dbName));
};

const removeSongFromTaxonomyDb = async (dbName, songId) => {
  const db = getTaxonomyDb(dbName);
  const collections = await getCollectionNames(dbName);

  await Promise.all(
    collections.map((collectionName) =>
      db.collection(collectionName).deleteMany({ _id: songId })
    )
  );
};

export const mirrorSongToTaxonomyDbs = async (songId) => {
  const song = await Song.findById(songId).lean();
  if (!song) {
    return;
  }

  const genreName = cleanName(song.genre);
  const categoryName = cleanName(song.category);

  const [genreCollectionName, categoryCollectionName] = await Promise.all([
    ensureTaxonomyCollection('genre', genreName),
    ensureTaxonomyCollection('categories', categoryName)
  ]);

  await Promise.all([
    removeSongFromTaxonomyDb('genre', song._id),
    removeSongFromTaxonomyDb('categories', song._id)
  ]);

  const doc = buildSongCopy(song);
  const genreDb = getTaxonomyDb('genre');
  const categoryDb = getTaxonomyDb('categories');

  await Promise.all([
    genreDb.collection(genreCollectionName).insertOne(doc),
    categoryDb.collection(categoryCollectionName).insertOne(doc)
  ]);
};

export const removeSongFromTaxonomyDbs = async (songId) => {
  await Promise.all([
    removeSongFromTaxonomyDb('genre', songId),
    removeSongFromTaxonomyDb('categories', songId)
  ]);
};
