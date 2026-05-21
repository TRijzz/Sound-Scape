import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_DIR = path.resolve(__dirname, '../../../reports');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
const DRY_RUN = process.argv.includes('--dry');

// --------- ALLOWED VOCABULARY (must match existing distinct values) ----------
const ALLOWED_GENRES = new Set([
  'Alternative Pop','Alternative R&B','Alternative Rock','Amapiano','Brazilian Funk',
  'Contemporary','Electronic','Emo','Folk','Funk De Bh','Funk Rock','Grunge','Hard Rock',
  'Hip-Hop','HipHop','HipHop Rap','Industrial Hip-Hop','Instrumental','Nepali','Nepali Acoustic',
  'Nepali Hip-Hop','Nepali Indie','Nepali Pop','Other','Pop','R&B','Rap','Rock','Singer-songwriter',
  'Soft Pop','Soul','Soundtrack','Trap','Uncategorized'
]);

const ALLOWED_CATEGORIES = new Set([
  'Alternative Rock','Amapiano','Funk','Funk De Bh','HipHop','Nepali','Nepali Pop','Other',
  'Pop','R&B','Rap','Rock','Singer-songwriter','Soft Pop','Uncategorized'
]);

const ALLOWED_MOODS = new Set([
  'Chill','romantic','calm','emotional','experimental','introspective','nostalgic','poetic',
  'smooth','soulful','confident','dark','atmospheric','sad','upbeat','feel-good','energetic',
  'aggressive','Party','catchy','uplifting','positive','dance','motivational','empowering',
  'strong','gritty','street','raw','futuristic','groovy','soft','warm','heartfelt','hype',
  'celebratory','Dreamy','Vibey','Spiritual','Grand','Intense','laid-back','reflective',
  'moody','toxic','flex','rebellious','thoughtful','boss','soothing','vulnerable','creative',
  'deep','powerful','youthful','spacey','melancholic','cinematic','expressive','lyrical',
  'witty','vocal','bold','playful','real','classic','chaotic','versatile','funky','luxury',
  'high-energy','assertive','storytelling','sensual','rhythmic','innovative','psychedelic',
  'mellow','cold','minimal','menacing','intimate','triumphant','melodic','confessional',
  'literary','eerie','late-night','sun-soaked','wild','loud','dramatic','cathartic','angsty',
  'relatable','bright','vibrant','expansive','restless','lonely','rich','orchestral','abrasive',
  'luxurious','swaggering','ambitious','epic','personal','heavy','anguished','underground',
  'polished','glossy','varied','nocturnal','sleek','club-ready','healing','colorful','loose',
  'breezy','hopeful','tender','quiet','narrative','emotive','hungry','collaborative','early',
  'club','explicit','driving'
]);

const pick = (value, allowed, fallback) =>
  value && allowed.has(value) ? value : fallback;

// --------- ARTIST PROFILE KNOWLEDGE BASE ----------
// Hand-curated from training knowledge of these artists' styles.
const ARTIST_PROFILE = {
  'Nirvana':              { genre: 'Grunge',             category: 'Rock',             mood: 'angsty' },
  'Ed Sheeran':           { genre: 'Pop',                category: 'Singer-songwriter',mood: 'romantic' },
  'Red Hot Chili Peppers':{ genre: 'Funk Rock',          category: 'Alternative Rock', mood: 'groovy' },
  "Guns N' Roses":        { genre: 'Hard Rock',          category: 'Rock',             mood: 'rebellious' },
  'Kanye West':           { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'bold' },
  'Ye':                   { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'bold' },
  '¥$':                   { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'experimental' },
  'DONDA':                { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'Spiritual' },
  'KIDS SEE GHOSTS':      { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'experimental' },
  'DJ Khaled':            { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'hype' },
  'Drake':                { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'late-night' },
  'JAŸ-Z':                { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'swaggering' },
  'JAY-Z':                { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'swaggering' },
  'Lil Baby':             { genre: 'Trap',               category: 'HipHop',           mood: 'street' },
  'Lil Wayne':            { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'witty' },
  'Travis Scott':         { genre: 'Trap',               category: 'HipHop',           mood: 'atmospheric' },
  'Future':               { genre: 'Trap',               category: 'HipHop',           mood: 'menacing' },
  'Rick Ross':            { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'luxurious' },
  'Post Malone':          { genre: 'Hip-Hop',            category: 'HipHop',           mood: 'melancholic' },
  'Rich The Kid':         { genre: 'Trap',               category: 'HipHop',           mood: 'flex' },
  'PARTYNEXTDOOR':        { genre: 'R&B',                category: 'R&B',              mood: 'late-night' },
  'Ty Dolla $ign':        { genre: 'R&B',                category: 'R&B',              mood: 'smooth' },
  'The Weeknd':           { genre: 'R&B',                category: 'R&B',              mood: 'late-night' },
  'SZA':                  { genre: 'R&B',                category: 'R&B',              mood: 'introspective' },
  'Khalid':               { genre: 'R&B',                category: 'R&B',              mood: 'soft' },
  'Taylor Swift':         { genre: 'Pop',                category: 'Pop',              mood: 'narrative' },
  'Billie Eilish':        { genre: 'Alternative Pop',    category: 'Pop',              mood: 'moody' },

  // Nepali artists
  'Sajjan Raj Vaidya':    { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'poetic' },
  'Sushant KC':           { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'romantic' },
  'Yabesh Thapa':         { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'heartfelt' },
  'John Rai':             { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'soft' },
  'Bartika Eam Rai':      { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'reflective' },
  'Albatross':            { genre: 'Rock',               category: 'Rock',             mood: 'energetic' },
  'The Edge Band':        { genre: 'Rock',               category: 'Rock',             mood: 'classic' },
  'Tribal Rain':          { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'melodic' },
  'Sabin Rai':            { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'classic' },
  'Ciney Gurung':         { genre: 'Nepali',             category: 'Nepali',           mood: 'classic' },
  'Purna Rai':            { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'soothing' },
  'Sujan Chapagain':      { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'heartfelt' },
  'Rohit Shakya':         { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'mellow' },
  'Vek':                  { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'smooth' },
  'Bizen':                { genre: 'Nepali Hip-Hop',     category: 'HipHop',           mood: 'street' },
  'YABI The G.O.A.T':     { genre: 'Nepali Hip-Hop',     category: 'HipHop',           mood: 'confident' },
  'AXIX':                 { genre: 'Nepali Hip-Hop',     category: 'HipHop',           mood: 'energetic' },
  'Swar':                 { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'mellow' },
  'Nawaj Ansari':         { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'romantic' },
  'Chirag Khadka':        { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'soft' },
  'Samir Shrestha':       { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'introspective' },
  'Oasis Thapa':          { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'breezy' },
  'Swapnil Sharma':       { genre: 'Nepali Pop',         category: 'Nepali Pop',       mood: 'soft' },
  'ArtMandu':             { genre: 'Nepali Indie',       category: 'Nepali',           mood: 'creative' },
  'LIL Rock Look':        { genre: 'Nepali Hip-Hop',     category: 'HipHop',           mood: 'street' },
  'Rockheads':            { genre: 'Rock',               category: 'Rock',             mood: 'energetic' },
  'Jamesy':               { genre: 'Nepali Hip-Hop',     category: 'HipHop',           mood: 'gritty' },

  // DJ / Funk / Amapiano
  'Dj Thales Jql':        { genre: 'Brazilian Funk',     category: 'Funk De Bh',       mood: 'dance' },
  'Dj khalipha':          { genre: 'Amapiano',           category: 'Amapiano',         mood: 'groovy' },
  'DJ Bishow':            { genre: 'Electronic',         category: 'Other',            mood: 'club' },
  'Dj Khala':             { genre: 'Amapiano',           category: 'Amapiano',         mood: 'club' },
  'DJ DIDI':              { genre: 'Brazilian Funk',     category: 'Funk De Bh',       mood: 'dance' },

  'Dong':                 { genre: 'Nepali Hip-Hop',     category: 'HipHop',           mood: 'youthful' },
  'Were':                 { genre: 'Other',              category: 'Other',            mood: 'experimental' }
};

// Map raw Spotify-style genre tags → our DB vocabulary
const GENRE_KEYWORD_TO_DB = [
  // most specific first
  [/grunge/i,                 'Grunge'],
  [/funk\s*rock/i,            'Funk Rock'],
  [/hard\s*rock/i,            'Hard Rock'],
  [/alt(ernative)?\s*rock/i,  'Alternative Rock'],
  [/alt(ernative)?\s*pop/i,   'Alternative Pop'],
  [/alt(ernative)?\s*r&b/i,   'Alternative R&B'],
  [/industrial\s*hip/i,       'Industrial Hip-Hop'],
  [/trap/i,                   'Trap'],
  [/nepali\s*hip/i,           'Nepali Hip-Hop'],
  [/nepali\s*indie/i,         'Nepali Indie'],
  [/nepali\s*pop/i,           'Nepali Pop'],
  [/nepali\s*acoustic/i,      'Nepali Acoustic'],
  [/nepali/i,                 'Nepali'],
  [/amapiano|afropiano|singeli/i,'Amapiano'],
  [/funk\s*de\s*bh/i,         'Funk De Bh'],
  [/brazil(ian)?\s*funk/i,    'Brazilian Funk'],
  [/funk/i,                   'Funk Rock'],
  [/emo/i,                    'Emo'],
  [/folk/i,                   'Folk'],
  [/r&b|rnb|soul/i,           'R&B'],
  [/hip[\s-]?hop|rap|gospel\s*rap/i,'Hip-Hop'],
  [/electronic|house|edm|dance|techno/i,'Electronic'],
  [/instrumental|soundtrack|score/i,'Soundtrack'],
  [/singer[\s-]?songwriter|acoustic/i,'Singer-songwriter'],
  [/indie\s*pop/i,            'Alternative Pop'],
  [/indie/i,                  'Alternative Pop'],
  [/soft\s*pop/i,             'Soft Pop'],
  [/pop/i,                    'Pop'],
  [/rock/i,                   'Rock'],
  [/contemporary/i,           'Contemporary']
];

const GENRE_TO_CATEGORY = {
  'Hip-Hop': 'HipHop',
  'HipHop': 'HipHop',
  'HipHop Rap': 'HipHop',
  'Industrial Hip-Hop': 'HipHop',
  'Trap': 'HipHop',
  'Rap': 'Rap',
  'Nepali Hip-Hop': 'HipHop',
  'Nepali Pop': 'Nepali Pop',
  'Nepali Indie': 'Nepali',
  'Nepali Acoustic': 'Nepali',
  'Nepali': 'Nepali',
  'Pop': 'Pop',
  'Alternative Pop': 'Pop',
  'Soft Pop': 'Soft Pop',
  'Rock': 'Rock',
  'Hard Rock': 'Rock',
  'Grunge': 'Rock',
  'Alternative Rock': 'Alternative Rock',
  'Funk Rock': 'Funk',
  'Funk De Bh': 'Funk De Bh',
  'Brazilian Funk': 'Funk De Bh',
  'Amapiano': 'Amapiano',
  'R&B': 'R&B',
  'Alternative R&B': 'R&B',
  'Soul': 'R&B',
  'Electronic': 'Other',
  'Folk': 'Singer-songwriter',
  'Singer-songwriter': 'Singer-songwriter',
  'Soundtrack': 'Other',
  'Instrumental': 'Other',
  'Emo': 'Rock',
  'Contemporary': 'Pop',
  'Other': 'Other',
  'Uncategorized': 'Uncategorized'
};

const DEFAULT_MOOD_BY_GENRE = {
  'Grunge': 'angsty',
  'Hard Rock': 'energetic',
  'Rock': 'energetic',
  'Alternative Rock': 'introspective',
  'Funk Rock': 'groovy',
  'Brazilian Funk': 'dance',
  'Funk De Bh': 'dance',
  'Amapiano': 'groovy',
  'Hip-Hop': 'confident',
  'HipHop': 'confident',
  'HipHop Rap': 'confident',
  'Industrial Hip-Hop': 'experimental',
  'Trap': 'street',
  'Rap': 'gritty',
  'Nepali Hip-Hop': 'street',
  'Nepali Pop': 'romantic',
  'Nepali Indie': 'poetic',
  'Nepali Acoustic': 'soft',
  'Nepali': 'classic',
  'Pop': 'catchy',
  'Alternative Pop': 'moody',
  'Soft Pop': 'soft',
  'R&B': 'smooth',
  'Alternative R&B': 'late-night',
  'Soul': 'soulful',
  'Electronic': 'club',
  'Folk': 'reflective',
  'Singer-songwriter': 'heartfelt',
  'Soundtrack': 'cinematic',
  'Instrumental': 'atmospheric',
  'Emo': 'angsty',
  'Contemporary': 'expressive',
  'Other': 'Chill',
  'Uncategorized': 'Chill'
};

const mapSpotifyGenresToDB = (rawGenres = []) => {
  const joined = rawGenres.join(' / ');
  for (const [pattern, mapped] of GENRE_KEYWORD_TO_DB) {
    if (pattern.test(joined)) return mapped;
  }
  return null;
};

// --------- SPECIFIC SONG OVERRIDES ----------
// For songs where the artist default doesn't fit (e.g. a sad ballad on a hype artist).
// Match by lowercase name fragment, applies only if artists overlap with the listed artist.
const SONG_OVERRIDES = [
  { name: /smells like teen spirit/i, artist: 'Nirvana',     mood: 'rebellious' },
  { name: /come as you are/i,         artist: 'Nirvana',     mood: 'moody' },
  { name: /something in the way/i,    artist: 'Nirvana',     mood: 'melancholic' },
  { name: /heart-shaped box/i,        artist: 'Nirvana',     mood: 'dark' },
  { name: /perfect/i,                 artist: 'Ed Sheeran',  mood: 'romantic' },
  { name: /shape of you/i,            artist: 'Ed Sheeran',  mood: 'catchy' },
  { name: /thinking out loud/i,       artist: 'Ed Sheeran',  mood: 'romantic' },
  { name: /photograph/i,              artist: 'Ed Sheeran',  mood: 'nostalgic' },
  { name: /bad habits/i,              artist: 'Ed Sheeran',  mood: 'upbeat' },
  { name: /under the bridge/i,        artist: 'Red Hot Chili Peppers', mood: 'melancholic' },
  { name: /scar tissue/i,             artist: 'Red Hot Chili Peppers', mood: 'reflective' },
  { name: /californication/i,         artist: 'Red Hot Chili Peppers', mood: 'introspective' },
  { name: /otherside/i,               artist: 'Red Hot Chili Peppers', mood: 'melancholic' },
  { name: /by the way/i,              artist: 'Red Hot Chili Peppers', mood: 'energetic' },
  { name: /sweet child/i,             artist: "Guns N' Roses", mood: 'nostalgic' },
  { name: /november rain/i,           artist: "Guns N' Roses", mood: 'dramatic' },
  { name: /welcome to the jungle/i,   artist: "Guns N' Roses", mood: 'aggressive' },
  { name: /paradise city/i,           artist: "Guns N' Roses", mood: 'rebellious' },
  { name: /stronger/i,                artist: 'Kanye West',   mood: 'powerful' },
  { name: /heartless/i,               artist: 'Kanye West',   mood: 'cold' },
  { name: /runaway/i,                 artist: 'Kanye West',   mood: 'cathartic' },
  { name: /flashing lights/i,         artist: 'Kanye West',   mood: 'nocturnal' },
  { name: /jesus walks/i,             artist: 'Kanye West',   mood: 'Spiritual' },
  { name: /blinding lights/i,         artist: 'The Weeknd',   mood: 'nocturnal' },
  { name: /starboy/i,                 artist: 'The Weeknd',   mood: 'futuristic' },
  { name: /can't feel my face/i,      artist: 'The Weeknd',   mood: 'upbeat' },
  { name: /god['']s plan/i,           artist: 'Drake',        mood: 'uplifting' },
  { name: /hotline bling/i,           artist: 'Drake',        mood: 'smooth' },
  { name: /in my feelings/i,          artist: 'Drake',        mood: 'introspective' }
];

// --------- MAIN ----------
(async () => {
  await mongoose.connect(MONGO_URI);

  const songs = await Song.find({})
    .populate('artists', 'name genres mood_tags')
    .populate('album', 'name genres moods')
    .lean();

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const backupPath = path.join(REPORT_DIR, `song-taxonomy-backup-${Date.now()}.json`);
  const backup = songs.map((s) => ({
    _id: String(s._id),
    name: s.name,
    genre: s.genre || null,
    category: s.category || null,
    mood: s.mood || null
  }));
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`Backup written: ${backupPath}`);

  const updates = [];
  const stats = { genre: 0, category: 0, mood: 0, untouched: 0, songs: 0 };
  const previewSamples = [];

  for (const song of songs) {
    const artistNames = (song.artists || []).map((a) => a?.name).filter(Boolean);
    const artistGenres = (song.artists || []).flatMap((a) => Array.isArray(a?.genres) ? a.genres : []);
    const albumGenres = Array.isArray(song.album?.genres) ? song.album.genres : [];

    let profile = null;
    for (const name of artistNames) {
      if (ARTIST_PROFILE[name]) { profile = ARTIST_PROFILE[name]; break; }
    }

    let chosenGenre = song.genre && ALLOWED_GENRES.has(song.genre) ? song.genre : null;
    let chosenCategory = song.category && ALLOWED_CATEGORIES.has(song.category) ? song.category : null;
    let chosenMood = song.mood && ALLOWED_MOODS.has(song.mood) ? song.mood : null;

    if (!chosenGenre) {
      if (profile) chosenGenre = profile.genre;
      else chosenGenre = mapSpotifyGenresToDB([...artistGenres, ...albumGenres]) || 'Other';
      chosenGenre = pick(chosenGenre, ALLOWED_GENRES, 'Other');
    }

    if (!chosenCategory) {
      if (profile) chosenCategory = profile.category;
      else chosenCategory = GENRE_TO_CATEGORY[chosenGenre] || 'Uncategorized';
      chosenCategory = pick(chosenCategory, ALLOWED_CATEGORIES, 'Uncategorized');
    }

    if (!chosenMood) {
      let m = profile?.mood || DEFAULT_MOOD_BY_GENRE[chosenGenre] || 'Chill';
      for (const override of SONG_OVERRIDES) {
        if (override.name.test(song.name || '') && artistNames.some((n) => n === override.artist)) {
          m = override.mood;
          break;
        }
      }
      chosenMood = pick(m, ALLOWED_MOODS, 'Chill');
    }

    const update = {};
    if (chosenGenre !== song.genre) { update.genre = chosenGenre; stats.genre++; }
    if (chosenCategory !== song.category) { update.category = chosenCategory; stats.category++; }
    if (chosenMood !== song.mood) { update.mood = chosenMood; stats.mood++; }

    if (Object.keys(update).length) {
      updates.push({ id: song._id, update });
      if (previewSamples.length < 25) {
        previewSamples.push({
          name: song.name,
          artist: artistNames[0] || '(?)',
          before: { genre: song.genre || '-', category: song.category || '-', mood: song.mood || '-' },
          after: {
            genre: update.genre ?? song.genre ?? '-',
            category: update.category ?? song.category ?? '-',
            mood: update.mood ?? song.mood ?? '-'
          }
        });
      }
      stats.songs++;
    } else {
      stats.untouched++;
    }
  }

  console.log(`\nProposed updates: ${stats.songs} songs to change (genre: ${stats.genre}, category: ${stats.category}, mood: ${stats.mood})`);
  console.log(`Untouched (already fully tagged in allowed vocab): ${stats.untouched}`);
  console.log('\nSample (first 25 changes):');
  previewSamples.forEach((s) => {
    console.log(`  [${s.artist}] "${s.name}"`);
    console.log(`    ${s.before.genre} / ${s.before.category} / ${s.before.mood}`);
    console.log(`    -> ${s.after.genre} / ${s.after.category} / ${s.after.mood}`);
  });

  if (DRY_RUN) {
    console.log('\nDRY RUN — no DB writes. Re-run without --dry to apply.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('\nApplying updates in bulk...');
  const ops = updates.map(({ id, update }) => ({
    updateOne: { filter: { _id: id }, update: { $set: update } }
  }));
  const batchSize = 500;
  let applied = 0;
  for (let i = 0; i < ops.length; i += batchSize) {
    const batch = ops.slice(i, i + batchSize);
    await Song.bulkWrite(batch);
    applied += batch.length;
    process.stdout.write(`  ${applied}/${ops.length}\r`);
  }
  console.log(`\nDone. ${applied} songs updated.`);

  // Final distribution summary
  const genreAgg = await Song.aggregate([
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const moodAgg = await Song.aggregate([
    { $group: { _id: '$mood', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const catAgg = await Song.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nFinal genre distribution:');
  genreAgg.forEach((g) => console.log(`  ${String(g.count).padStart(5)} | ${g._id || '(empty)'}`));
  console.log('\nFinal mood distribution (top 20):');
  moodAgg.slice(0, 20).forEach((g) => console.log(`  ${String(g.count).padStart(5)} | ${g._id || '(empty)'}`));
  console.log('\nFinal category distribution:');
  catAgg.forEach((g) => console.log(`  ${String(g.count).padStart(5)} | ${g._id || '(empty)'}`));

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
