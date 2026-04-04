import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import artistRoutes from './src/routes/artist.routes.js';
import songRoutes from './src/routes/song.routes.js';
import albumRoutes from './src/routes/album.routes.js';
import playlistRoutes from './src/routes/playlist.routes.js';
import genreRoutes from './src/routes/genre.routes.js'; // Added genre routes
import notificationRoutes from './src/routes/notification.routes.js'; // Added notification routes
import categoryRoutes from './src/routes/category.routes.js';
import syncRoutes from './src/routes/sync.routes.js';
import spotifyRoutes from './src/routes/spotify.routes.js';
import lyricRoutes from './src/routes/lyric.routes.js';
import vinylRoutes from './src/routes/vinyl.routes.js';
// Lyric routes imported
import { scheduleDataRefresh } from './src/scripts/scheduler.js';
import './src/config/passport.js';

const app = express();
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

app.use(cors({ 
  origin: true, 
  credentials: true, 
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-code'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for local development and SSE
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));
app.use(passport.initialize());

const PORT = process.env.PORT || 5000;

// DB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
    console.log('Server restarted and ready for file uploads!');
    scheduleDataRefresh();
    const autoEnv = String(process.env.AUTO_OPEN || '').toLowerCase();
    const shouldOpen = autoEnv === 'true';
    if (shouldOpen) {
      const url = `http://localhost:${PORT}/`;
      const platform = process.platform;
      const cmds = platform === 'win32'
        ? [
            `cmd /c start "" "${url}"`,
            `powershell -NoProfile -Command Start-Process '${url}'`,
            `rundll32 url.dll,FileProtocolHandler "${url}"`
          ]
        : platform === 'darwin'
          ? [`open "${url}"`]
          : [`xdg-open "${url}"`];
      let i = 0;
      const run = () => {
        try {
          exec(cmds[i], (err) => { if (err && i + 1 < cmds.length) { i++; run(); } });
        } catch (e) {
          if (i + 1 < cmds.length) { i++; run(); }
        }
      };
      setTimeout(run, 300);
    }
  });
});

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running on Render!" });
});

// Placeholder image (SVG) for missing artwork
app.get(/^\/api\/placeholder\/(\d+)\/(\d+)$/, (req, res) => {
  const m = req.path.match(/^\/api\/placeholder\/(\d+)\/(\d+)$/);
  const w = Math.max(1, Math.min(1024, parseInt(m?.[1] || '100', 10)));
  const h = Math.max(1, Math.min(1024, parseInt(m?.[2] || '100', 10)));

  const bg = '#1f2937';
  const fg = '#6b7280';
  const stroke = Math.max(2, Math.floor(Math.min(w, h) / 50));
  const r = Math.floor(Math.min(w, h) / 4);
  const fontSize = Math.max(10, Math.floor(Math.min(w, h) / 8));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="${bg}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)" />
  <rect x="${w*0.15}" y="${h*0.15}" width="${w*0.7}" height="${h*0.7}" rx="${Math.min(w,h)*0.05}" fill="none" stroke="${fg}" stroke-width="${stroke}" />
  <circle cx="${w/2}" cy="${h/2}" r="${r}" fill="none" stroke="${fg}" stroke-width="${stroke}" />
  <circle cx="${w/2}" cy="${h/2}" r="${Math.max(2, Math.floor(r/6))}" fill="${fg}" />
  <text x="50%" y="${h-10}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" fill="${fg}" opacity="0.8">No Image</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});
app.get('/api/placeholder/:width/:height', (req, res) => {
  const w = Math.max(1, Math.min(1024, parseInt(req.params.width, 10) || 100));
  const h = Math.max(1, Math.min(1024, parseInt(req.params.height, 10) || 100));

  const bg = '#1f2937'; // dark gray
  const fg = '#6b7280'; // medium gray
  const stroke = Math.max(2, Math.floor(Math.min(w, h) / 50));
  const r = Math.floor(Math.min(w, h) / 4);
  const fontSize = Math.max(10, Math.floor(Math.min(w, h) / 8));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="${bg}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)" />
  <rect x="${w*0.15}" y="${h*0.15}" width="${w*0.7}" height="${h*0.7}" rx="${Math.min(w,h)*0.05}" fill="none" stroke="${fg}" stroke-width="${stroke}" />
  <circle cx="${w/2}" cy="${h/2}" r="${r}" fill="none" stroke="${fg}" stroke-width="${stroke}" />
  <circle cx="${w/2}" cy="${h/2}" r="${Math.max(2, Math.floor(r/6))}" fill="${fg}" />
  <text x="50%" y="${h-10}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" fill="${fg}" opacity="0.8">No Image</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Support wildcard size as single param to handle `/api/placeholder/40/40`

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/genres', genreRoutes); // Added genre routes
app.use('/api/admin/notifications', notificationRoutes); // Added notification routes
app.use('/api/categories', categoryRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/lyrics', lyricRoutes);
app.use('/api/vinyls', vinylRoutes);
// Khalti payment routes are intentionally disabled for now until the payment flow is resumed.

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.resolve(__dirname, '../build');
  app.use(express.static(buildPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // In development, redirect non-API GET requests to the frontend dev server
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      const frontendUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}${req.path}${req.query ? '?' + new URLSearchParams(req.query).toString() : ''}`;
      return res.redirect(redirectUrl);
    }
    next();
  });
}

// 404 / Error - only catch API routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ message: 'Not Found' });
  } else if (process.env.NODE_ENV === 'production') {
    // In production, if we reach here, the static file serving should have handled it
    // But just in case, send the index.html
    const buildPath = path.resolve(__dirname, '../build');
    res.sendFile(path.join(buildPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({ message: 'Not Found' });
      }
    });
  } else {
    // This shouldn't be reached in development due to redirect above
    res.status(404).json({ 
      message: 'Not Found. This is the backend server. Please access the frontend at http://localhost:3000' 
    });
  }
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});
