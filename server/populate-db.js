#!/usr/bin/env node

/**
 * Quick database population script
 * This will populate your MongoDB with sample data so the frontend displays song cards
 */

import SpotifySyncService from './src/scripts/spotify-sync.js';
import { connectDB } from './src/config/db.js';

async function populateDatabase() {
  try {
    console.log('🎵 Populating database with sample music data...\n');

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Initialize sync service
    console.log('🔄 Initializing Spotify sync service...');
    const syncService = new SpotifySyncService();
    await syncService.initialize();
    console.log('✅ Spotify sync service initialized\n');

    // Sync popular artists and their music
    const popularQueries = [
      'Ed Sheeran',
      'Taylor Swift', 
      'Drake',
      'Billie Eilish',
      'The Weeknd'
    ];

    for (const query of popularQueries) {
      console.log(`🎤 Syncing data for: ${query}`);
      try {
        await syncService.completeSync(query, {
          artistLimit: 1,
          albumLimit: 3,
          trackLimit: 10,
          includeAudioFeatures: false
        });
        console.log(`✅ Completed sync for: ${query}\n`);
      } catch (error) {
        console.error(`❌ Failed to sync ${query}:`, error.message);
      }
    }

    console.log('🎉 Database population completed!');
    console.log('🚀 You can now start your frontend and see the song cards!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  }
}

populateDatabase();