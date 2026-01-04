import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';

async function checkDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check Artists
    console.log('═══════════════════════════════════════');
    console.log('🎤 ARTISTS');
    console.log('═══════════════════════════════════════');
    
    const totalArtists = await Artist.countDocuments();
    const artistsWithImages = await Artist.countDocuments({
      $or: [
        { images: { $exists: true, $ne: [], $not: { $size: 0 } } },
        { image_url: { $exists: true, $ne: null, $ne: '' } }
      ]
    });
    const artistsWithoutImages = totalArtists - artistsWithImages;
    
    console.log(`Total artists: ${totalArtists}`);
    console.log(`Artists with images: ${artistsWithImages}`);
    console.log(`Artists without images: ${artistsWithoutImages}\n`);

    // Show sample artists with issues
    const artistsWithoutImagesList = await Artist.find({
      $and: [
        { $or: [{ images: { $exists: false } }, { images: [] }, { images: { $size: 0 } }] },
        { $or: [{ image_url: { $exists: false } }, { image_url: null }, { image_url: '' }] }
      ]
    }).limit(5).select('name images image_url').lean();

    if (artistsWithoutImagesList.length > 0) {
      console.log('⚠️  Sample artists without images:');
      artistsWithoutImagesList.forEach(artist => {
        console.log(`   - ${artist.name} (images: ${JSON.stringify(artist.images)}, image_url: ${artist.image_url || 'none'})`);
      });
      console.log('');
    }

    // Check Albums
    console.log('═══════════════════════════════════════');
    console.log('💿 ALBUMS');
    console.log('═══════════════════════════════════════');
    
    const totalAlbums = await Album.countDocuments();
    const albumsWithImages = await Album.countDocuments({
      images: { $exists: true, $ne: [], $not: { $size: 0 } }
    });
    const albumsWithoutImages = totalAlbums - albumsWithImages;
    
    console.log(`Total albums: ${totalAlbums}`);
    console.log(`Albums with images: ${albumsWithImages}`);
    console.log(`Albums without images: ${albumsWithoutImages}\n`);

    // Check Songs
    console.log('═══════════════════════════════════════');
    console.log('🎵 SONGS');
    console.log('═══════════════════════════════════════');
    
    const totalSongs = await Song.countDocuments();
    const songsWithArtists = await Song.countDocuments({
      artists: { $exists: true, $ne: [], $not: { $size: 0 } }
    });
    const songsWithAlbum = await Song.countDocuments({
      album: { $exists: true, $ne: null }
    });
    const songsWithoutName = await Song.countDocuments({
      $or: [
        { name: { $exists: false } },
        { name: null },
        { name: '' }
      ]
    });
    
    console.log(`Total songs: ${totalSongs}`);
    console.log(`Songs with artists: ${songsWithArtists}`);
    console.log(`Songs with album: ${songsWithAlbum}`);
    console.log(`Songs without name: ${songsWithoutName}\n`);

    // Check for songs with special characters (like the one mentioned)
    const specialCharSongs = await Song.find({
      name: { $regex: /[*#@$%^&()]/ }
    }).limit(5).select('name').lean();

    if (specialCharSongs.length > 0) {
      console.log('📝 Sample songs with special characters:');
      specialCharSongs.forEach(song => {
        console.log(`   - ${song.name}`);
      });
      console.log('');
    }

    // Check for "Ni**as in Paris" specifically
    const parisSong = await Song.find({
      name: { $regex: /ni.*as.*paris/i }
    }).select('name artists album').lean();

    if (parisSong.length > 0) {
      console.log('🎯 Found "Ni**as in Paris" related songs:');
      parisSong.forEach(song => {
        console.log(`   - ${song.name} (ID: ${song._id})`);
        console.log(`     Artists: ${song.artists?.length || 0}`);
        console.log(`     Album: ${song.album ? 'Yes' : 'No'}`);
      });
      console.log('');
    } else {
      console.log('⚠️  "Ni**as in Paris" not found in database\n');
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total documents: ${totalArtists + totalAlbums + totalSongs}`);
    console.log(`Issues found:`);
    if (artistsWithoutImages > 0) {
      console.log(`   ⚠️  ${artistsWithoutImages} artists without images`);
    }
    if (albumsWithoutImages > 0) {
      console.log(`   ⚠️  ${albumsWithoutImages} albums without images`);
    }
    if (songsWithoutName > 0) {
      console.log(`   ⚠️  ${songsWithoutName} songs without name`);
    }
    if (songsWithArtists < totalSongs * 0.9) {
      console.log(`   ⚠️  Many songs missing artist relationships`);
    }
    console.log('═══════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

// Run the check
checkDatabase();


