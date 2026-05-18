import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';

async function fixDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    let fixedCount = 0;
    let checkedCount = 0;

    // Fix Artists
    console.log('🔍 Checking Artists...');
    const artists = await Artist.find({}).lean();
    checkedCount += artists.length;
    
    for (const artist of artists) {
      const updates = {};
      let needsUpdate = false;

      // Fix images: if image_url exists but images array is empty, migrate it
      if (artist.image_url && (!artist.images || artist.images.length === 0)) {
        updates.images = [{ url: artist.image_url }];
        needsUpdate = true;
        console.log(`  → Migrating image_url to images for: ${artist.name}`);
      }

      // Ensure images array exists (even if empty)
      if (!artist.images) {
        updates.images = [];
        needsUpdate = true;
      }

      // Ensure popularity is a number
      if (artist.popularity === undefined || artist.popularity === null) {
        updates.popularity = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Artist.updateOne({ _id: artist._id }, { $set: updates });
        fixedCount++;
      }
    }
    console.log(`✓ Checked ${artists.length} artists\n`);

    // Fix Albums
    console.log('🔍 Checking Albums...');
    const albums = await Album.find({}).lean();
    checkedCount += albums.length;
    
    for (const album of albums) {
      const updates = {};
      let needsUpdate = false;

      // Ensure images array exists
      if (!album.images) {
        updates.images = [];
        needsUpdate = true;
      }

      // Ensure popularity is a number
      if (album.popularity === undefined || album.popularity === null) {
        updates.popularity = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Album.updateOne({ _id: album._id }, { $set: updates });
        fixedCount++;
      }
    }
    console.log(`✓ Checked ${albums.length} albums\n`);

    // Fix Songs
    console.log('🔍 Checking Songs...');
    const songs = await Song.find({}).lean();
    checkedCount += songs.length;
    
    for (const song of songs) {
      const updates = {};
      let needsUpdate = false;

      // Migrate title to name if name is missing
      if (!song.name && song.title) {
        updates.name = song.title;
        needsUpdate = true;
        console.log(`  → Migrating title to name for: ${song.title}`);
      }

      // Ensure name exists
      if (!song.name && !song.title) {
        updates.name = 'Unknown Song';
        needsUpdate = true;
        console.log(`  ⚠️  Setting default name for song ID: ${song._id}`);
      }

      // Ensure duration_ms exists
      if (song.duration_ms === undefined || song.duration_ms === null) {
        if (song.duration) {
          updates.duration_ms = song.duration;
        } else {
          updates.duration_ms = 0;
        }
        needsUpdate = true;
      }

      // Ensure popularity is a number
      if (song.popularity === undefined || song.popularity === null) {
        updates.popularity = 0;
        needsUpdate = true;
      }

      // Ensure artists array exists
      if (!song.artists) {
        updates.artists = [];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Song.updateOne({ _id: song._id }, { $set: updates });
        fixedCount++;
      }
    }
    console.log(`✓ Checked ${songs.length} songs\n`);

    // Create indexes if they don't exist
    console.log('🔍 Ensuring indexes exist...');
    try {
      await Artist.createIndexes();
      await Album.createIndexes();
      await Song.createIndexes();
      console.log('✓ Indexes verified\n');
    } catch (error) {
      console.warn('⚠️  Some indexes may already exist:', error.message);
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 Database Fix Summary:');
    console.log(`   Total documents checked: ${checkedCount}`);
    console.log(`   Documents fixed: ${fixedCount}`);
    console.log('═══════════════════════════════════════\n');

    // Show some statistics
    const artistStats = await Artist.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withImages: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] }, 1, 0] } },
          withImageUrl: { $sum: { $cond: [{ $ifNull: ['$image_url', false] }, 1, 0] } },
          withPopularity: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$popularity', 0] }, 0] }, 1, 0] } }
        }
      }
    ]);

    if (artistStats.length > 0) {
      const stats = artistStats[0];
      console.log('📈 Artist Statistics:');
      console.log(`   Total artists: ${stats.total}`);
      console.log(`   Artists with images array: ${stats.withImages}`);
      console.log(`   Artists with image_url: ${stats.withImageUrl}`);
      console.log(`   Artists with popularity > 0: ${stats.withPopularity}\n`);
    }

    const songStats = await Song.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withArtists: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$artists', []] } }, 0] }, 1, 0] } },
          withAlbum: { $sum: { $cond: [{ $ifNull: ['$album', false] }, 1, 0] } },
          withPopularity: { $sum: { $cond: [{ $gt: [{ $ifNull: ['$popularity', 0] }, 0] }, 1, 0] } }
        }
      }
    ]);

    if (songStats.length > 0) {
      const stats = songStats[0];
      console.log('📈 Song Statistics:');
      console.log(`   Total songs: ${stats.total}`);
      console.log(`   Songs with artists: ${stats.withArtists}`);
      console.log(`   Songs with album: ${stats.withAlbum}`);
      console.log(`   Songs with popularity > 0: ${stats.withPopularity}\n`);
    }

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    console.log('\n✅ Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  }
}

// Run the fix
fixDatabase();


