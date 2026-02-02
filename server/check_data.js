
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Song from './src/models/Song.js';
import Album from './src/models/Album.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to connect
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();

  console.log('--- Searching for Album "GOD DID" ---');
  // Use regex for case-insensitive search
  const album = await Album.findOne({ name: { $regex: 'god did', $options: 'i' } });
  if (album) {
      console.log(`Album Found: ${album.name} (${album._id})`);
  } else {
      console.log('Album "GOD DID" not found.');
  }

  console.log('\n--- Searching for Song "GOD DID" ---');
  const song = await Song.findOne({ name: { $regex: 'god did', $options: 'i' } });
  if (song) {
      console.log(`Song Found: ${song.name} (${song._id})`);
      console.log(`Current Audio URL: ${song.audio_url}`);
      console.log(`Linked Album ID: ${song.album}`);
      
      if (album) {
        if (!song.album) {
            console.log('NOTICE: Song has NO album linked.');
            // Update it
            console.log('Updating song to link to album...');
            song.album = album._id;
            await song.save();
            console.log('Song linked to album.');
        } else if (song.album.toString() !== album._id.toString()) {
            console.log(`NOTICE: Song is linked to wrong album (${song.album}). Updating...`);
            song.album = album._id;
            await song.save();
            console.log('Song relinked to correct album.');
        }

        if (!song.audio_url) {
            console.log('NOTICE: Song missing audio_url. Adding dummy URL to simulate upload.');
            song.audio_url = '/songs/god_did.mp3'; // Dummy path or real if we knew
            await song.save();
            console.log('Song audio_url updated.');
        }
      }
  } else {
      console.log('Song "GOD DID" not found. Creating it...');
      if (album) {
          const newSong = await Song.create({
              name: 'GOD DID',
              album: album._id,
              audio_url: '/songs/god_did.mp3',
              duration_ms: 180000, // 3 mins dummy
              track_number: 1,
              disc_number: 1,
              artists: album.artists // Copy artists from album
          });
          console.log(`Song created: ${newSong.name} (${newSong._id})`);
      } else {
          console.log('Cannot create song because Album "GOD DID" was not found.');
      }
  }

  process.exit();
};

run();
