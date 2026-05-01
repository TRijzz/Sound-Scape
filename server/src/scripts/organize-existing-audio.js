import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Song from '../models/Song.js';
import '../models/Artist.js';
import '../models/Album.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const publicSongsDir = path.join(projectRoot, 'public', 'songs');
const audioFilePattern = /\.(mp3|wav|ogg|m4a|flac)$/i;

const sanitizePathSegment = (value = '', fallback = 'Untitled') => {
  const sanitized = String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .slice(0, 120);
  return sanitized || fallback;
};

const getUniqueFilePath = async (targetPath, sourcePath = '') => {
  const parsed = path.parse(targetPath);
  let candidate = targetPath;
  let count = 2;
  while (fs.existsSync(candidate)) {
    if (sourcePath && path.resolve(candidate) === path.resolve(sourcePath)) {
      return candidate;
    }
    candidate = path.join(parsed.dir, `${parsed.name}-${count}${parsed.ext}`);
    count += 1;
  }
  return candidate;
};

const moveFile = async (sourcePath, targetPath) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  if (path.resolve(sourcePath) === path.resolve(targetPath)) return;
  try {
    await fs.promises.rename(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await fs.promises.copyFile(sourcePath, targetPath);
    await fs.promises.unlink(sourcePath);
  }
};

const buildAudioUrl = (filePath) => `/songs/${path.relative(publicSongsDir, filePath).split(path.sep).map((part) => encodeURIComponent(part)).join('/')}`;

const candidatePathsForSong = (song) => {
  const candidates = [];
  if (song.file_path) {
    candidates.push(path.isAbsolute(song.file_path) ? song.file_path : path.resolve(projectRoot, song.file_path));
  }
  if (song.audio_url?.startsWith('/songs/')) {
    const relativePath = decodeURIComponent(song.audio_url.replace(/^\/songs\//, '')).split('/').join(path.sep);
    candidates.push(path.join(publicSongsDir, relativePath));
  }
  return Array.from(new Set(candidates));
};

async function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const result = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* walk(result);
    } else if (audioFilePattern.test(result)) {
      yield result;
    }
  }
}

const findExistingAudioPath = (song) => candidatePathsForSong(song).find((candidate) => fs.existsSync(candidate)) || '';

const getTargetPathForSong = async (song, sourcePath) => {
  const artistName = song.album?.artists?.[0]?.name || song.artists?.[0]?.name || 'Unknown Artist';
  const albumName = song.album?.name || '';
  const ext = path.extname(sourcePath);
  const folders = [sanitizePathSegment(artistName, 'Unknown Artist')];
  if (albumName) folders.push(sanitizePathSegment(albumName, 'Unknown Album'));
  const fileName = `${sanitizePathSegment(song.name || song.title || path.basename(sourcePath, ext), 'Untitled Song')}${ext.toLowerCase()}`;
  return getUniqueFilePath(path.join(publicSongsDir, ...folders, fileName), sourcePath);
};

const organize = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';
  await mongoose.connect(uri);

  const stats = { moved: 0, skipped: 0, unmatched: 0, errors: 0 };
  const referencedPaths = new Set();
  const songs = await Song.find({
    $or: [
      { audio_url: { $exists: true, $nin: ['', null] } },
      { file_path: { $exists: true, $nin: ['', null] } }
    ]
  })
    .populate('artists', 'name')
    .populate({
      path: 'album',
      select: 'name artists',
      populate: { path: 'artists', select: 'name' }
    });

  for (const song of songs) {
    try {
      const sourcePath = findExistingAudioPath(song);
      if (!sourcePath) {
        stats.skipped += 1;
        continue;
      }

      const targetPath = await getTargetPathForSong(song, sourcePath);
      await moveFile(sourcePath, targetPath);
      song.file_path = targetPath;
      song.audio_url = buildAudioUrl(targetPath);
      await song.save();
      referencedPaths.add(path.resolve(targetPath).toLowerCase());
      stats.moved += path.resolve(sourcePath) === path.resolve(targetPath) ? 0 : 1;
    } catch (error) {
      stats.errors += 1;
      console.error(`Failed to organize ${song.name}:`, error.message);
    }
  }

  for await (const filePath of walk(publicSongsDir)) {
    const normalized = path.resolve(filePath).toLowerCase();
    if (referencedPaths.has(normalized)) continue;
    if (path.relative(publicSongsDir, filePath).split(path.sep)[0] === '_unmatched') continue;
    const targetPath = await getUniqueFilePath(path.join(publicSongsDir, '_unmatched', path.basename(filePath)));
    await moveFile(filePath, targetPath);
    stats.unmatched += 1;
  }

  console.log(JSON.stringify(stats, null, 2));
};

organize()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
