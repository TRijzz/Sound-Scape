#!/usr/bin/env node

/**
 * Example usage script for Spotify to MongoDB migration
 * 
 * This script demonstrates how to:
 * 1. Sync data from Spotify to MongoDB
 * 2. Query the synced data
 * 3. Refresh existing data
 */

import SpotifySyncService from './src/scripts/spotify-sync.js';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import Artist from './src/models/Artist.js';
import Album from './src/models/Album.js';
import Song from './src/models/Song.js';

async function main() {
  try {
    console.log('🎵 Spotify to MongoDB Migration Example\n');

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Initialize sync service
    console.log('🔄 Initializing Spotify sync service...');
    const syncService = new SpotifySyncService();
    await syncService.initialize();
    console.log('✅ Spotify sync service initialized\n');

    // Example 1: Sync data for a popular artist
    console.log('📥 Example 1: Syncing data for "Ed Sheeran"...');
    const syncResult = await syncService.completeSync('Ed Sheeran', {
      artistLimit: 5,
      albumLimit: 20,
      trackLimit: 50,
      includeAudioFeatures: true
    });
    console.log('✅ Sync completed:', syncResult);
    console.log('');

    // Example 2: Query synced data
    console.log('🔍 Example 2: Querying synced data...');
    
    // Get popular artists
    const popularArtists = await Artist.find({ popularity: { $gt: 0 } })
      .sort({ popularity: -1 })
      .limit(5)
      .lean();
    console.log('📊 Top 5 popular artists:');
    popularArtists.forEach((artist, index) => {
      console.log(`  ${index + 1}. ${artist.name} (Popularity: ${artist.popularity})`);
    });
    console.log('');

    // Get albums by year
    const recentAlbums = await Album.find({ 
      release_date: { $regex: '^2023' }
    })
      .populate('artists', 'name')
      .sort({ popularity: -1 })
      .limit(5)
      .lean();
    console.log('📀 Top 5 albums from 2023:');
    recentAlbums.forEach((album, index) => {
      const artistNames = album.artists.map(a => a.name).join(', ');
      console.log(`  ${index + 1}. ${album.name} by ${artistNames}`);
    });
    console.log('');

    // Get songs with audio features
    const energeticSongs = await Song.find({
      'audio_features.energy': { $gt: 0.8 },
      'audio_features.tempo': { $gt: 120 }
    })
      .populate('artists', 'name')
      .populate('album', 'name')
      .sort({ 'audio_features.energy': -1 })
      .limit(5)
      .lean();
    console.log('⚡ Top 5 high-energy songs (>120 BPM, >0.8 energy):');
    energeticSongs.forEach((song, index) => {
      const artistNames = song.artists.map(a => a.name).join(', ');
      console.log(`  ${index + 1}. ${song.name} by ${artistNames} (Energy: ${song.audio_features.energy})`);
    });
    console.log('');

    // Example 3: Search functionality
    console.log('🔎 Example 3: Search functionality...');
    const searchResults = await Song.find({
      $text: { $search: 'love' }
    })
      .populate('artists', 'name')
      .populate('album', 'name')
      .sort({ score: { $meta: 'textScore' } })
      .limit(3)
      .lean();
    console.log('💕 Songs containing "love":');
    searchResults.forEach((song, index) => {
      const artistNames = song.artists.map(a => a.name).join(', ');
      console.log(`  ${index + 1}. ${song.name} by ${artistNames}`);
    });
    console.log('');

    // Example 4: Statistics
    console.log('📈 Example 4: Database statistics...');
    const stats = {
      artists: await Artist.countDocuments(),
      albums: await Album.countDocuments(),
      songs: await Song.countDocuments(),
      syncedArtists: await Artist.countDocuments({ sync_source: 'spotify' }),
      syncedAlbums: await Album.countDocuments({ sync_source: 'spotify' }),
      syncedSongs: await Song.countDocuments({ sync_source: 'spotify' })
    };
    console.log('📊 Database Statistics:');
    console.log(`  Total Artists: ${stats.artists} (${stats.syncedArtists} from Spotify)`);
    console.log(`  Total Albums: ${stats.albums} (${stats.syncedAlbums} from Spotify)`);
    console.log(`  Total Songs: ${stats.songs} (${stats.syncedSongs} from Spotify)`);
    console.log('');

    // Example 5: Refresh data (optional)
    console.log('🔄 Example 5: Refreshing data...');
    await syncService.refreshData();
    console.log('✅ Data refresh completed\n');

    console.log('🎉 Example completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the API endpoints with your frontend');
    console.log('2. Set up scheduled sync jobs if needed');
    console.log('3. Monitor performance and optimize queries');
    console.log('4. Consider implementing caching for better performance');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the example
main();
