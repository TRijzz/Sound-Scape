import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import artistRoutes from './src/routes/artist.routes.js';
import songRoutes from './src/routes/song.routes.js';
import albumRoutes from './src/routes/album.routes.js';
import playlistRoutes from './src/routes/playlist.routes.js';
import syncRoutes from './src/routes/sync.routes.js';
// Import Spotify routes using ES modules syntax
import spotifyRoutes from './src/routes/spotify.routes.js';
// Import scheduler for automatic data refresh
import { scheduleDataRefresh } from './src/scripts/scheduler.js';



const app = express();
dotenv.config();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT || 5000;

// DB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
    // Start the data refresh scheduler
    scheduleDataRefresh();
  });
});

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running on Render!" });
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/sync', syncRoutes);
// Make sure this line is present and correct
app.use('/api/spotify', spotifyRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});
