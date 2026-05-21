import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Song from '../models/Song.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '../../../reports');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';

const present = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((v) => present(v));
  return Boolean(value);
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

(async () => {
  await mongoose.connect(MONGO_URI);

  const songs = await Song.find({})
    .select('name genre genres mood category')
    .sort({ name: 1 })
    .lean();

  const rows = songs.map((s) => {
    const hasGenre = present(s.genre) || present(s.genres);
    const hasCategory = present(s.category);
    const hasMood = present(s.mood);
    return {
      name: s.name || '(unnamed)',
      hasGenre,
      hasCategory,
      hasMood,
      genreVal: present(s.genre)
        ? String(s.genre)
        : (Array.isArray(s.genres) ? s.genres.filter(Boolean).join('|') : ''),
      categoryVal: s.category || '',
      moodVal: s.mood || ''
    };
  });

  const fully = rows.filter((r) => r.hasGenre && r.hasCategory && r.hasMood);
  const empty = rows.filter((r) => !r.hasGenre && !r.hasCategory && !r.hasMood);
  const missingGenre = rows.filter((r) => !r.hasGenre);
  const missingCategory = rows.filter((r) => !r.hasCategory);
  const missingMood = rows.filter((r) => !r.hasMood);

  ensureDir(REPORT_DIR);
  const reportPath = path.join(REPORT_DIR, 'song-taxonomy-report.txt');

  const lines = [];
  lines.push(`Song taxonomy report - generated ${new Date().toISOString()}`);
  lines.push(`Total songs: ${rows.length}`);
  lines.push('');
  lines.push('=== SUMMARY ===');
  lines.push(`Fully assigned (genre + category + mood): ${fully.length}`);
  lines.push(`No taxonomy at all: ${empty.length}`);
  lines.push(`Missing genre: ${missingGenre.length}`);
  lines.push(`Missing category: ${missingCategory.length}`);
  lines.push(`Missing mood: ${missingMood.length}`);
  lines.push('');

  const section = (title, list) => {
    lines.push('');
    lines.push(`=== ${title} (${list.length}) ===`);
    for (const r of list) {
      lines.push(`- "${r.name}" | genre=${r.genreVal || '-'} | category=${r.categoryVal || '-'} | mood=${r.moodVal || '-'}`);
    }
  };

  section('FULLY ASSIGNED', fully);
  section('NO TAXONOMY (missing all three)', empty);
  section('MISSING GENRE', missingGenre);
  section('MISSING CATEGORY', missingCategory);
  section('MISSING MOOD', missingMood);

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');

  console.log(`Total songs: ${rows.length}`);
  console.log(`Fully assigned: ${fully.length}`);
  console.log(`No taxonomy: ${empty.length}`);
  console.log(`Missing genre: ${missingGenre.length}`);
  console.log(`Missing category: ${missingCategory.length}`);
  console.log(`Missing mood: ${missingMood.length}`);
  console.log('');
  console.log(`Full report written to: ${reportPath}`);

  console.log('\n--- FULLY ASSIGNED ---');
  fully.forEach((r) => console.log(`- ${r.name} | genre=${r.genreVal} | category=${r.categoryVal} | mood=${r.moodVal}`));

  console.log('\n--- NO TAXONOMY (all three missing) ---');
  empty.forEach((r) => console.log(`- ${r.name}`));

  console.log('\n--- MISSING GENRE ---');
  missingGenre.forEach((r) => console.log(`- ${r.name} | category=${r.categoryVal || '-'} | mood=${r.moodVal || '-'}`));

  console.log('\n--- MISSING CATEGORY (first 50 of ' + missingCategory.length + ') ---');
  missingCategory.slice(0, 50).forEach((r) => console.log(`- ${r.name} | genre=${r.genreVal || '-'} | mood=${r.moodVal || '-'}`));
  if (missingCategory.length > 50) console.log(`... +${missingCategory.length - 50} more in report file`);

  console.log('\n--- MISSING MOOD (first 20 of ' + missingMood.length + ') ---');
  missingMood.slice(0, 20).forEach((r) => console.log(`- ${r.name}`));
  if (missingMood.length > 20) console.log(`... +${missingMood.length - 20} more in report file`);

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
