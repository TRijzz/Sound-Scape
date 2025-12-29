import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';
import Artist from '../models/Artist.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinyl_demo';

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

async function refreshAccessToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('✓ Spotify access token refreshed');
    return true;
  } catch (error) {
    console.error('❌ Error refreshing Spotify token:', error.message);
    return false;
  }
}

async function fetchArtistImagesFromSpotify() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Refresh Spotify token
    const tokenRefreshed = await refreshAccessToken();
    if (!tokenRefreshed) {
      console.error('❌ Failed to get Spotify access token. Check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Find artists without images but with spotify_id
    const artistsWithoutImages = await Artist.find({
      $and: [
        { spotify_id: { $exists: true, $ne: null, $ne: '' } },
        {
          $or: [
            { images: { $exists: false } },
            { images: [] },
            { images: { $size: 0 } }
          ]
        }
      ]
    }); // Process all artists

    console.log(`Found ${artistsWithoutImages.length} artists without images that have spotify_id\n`);

    if (artistsWithoutImages.length === 0) {
      console.log('✅ All artists with spotify_id already have images!');
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let processedCount = 0;
    const totalArtists = artistsWithoutImages.length;

    console.log(`🔄 Processing ${totalArtists} artists...\n`);

    for (const artist of artistsWithoutImages) {
      processedCount++;
      
      // Show progress every 10 artists
      if (processedCount % 10 === 0) {
        console.log(`   Progress: ${processedCount}/${totalArtists} (${Math.round(processedCount / totalArtists * 100)}%)`);
      }
      try {
        // Fetch artist from Spotify
        const spotifyArtist = await spotifyApi.getArtist(artist.spotify_id);
        
        if (spotifyArtist.body && spotifyArtist.body.images && spotifyArtist.body.images.length > 0) {
          // Update artist with images from Spotify
          await Artist.updateOne(
            { _id: artist._id },
            { 
              $set: { 
                images: spotifyArtist.body.images,
                last_synced: new Date()
              }
            }
          );
          console.log(`✓ Updated images for: ${artist.name} (${spotifyArtist.body.images.length} images)`);
          successCount++;
        } else {
          console.log(`⚠️  No images found on Spotify for: ${artist.name}`);
          skippedCount++;
        }

        // Rate limiting - wait a bit between requests to avoid hitting API limits
        // Spotify allows ~100 requests per second, so 50ms delay is safe
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        if (error.statusCode === 401) {
          // Token expired, refresh and retry
          console.log('🔄 Token expired, refreshing...');
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Retry this artist
            try {
              const spotifyArtist = await spotifyApi.getArtist(artist.spotify_id);
              if (spotifyArtist.body && spotifyArtist.body.images && spotifyArtist.body.images.length > 0) {
                await Artist.updateOne(
                  { _id: artist._id },
                  { 
                    $set: { 
                      images: spotifyArtist.body.images,
                      last_synced: new Date()
                    }
                  }
                );
                console.log(`✓ Updated images for: ${artist.name} (after token refresh)`);
                successCount++;
              } else {
                skippedCount++;
              }
            } catch (retryError) {
              console.error(`❌ Failed to fetch ${artist.name}:`, retryError.message);
              failCount++;
            }
          } else {
            console.error(`❌ Failed to refresh token for ${artist.name}`);
            failCount++;
          }
        } else if (error.statusCode === 404) {
          console.log(`⚠️  Artist not found on Spotify: ${artist.name} (ID: ${artist.spotify_id})`);
          skippedCount++;
        } else {
          console.error(`❌ Error fetching ${artist.name}:`, error.message);
          failCount++;
        }
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 Image Fetch Summary:');
    console.log(`   Total artists processed: ${totalArtists}`);
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ⚠️  Skipped (no images on Spotify): ${skippedCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   Success rate: ${totalArtists > 0 ? Math.round((successCount / totalArtists) * 100) : 0}%`);
    console.log('═══════════════════════════════════════\n');

    // Check remaining artists without images
    const remaining = await Artist.countDocuments({
      $and: [
        { spotify_id: { $exists: true, $ne: null, $ne: '' } },
        {
          $or: [
            { images: { $exists: false } },
            { images: [] },
            { images: { $size: 0 } }
          ]
        }
      ]
    });

    if (remaining > 0) {
      console.log(`ℹ️  ${remaining} artists still need images. Run this script again to process more.`);
    } else {
      console.log('✅ All artists with spotify_id now have images!');
    }

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    console.log('\n✅ Image fetch completed!');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
fetchArtistImagesFromSpotify();

