import cron from 'node-cron';
import { refreshData } from './spotify-sync.js';
import { connectDB } from '../config/db.js';

// Schedule data refresh
const scheduleDataRefresh = () => {
  console.log('Setting up data refresh schedule...');
  
  // Refresh data every 24 hours at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled data refresh...');
    try {
      await connectDB();
      await refreshData();
      console.log('Scheduled data refresh completed successfully');
    } catch (error) {
      console.error('Scheduled data refresh failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Refresh data every 6 hours for popular artists
  cron.schedule('0 */6 * * *', async () => {
    console.log('Starting scheduled popular artists refresh...');
    try {
      await connectDB();
      // You can customize this to only refresh popular artists
      await refreshData();
      console.log('Scheduled popular artists refresh completed successfully');
    } catch (error) {
      console.error('Scheduled popular artists refresh failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  console.log('Data refresh schedule set up successfully');
  console.log('- Full refresh: Every 24 hours at 2 AM UTC');
  console.log('- Popular artists refresh: Every 6 hours');
};

export { scheduleDataRefresh };
