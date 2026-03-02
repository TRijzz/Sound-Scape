import { Router } from 'express';
import { subscribeAdmin, broadcastNotification } from '../controllers/notification.controller.js';
import { requireAdminOrAuth } from '../middlewares/admin.js';

const router = Router();

// Manual test trigger for notifications
router.get('/test-broadcast', (req, res) => {
  broadcastNotification({
    type: 'SONG_PLAYED',
    message: `🎵 TEST PLAY: "Success" by System`,
    storage_location: `📁 Storage Location: d:\\vinyl-demo\\test.mp3`,
    genre_info: `🏷️ Genre Identified: Debug`,
    analytics_info: `📊 Recorded listening history for genre: Debug`
  });
  res.json({ message: 'Broadcast triggered' });
});

// No admin check for test - only for debugging
router.get('/test-events', subscribeAdmin);

// Only admin can subscribe to real-time events
router.get('/events', requireAdminOrAuth, subscribeAdmin);

export default router;
