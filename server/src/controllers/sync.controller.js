import SpotifySyncService from '../scripts/spotify-sync.js';

// Initialize sync service
const syncService = new SpotifySyncService();

export const syncData = async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Initialize the service if not already done
    if (!syncService.spotifyApi.getAccessToken()) {
      await syncService.initialize();
    }

    const result = await syncService.completeSync(query, options);
    
    res.json({
      message: 'Data sync completed successfully',
      result
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      message: 'Failed to sync data', 
      error: error.message 
    });
  }
};

export const refreshData = async (req, res) => {
  try {
    // Initialize the service if not already done
    if (!syncService.spotifyApi.getAccessToken()) {
      await syncService.initialize();
    }

    await syncService.refreshData();
    
    res.json({
      message: 'Data refresh completed successfully'
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ 
      message: 'Failed to refresh data', 
      error: error.message 
    });
  }
};

export const getSyncStatus = async (req, res) => {
  try {
    const Artist = (await import('../models/Artist.js')).default;
    const Album = (await import('../models/Album.js')).default;
    const Song = (await import('../models/Song.js')).default;

    const stats = {
      artists: await Artist.countDocuments({ sync_source: 'spotify' }),
      albums: await Album.countDocuments({ sync_source: 'spotify' }),
      tracks: await Song.countDocuments({ sync_source: 'spotify' }),
      lastSync: await Artist.findOne({ sync_source: 'spotify' })
        .sort({ last_synced: -1 })
        .select('last_synced')
        .lean()
    };

    res.json({
      message: 'Sync status retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ 
      message: 'Failed to get sync status', 
      error: error.message 
    });
  }
};
