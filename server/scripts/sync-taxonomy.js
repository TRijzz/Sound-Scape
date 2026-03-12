import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';
import Genre from '../src/models/Genre.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const curatedGenres = [
  'Afrobeats',
  'Afropiano',
  'Alternative',
  'Alternative Rock',
  'Amapiano',
  'Arabic Hip Hop',
  'Bachata',
  'Blues',
  'Bollywood',
  'Brazilian Funk',
  'Classical',
  'Contemporary R&B',
  'Country',
  'Dance',
  'Dancehall',
  'Disco',
  'Drill',
  'Dubstep',
  'EDM',
  'Electronic',
  'Emo',
  'Folk',
  'Funk',
  'Funk De Bh',
  'Gospel',
  'Grime',
  'Hip Hop',
  'House',
  'Hyperpop',
  'Indie',
  'Indie Rock',
  'Jazz',
  'K-Pop',
  'Kizomba',
  'Latin',
  'Lo-Fi',
  'Metal',
  'Moroccan Pop',
  'Moroccan Rap',
  'Neo Soul',
  'Nepali',
  'Nepali Pop',
  'Other',
  'Phonk',
  'Pop',
  'Punk',
  'R&B',
  'Rap',
  'Reggae',
  'Reggaeton',
  'Rock',
  'Singer-Songwriter',
  'Singeli',
  'Soft Pop',
  'Soul',
  'Synthpop',
  'Techno',
  'Trap',
  'Uncategorized'
];

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const normalizeName = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'r&b' || lower === 'r&b,') return 'R&B';
      if (lower === 'edm') return 'EDM';
      if (lower === 'k-pop') return 'K-Pop';
      if (lower === 'lo-fi') return 'Lo-Fi';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
};

const keyFor = (value) => slugify(String(value || '').replace(/and/gi, '&'));

const syncCollection = async (Model, names, options) => {
  const docs = await Model.find().lean();
  const docMap = new Map();

  for (const doc of docs) {
    const keys = [keyFor(doc.name), keyFor(doc.slug)].filter(Boolean);
    for (const key of keys) {
      if (!docMap.has(key)) {
        docMap.set(key, doc);
      }
    }
  }

  for (const rawName of names) {
    const name = normalizeName(rawName);
    const slug = slugify(name);
    const existing = docMap.get(keyFor(name)) || docMap.get(keyFor(slug));

    if (existing) {
      await Model.updateOne(
        { _id: existing._id },
        {
          $set: {
            name,
            slug,
            ...options.update
          }
        },
        { runValidators: true }
      );
      continue;
    }

    const created = await Model.create({
      name,
      slug,
      ...options.insert,
      ...options.update
    });

    const plain = created.toObject();
    docMap.set(keyFor(name), plain);
    docMap.set(keyFor(slug), plain);
  }
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existingCategories = await Category.find().select('name').lean();
  const taxonomyNames = Array.from(
    new Set(
      [...curatedGenres, ...existingCategories.map((category) => category.name)]
        .map((name) => normalizeName(name))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

  await syncCollection(Category, taxonomyNames, {
    insert: { description: 'Auto-generated category' },
    update: { is_public: true }
  });

  await Category.updateMany({}, { $set: { is_public: true } });

  await syncCollection(Genre, taxonomyNames, {
    insert: { description: 'Auto-generated genre' },
    update: { is_active: true }
  });

  const [categoryCount, publicCategoryCount, genreCount] = await Promise.all([
    Category.countDocuments(),
    Category.countDocuments({ is_public: true }),
    Genre.countDocuments({ is_active: true })
  ]);

  console.log(JSON.stringify({ categoryCount, publicCategoryCount, genreCount }, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
