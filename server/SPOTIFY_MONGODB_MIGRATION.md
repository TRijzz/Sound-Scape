# Spotify to MongoDB Migration Guide

This guide explains how to migrate your Music Station FYP backend from live Spotify API calls to using MongoDB as the primary data source.

## Overview

The migration includes:
- Enhanced MongoDB schemas for artists, albums, and tracks with Spotify field mappings
- A comprehensive sync script to populate MongoDB from Spotify API
- Updated Express routes that fetch from MongoDB instead of calling Spotify API
- Sync/refresh functionality to keep data up-to-date

## Schema Design

### Artist Schema
```javascript
{
  spotify_id: String (unique),
  name: String (required),
  images: [{ url, height, width }],
  external_urls: { spotify: String },
  genres: [String],
  popularity: Number (0-100),
  followers: { href: String, total: Number },
  last_synced: Date,
  sync_source: String
}
```

### Album Schema
```javascript
{
  spotify_id: String (unique),
  name: String (required),
  album_type: String (album/single/compilation),
  total_tracks: Number,
  release_date: String,
  release_date_precision: String,
  artists: [ObjectId ref to Artist],
  images: [{ url, height, width }],
  external_urls: { spotify: String },
  genres: [String],
  popularity: Number (0-100),
  last_synced: Date,
  sync_source: String
}
```

### Song/Track Schema
```javascript
{
  spotify_id: String (unique),
  name: String (required),
  artists: [ObjectId ref to Artist],
  album: ObjectId ref to Album,
  duration_ms: Number,
  track_number: Number,
  disc_number: Number,
  explicit: Boolean,
  audio_features: {
    danceability, energy, key, loudness, mode,
    speechiness, acousticness, instrumentalness,
    liveness, valence, tempo, time_signature
  },
  external_urls: { spotify: String },
  preview_url: String,
  popularity: Number (0-100),
  last_synced: Date,
  sync_source: String
}
```

## Setup Instructions

### 1. Environment Variables
Ensure your `.env` file contains:
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
MONGO_URI=mongodb://127.0.0.1:27017/vinyl_demo
```

### 2. Install Dependencies
All required dependencies are already in your `package.json`:
- `spotify-web-api-node` - Spotify API client
- `mongoose` - MongoDB ODM
- `dotenv` - Environment variables

## Usage

### Initial Data Population

#### Option 1: Command Line Script
```bash
# Navigate to server directory
cd server

# Sync data for a specific search query
node src/scripts/spotify-sync.js sync "The Beatles"

# Sync with custom options
node src/scripts/spotify-sync.js sync "Taylor Swift" --artistLimit=10 --albumLimit=20 --trackLimit=50
```

#### Option 2: API Endpoint
```bash
# POST /api/sync/sync
curl -X POST http://localhost:5000/api/sync/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "The Beatles",
    "options": {
      "artistLimit": 20,
      "albumLimit": 50,
      "trackLimit": 50,
      "includeAudioFeatures": true
    }
  }'
```

### Data Refresh
To update existing data with latest Spotify information:

#### Option 1: Command Line
```bash
node src/scripts/spotify-sync.js refresh
```

#### Option 2: API Endpoint
```bash
# POST /api/sync/refresh
curl -X POST http://localhost:5000/api/sync/refresh \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Check Sync Status
```bash
# GET /api/sync/status
curl http://localhost:5000/api/sync/status
```

## API Endpoints

### Artists
- `GET /api/artists` - Get all artists (with pagination, search, genre filters)
- `GET /api/artists/popular` - Get popular artists
- `GET /api/artists/genre?genre=rock` - Get artists by genre
- `GET /api/artists/spotify/:spotifyId` - Get artist by Spotify ID
- `GET /api/artists/:id` - Get artist by MongoDB ID
- `GET /api/artists/:id/albums` - Get artist's albums
- `GET /api/artists/:id/top-tracks` - Get artist's top tracks

### Albums
- `GET /api/albums` - Get all albums (with pagination, search, genre, year filters)
- `GET /api/albums/popular` - Get popular albums
- `GET /api/albums/genre?genre=pop` - Get albums by genre
- `GET /api/albums/year?year=2023` - Get albums by year
- `GET /api/albums/spotify/:spotifyId` - Get album by Spotify ID
- `GET /api/albums/:id` - Get album by MongoDB ID
- `GET /api/albums/:id/tracks` - Get album tracks

### Songs/Tracks
- `GET /api/songs` - Get all songs (with pagination, search, genre, year, artist, album filters)
- `GET /api/songs/popular` - Get popular songs
- `GET /api/songs/genre?genre=rock` - Get songs by genre
- `GET /api/songs/year?year=2023` - Get songs by year
- `GET /api/songs/search?q=love` - Search songs
- `GET /api/songs/spotify/:spotifyId` - Get song by Spotify ID
- `GET /api/songs/:id` - Get song by MongoDB ID
- `GET /api/songs/:id/lyrics` - Get song lyrics
- `POST /api/songs/:id/play` - Increment play count

## Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### Sorting
- `sort` - Sort field with prefix (- for desc, + for asc)
  - Examples: `-popularity`, `name`, `-release_date`

### Filtering
- `search` - Text search across name/title fields
- `genre` - Filter by genre
- `year` - Filter by release year
- `artist` - Filter by artist ID
- `album` - Filter by album ID

### Examples
```bash
# Get popular rock artists from 2023, page 2, 10 per page
GET /api/artists?genre=rock&year=2023&sort=-popularity&page=2&limit=10

# Search for songs containing "love"
GET /api/songs?search=love

# Get albums by Taylor Swift
GET /api/albums?artist=ARTIST_MONGODB_ID
```

## Data Sync Process

The sync process follows this workflow:

1. **Search Artists** - Search Spotify for artists matching the query
2. **Sync Artists** - Create/update artist records in MongoDB
3. **Fetch Albums** - Get all albums for each artist
4. **Sync Albums** - Create/update album records with artist references
5. **Fetch Tracks** - Get all tracks for each album
6. **Sync Tracks** - Create/update track records with artist and album references
7. **Audio Features** - Optionally fetch and store audio features for tracks

## Migration Strategy

### Phase 1: Initial Setup
1. Run the sync script to populate your database with initial data
2. Test the new MongoDB-based endpoints
3. Verify data integrity and relationships

### Phase 2: Frontend Updates
1. Update your frontend to use the new MongoDB-based endpoints
2. Remove direct Spotify API calls from frontend
3. Test all functionality

### Phase 3: Cleanup
1. Remove or deprecate old Spotify-based endpoints
2. Set up scheduled refresh jobs if needed
3. Monitor performance and optimize queries

## Performance Considerations

### Indexing
The schemas include optimized indexes for:
- Text search (`name`, `genres`)
- Popularity sorting
- Spotify ID lookups
- Relationship queries

### Caching
Consider implementing caching for:
- Popular artists/albums/songs
- Search results
- Frequently accessed data

### Pagination
All list endpoints support pagination to handle large datasets efficiently.

## Error Handling

The system includes comprehensive error handling:
- Database connection errors
- Spotify API rate limiting
- Invalid data formats
- Missing required fields

## Monitoring

### Sync Status
Use `/api/sync/status` to monitor:
- Total synced records
- Last sync timestamp
- Data freshness

### Logs
The sync script provides detailed logging for:
- Sync progress
- Error conditions
- Performance metrics

## Troubleshooting

### Common Issues

1. **Spotify API Rate Limits**
   - The sync script includes automatic retry logic
   - Consider reducing batch sizes for large syncs

2. **MongoDB Connection Issues**
   - Verify MongoDB is running
   - Check connection string in `.env`

3. **Missing Data**
   - Ensure Spotify credentials are correct
   - Check if data exists in Spotify for your search queries

4. **Performance Issues**
   - Use pagination for large datasets
   - Consider adding more specific indexes
   - Monitor query performance

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=spotify-sync:*
```

## Future Enhancements

Consider implementing:
- Scheduled sync jobs (cron)
- Incremental sync (only new/changed data)
- Data validation and cleanup
- Analytics and reporting
- Backup and restore procedures

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment variables
3. Test with smaller datasets first
4. Review the API documentation above
