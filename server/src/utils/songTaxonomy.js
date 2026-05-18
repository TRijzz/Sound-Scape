import { collectionNameToDisplayName, getCollectionNames } from './taxonomyStore.js';

const normalizeKey = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '')
  .trim();

const titleCase = (value = '') => String(value)
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const GENRE_ALIASES = {
  alternative: 'Alternative',
  alternativerock: 'Alternative Rock',
  amapiano: 'Amapiano',
  arabichiphop: 'Arabic Hip Hop',
  bachata: 'Bachata',
  blues: 'Blues',
  bollywood: 'Bollywood',
  brazilianfunk: 'Brazilian Funk',
  classical: 'Classical',
  contemporaryrandb: 'Contemporary R&B',
  country: 'Country',
  dance: 'Dance',
  dancehall: 'Dancehall',
  disco: 'Disco',
  drill: 'Drill',
  dubstep: 'Dubstep',
  edm: 'EDM',
  electronic: 'Electronic',
  emo: 'Emo',
  folk: 'Folk',
  funk: 'Funk',
  funkdebh: 'Funk De Bh',
  funkrock: 'Funk Rock',
  gospel: 'Gospel',
  grime: 'Grime',
  hiphop: 'HipHop',
  hiphoprap: 'HipHop Rap',
  house: 'House',
  hyperpop: 'Hyperpop',
  indie: 'Indie',
  indierock: 'Indie Rock',
  jazz: 'Jazz',
  kpop: 'K-Pop',
  kizomba: 'Kizomba',
  latin: 'Latin',
  lofi: 'Lo-Fi',
  metal: 'Metal',
  moroccanpop: 'Moroccan Pop',
  moroccanrap: 'Moroccan Rap',
  neosoul: 'Neo Soul',
  nepali: 'Nepali',
  nepalipop: 'Nepali Pop',
  newari: 'Newari',
  phonk: 'Phonk',
  pop: 'Pop',
  punk: 'Punk',
  randb: 'R&B',
  rap: 'Rap',
  reggae: 'Reggae',
  reggaeton: 'Reggaeton',
  rock: 'Rock',
  singeli: 'Singeli',
  singersongwriter: 'Singer-songwriter',
  softpop: 'Soft Pop',
  soul: 'Soul',
  synthpop: 'Synthpop',
  techno: 'Techno',
  trap: 'Trap'
};

const ARTIST_GENRE_HINTS = {
  vten: 'HipHop',
  sajjanrajvaidya: 'Nepali Pop',
  albatross: 'Rock',
  theedgeband: 'Rock',
  djkhaled: 'HipHop',
  taylorswift: 'Pop',
  chiragkhadka: 'HipHop',
  sushantkc: 'Nepali Pop',
  billieeilish: 'Pop',
  bartikaeamrai: 'Singer-songwriter',
  yabeshthapa: 'Nepali Pop',
  tribalrain: 'Alternative Rock',
  axix: 'Rock',
  theweeknd: 'R&B',
  sabinrai: 'Rock',
  purnarai: 'Nepali Pop',
  oasisthapa: 'Nepali Pop',
  samirshrestha: 'Nepali Pop',
  yabithegoat: 'HipHop',
  rockheads: 'Rock',
  cineygurung: 'Nepali Pop',
  sujanchapagain: 'Nepali',
  mavado: 'Dancehall',
  kidsseeghosts: 'HipHop Rap',
  johnrai: 'Nepali Pop',
  swar: 'Nepali Pop',
  justinbieber: 'Pop',
  edsheeranandjustinbieber: 'Pop',
  edsheeranpianocovers: 'Soft Pop',
  theedsheeranpianocoversmoothboysband: 'Soft Pop',
  kanyewests: 'HipHop',
  jesusofswaggerath: 'HipHop',
  jamesy: 'Other'
};

const CATEGORY_BY_GENRE = {
  'Alternative': 'Alternative',
  'Alternative Rock': 'Alternative Rock',
  'Amapiano': 'Amapiano',
  'Arabic Hip Hop': 'Hip-Hop Essentials',
  'Bachata': 'Latin',
  'Blues': 'Blues',
  'Bollywood': 'Bollywood',
  'Brazilian Funk': 'Funk',
  'Classical': 'Classical',
  'Contemporary R&B': 'R&B',
  'Country': 'Country',
  'Dance': 'Dance',
  'Dancehall': 'Dancehall',
  'Disco': 'Disco',
  'Drill': 'Hip-Hop Essentials',
  'Dubstep': 'Electronic',
  'EDM': 'EDM',
  'Electronic': 'Electronic',
  'Emo': 'Emo',
  'Folk': 'Folk',
  'Funk': 'Funk',
  'Funk De Bh': 'Funk',
  'Funk Rock': 'Rock',
  'Gospel': 'Gospel',
  'Grime': 'Hip-Hop Essentials',
  'HipHop': 'Hip-Hop Essentials',
  'HipHop Rap': 'Hip-Hop Essentials',
  'House': 'House',
  'Hyperpop': 'Pop',
  'Indie': 'Indie',
  'Indie Rock': 'Indie Rock',
  'Jazz': 'Jazz',
  'K-Pop': 'K-Pop',
  'Kizomba': 'Kizomba',
  'Latin': 'Latin',
  'Lo-Fi': 'Lo-Fi',
  'Metal': 'Metal',
  'Moroccan Pop': 'Moroccan Pop',
  'Moroccan Rap': 'Hip-Hop Essentials',
  'Neo Soul': 'Soul',
  'Nepali': 'Nepali',
  'Nepali Pop': 'Nepali Pop',
  'Newari': 'Nepali',
  'Phonk': 'Hip-Hop Essentials',
  'Pop': 'Pop Songs',
  'Punk': 'Punk',
  'R&B': 'R&B',
  'Rap': 'Hip-Hop Essentials',
  'Reggae': 'Reggae',
  'Reggaeton': 'Reggaeton',
  'Rock': 'Rock',
  'Singeli': 'Other',
  'Singer-songwriter': 'Singer-songwriter',
  'Soft Pop': 'Pop Songs',
  'Soul': 'Soul',
  'Synthpop': 'Pop',
  'Techno': 'Techno',
  'Trap': 'Trap'
};

const splitGenreCandidates = (value = '') => String(value)
  .split(/[,/|;]+/)
  .map((entry) => entry.trim())
  .filter(Boolean);

const buildLookup = (displayNames = []) => {
  const names = Array.from(new Set(displayNames.filter(Boolean)));
  const byKey = new Map(names.map((name) => [normalizeKey(name), name]));
  return { names, byKey };
};

const resolveDisplayName = (value, lookup) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const direct = lookup.byKey.get(normalizeKey(raw));
  if (direct) return direct;

  const alias = GENRE_ALIASES[normalizeKey(raw)];
  if (alias) {
    const aliasMatch = lookup.byKey.get(normalizeKey(alias));
    if (aliasMatch) return aliasMatch;
  }

  for (const token of splitGenreCandidates(raw)) {
    const tokenMatch = lookup.byKey.get(normalizeKey(token));
    if (tokenMatch) return tokenMatch;

    const aliasToken = GENRE_ALIASES[normalizeKey(token)];
    if (aliasToken) {
      const aliasMatch = lookup.byKey.get(normalizeKey(aliasToken));
      if (aliasMatch) return aliasMatch;
    }
  }

  const normalized = normalizeKey(raw);
  for (const [key, alias] of Object.entries(GENRE_ALIASES)) {
    if (normalized.includes(key)) {
      const aliasMatch = lookup.byKey.get(normalizeKey(alias));
      if (aliasMatch) return aliasMatch;
    }
  }

  return '';
};

const resolveCategoryFromGenre = (genreName, categoryLookup) => {
  const direct = resolveDisplayName(genreName, categoryLookup);
  if (direct) return direct;

  const mapped = CATEGORY_BY_GENRE[genreName];
  if (mapped) {
    const matched = resolveDisplayName(mapped, categoryLookup);
    if (matched) return matched;
  }

  const fallback = resolveDisplayName('Other', categoryLookup);
  return fallback || '';
};

export const getSongTaxonomyLookups = async () => {
  const [genreCollections, categoryCollections] = await Promise.all([
    getCollectionNames('genre'),
    getCollectionNames('categories')
  ]);

  const genres = genreCollections.map(collectionNameToDisplayName);
  const categories = categoryCollections.map(collectionNameToDisplayName);

  return {
    genreLookup: buildLookup(genres),
    categoryLookup: buildLookup(categories)
  };
};

export const classifySongTaxonomy = (song, lookups, options = {}) => {
  const { overwriteGenre = false, overwriteCategory = false } = options;
  const updates = {};
  const reasons = [];

  const genreCandidates = [];
  if (Array.isArray(song?.genres)) genreCandidates.push(...song.genres);
  if (song?.genre) genreCandidates.push(song.genre);
  if (Array.isArray(song?.album?.genres)) genreCandidates.push(...song.album.genres);
  if (Array.isArray(song?.artists)) {
    for (const artist of song.artists) {
      if (Array.isArray(artist?.genres)) {
        genreCandidates.push(...artist.genres);
      }
      const hintedGenre = ARTIST_GENRE_HINTS[normalizeKey(artist?.name || '')];
      if (hintedGenre) {
        genreCandidates.push(hintedGenre);
      }
    }
  }

  const chosenGenre = genreCandidates
    .map((candidate) => resolveDisplayName(candidate, lookups.genreLookup))
    .find(Boolean);

  if (chosenGenre && (overwriteGenre || !String(song?.genre || '').trim() || String(song?.genre || '').trim() === 'Uncategorized')) {
    if (String(song?.genre || '').trim() !== chosenGenre || JSON.stringify(song?.genres || []) !== JSON.stringify([chosenGenre])) {
      updates.genre = chosenGenre;
      updates.genres = [chosenGenre];
      reasons.push(`genre:${chosenGenre}`);
    }
  }

  const effectiveGenre = updates.genre || resolveDisplayName(song?.genre, lookups.genreLookup) || chosenGenre;
  const chosenCategory = effectiveGenre ? resolveCategoryFromGenre(effectiveGenre, lookups.categoryLookup) : '';

  if (chosenCategory && (overwriteCategory || !String(song?.category || '').trim() || String(song?.category || '').trim() === 'Uncategorized')) {
    if (String(song?.category || '').trim() !== chosenCategory) {
      updates.category = chosenCategory;
      reasons.push(`category:${chosenCategory}`);
    }
  }

  const tagSet = new Set((song?.tags || []).map((tag) => String(tag).trim()).filter(Boolean));
  const releaseDate = song?.album?.release_date ? String(song.album.release_date) : '';
  const year = /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : '';
  if (year) {
    tagSet.add(`${year.slice(0, 3)}0s`);
  }
  if (song?.explicit) {
    tagSet.add('explicit');
  }
  const nextTags = Array.from(tagSet).map((tag) => titleCase(tag).replace(/^R&b$/i, 'R&B'));
  if (nextTags.length && JSON.stringify(nextTags) !== JSON.stringify(song?.tags || [])) {
    updates.tags = nextTags;
  }

  return { updates, reasons };
};
