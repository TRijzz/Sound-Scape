import mongoose from 'mongoose';

const META_COLLECTION = '__taxonomy_meta';

const DISPLAY_NAME_OVERRIDES = {
  hiphop: 'HipHop',
  hiphoprap: 'HipHop Rap',
  funkrock: 'Funk Rock',
  softpop: 'Soft Pop',
  kpop: 'K-Pop',
  lofi: 'Lo-Fi',
  randb: 'R&B',
  contemporaryrandb: 'Contemporary R&B',
  singersongwriter: 'Singer-songwriter',
  hiphopessentials: 'Hip-Hop Essentials'
};

const COLLECTION_NAME_OVERRIDES = {
  hiphop: 'HipHop',
  hiphoprap: 'HipHop_Rap',
  funkrock: 'Funk_Rock',
  softpop: 'soft_pop',
  kpop: 'K_Pop',
  lofi: 'Lo_Fi',
  randb: 'RAndB',
  contemporaryrandb: 'Contemporary_RAndB',
  singersongwriter: 'Singer_songwriter',
  hiphopessentials: 'Hip_Hop_Essentials'
};

const normalizeKey = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '')
  .trim();

const titleize = (value = '') => String(value)
  .split(/[_\s-]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');

const getDb = (dbName) => {
  const client = mongoose.connection.getClient();
  if (!client) {
    throw new Error('Mongo client is not connected');
  }
  return client.db(dbName);
};

const getMetaCollection = (dbName) => getDb(dbName).collection(META_COLLECTION);

export const slugifyTaxonomyName = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');

export const getTaxonomyDb = (dbName) => getDb(dbName);

export const getCollectionNames = async (dbName) => {
  const collections = await getDb(dbName).listCollections({}, { nameOnly: true }).toArray();
  return collections
    .map((collection) => collection.name)
    .filter((name) => name !== META_COLLECTION)
    .sort((left, right) => left.localeCompare(right));
};

export const collectionNameToDisplayName = (collectionName = '') => {
  const key = normalizeKey(collectionName);
  if (DISPLAY_NAME_OVERRIDES[key]) {
    return DISPLAY_NAME_OVERRIDES[key];
  }

  const raw = String(collectionName).replace(/_/g, ' ').trim();
  const titleized = titleize(raw)
    .replace(/\bAnd\b/g, '&')
    .replace(/\bR And B\b/g, 'R&B')
    .replace(/\bK Pop\b/g, 'K-Pop')
    .replace(/\bLo Fi\b/g, 'Lo-Fi');

  return titleized || collectionName;
};

export const displayNameToCollectionName = (name = '', existingNames = []) => {
  const key = normalizeKey(name);
  const matched = existingNames.find((candidate) => normalizeKey(candidate) === key);
  if (matched) {
    return matched;
  }

  if (COLLECTION_NAME_OVERRIDES[key]) {
    return COLLECTION_NAME_OVERRIDES[key];
  }

  const sanitized = String(name)
    .trim()
    .replace(/&/g, 'And')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return sanitized || 'Uncategorized';
};

export const listTaxonomyEntries = async (dbName, { search = '' } = {}) => {
  const [collectionNames, metaDocs] = await Promise.all([
    getCollectionNames(dbName),
    getMetaCollection(dbName).find({}).toArray()
  ]);

  const metaByCollection = new Map(metaDocs.map((doc) => [doc.collectionName, doc]));
  const query = String(search || '').trim().toLowerCase();

  return collectionNames
    .map((collectionName) => {
      const meta = metaByCollection.get(collectionName) || {};
      const name = meta.name || collectionNameToDisplayName(collectionName);
      return {
        _id: collectionName,
        id: collectionName,
        collectionName,
        name,
        slug: slugifyTaxonomyName(name),
        description: meta.description || '',
        cover_image: meta.cover_image || '',
        is_public: meta.is_public !== false,
        is_active: meta.is_active !== false
      };
    })
    .filter((entry) => !query || entry.name.toLowerCase().includes(query) || entry.collectionName.toLowerCase().includes(query))
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const getTaxonomyEntry = async (dbName, id) => {
  const collectionName = decodeURIComponent(id);
  const collectionNames = await getCollectionNames(dbName);
  if (!collectionNames.includes(collectionName)) {
    return null;
  }

  const meta = await getMetaCollection(dbName).findOne({ collectionName });
  const name = meta?.name || collectionNameToDisplayName(collectionName);

  return {
    _id: collectionName,
    id: collectionName,
    collectionName,
    name,
    slug: slugifyTaxonomyName(name),
    description: meta?.description || '',
    cover_image: meta?.cover_image || '',
    is_public: meta?.is_public !== false,
    is_active: meta?.is_active !== false
  };
};

export const createTaxonomyEntry = async (dbName, payload = {}, defaults = {}) => {
  const existingNames = await getCollectionNames(dbName);
  const name = String(payload.name || '').trim();
  if (!name) {
    throw new Error('Name is required');
  }

  const collectionName = displayNameToCollectionName(name, existingNames);
  if (existingNames.includes(collectionName)) {
    throw new Error('Entry already exists');
  }

  const db = getDb(dbName);
  await db.createCollection(collectionName);

  await getMetaCollection(dbName).updateOne(
    { collectionName },
    {
      $set: {
        collectionName,
        name,
        description: payload.description || '',
        cover_image: payload.cover_image || '',
        ...defaults,
        ...(payload.is_public !== undefined ? { is_public: !!payload.is_public } : {}),
        ...(payload.is_active !== undefined ? { is_active: !!payload.is_active } : {})
      }
    },
    { upsert: true }
  );

  return getTaxonomyEntry(dbName, collectionName);
};

export const updateTaxonomyEntry = async (dbName, id, payload = {}, defaults = {}) => {
  const current = await getTaxonomyEntry(dbName, id);
  if (!current) {
    throw new Error('Entry not found');
  }

  const existingNames = await getCollectionNames(dbName);
  const nextName = String(payload.name || current.name).trim() || current.name;
  const nextCollectionName = displayNameToCollectionName(
    nextName,
    existingNames.filter((name) => name !== current.collectionName)
  );

  const db = getDb(dbName);
  if (nextCollectionName !== current.collectionName) {
    await db.collection(current.collectionName).rename(nextCollectionName);
  }

  await getMetaCollection(dbName).deleteMany({ collectionName: current.collectionName });
  await getMetaCollection(dbName).updateOne(
    { collectionName: nextCollectionName },
    {
      $set: {
        collectionName: nextCollectionName,
        name: nextName,
        description: payload.description ?? current.description ?? '',
        cover_image: payload.cover_image ?? current.cover_image ?? '',
        ...defaults,
        ...(payload.is_public !== undefined ? { is_public: !!payload.is_public } : { is_public: current.is_public }),
        ...(payload.is_active !== undefined ? { is_active: !!payload.is_active } : { is_active: current.is_active })
      }
    },
    { upsert: true }
  );

  return {
    previousName: current.name,
    previousCollectionName: current.collectionName,
    entry: await getTaxonomyEntry(dbName, nextCollectionName)
  };
};

export const deleteTaxonomyEntry = async (dbName, id) => {
  const entry = await getTaxonomyEntry(dbName, id);
  if (!entry) {
    return null;
  }

  await getDb(dbName).collection(entry.collectionName).drop().catch((error) => {
    if (error?.codeName !== 'NamespaceNotFound') {
      throw error;
    }
  });
  await getMetaCollection(dbName).deleteMany({ collectionName: entry.collectionName });
  return entry;
};
