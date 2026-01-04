# Vinyl Demo Music Streaming Platform - Complete System Explanation

## 🎵 Overview

**Vinyl Demo** is a full-stack music streaming application that combines a modern React frontend with a Node.js/Express/MongoDB backend, integrated with the Spotify API for music data. The application features a vinyl record-themed UI with real audio playback capabilities.

---

## 🏗️ System Architecture

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React App  │→ │ Music Context│→ │ Audio Player │     │
│  │   (Routes)   │  │   (State)    │  │   (HTML5)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                                                  │
│         │ HTTP/REST API                                    │
│         ▼                                                  │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ JSON Requests/Responses
                        │
┌─────────────────────────────────────────────────────────────┐
│           Backend (Node.js + Express)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Routes     │→ │ Controllers  │→ │   Models     │     │
│  │   (API)      │  │  (Business)  │  │  (Mongoose)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                                  │                │
│         │                                  ▼                │
│         │                          ┌──────────────┐        │
│         │                          │   MongoDB    │        │
│         │                          │  Database    │        │
│         │                          └──────────────┘        │
│         │                                                  │
│         │ OAuth2 API                                       │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │  Spotify API │                                          │
│  │  (Sync Data) │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

### **Frontend Structure** (`src/`)

```
src/
├── components/
│   ├── layout/               # Layout components
│   │   ├── Navbar.jsx        # Top navigation bar
│   │   ├── Sidebar.jsx       # Left sidebar navigation
│   │   └── NowPlayingFooter.jsx  # Bottom player footer
│   └── ui/                   # Reusable UI components
│       ├── Button.jsx
│       ├── Modal.jsx
│       └── VinylPlayer.jsx   # Vinyl record animation
│
├── pages/                    # Route pages
│   ├── HomePage.jsx          # Home/dashboard
│   ├── SearchResultsPage.jsx # Search results
│   ├── ArtistPage.jsx        # Artist detail page
│   ├── AlbumPage.jsx         # Album detail page
│   ├── PlaylistPage.jsx      # Playlist view
│   ├── LikedSongs.jsx        # User's liked songs
│   ├── LibraryPage.jsx       # User's library
│   ├── SettingsPage.jsx      # User settings
│   ├── auth/                 # Authentication pages
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── EmailVerification.jsx
│   └── admin/                # Admin pages
│       ├── AdminArtists.jsx
│       ├── AdminAlbums.jsx
│       └── AdminSongs.jsx
│
├── contexts/
│   └── MusicContext.js       # Global music state management
│
├── hooks/                    # Custom React hooks
│   ├── useAudioPlayer.js     # HTML5 audio player logic
│   ├── useAuth.js            # Authentication logic
│   ├── useMusicData.js       # Music data fetching
│   └── usePlaylists.js       # Playlist management
│
├── services/
│   └── api.js                # API service layer
│
├── assets/                   # Images, SVGs
│   ├── vinyl.svg
│   ├── tonearm.svg
│   └── album_art_placeholder.svg
│
├── App.jsx                   # Main app component (routing)
└── index.js                  # App entry point
```

### **Backend Structure** (`server/src/`)

```
server/
├── src/
│   ├── config/               # Configuration files
│   │   ├── db.js            # MongoDB connection
│   │   ├── passport.js      # Google OAuth setup
│   │   └── email.js         # Email service config
│   │
│   ├── models/               # Mongoose schemas
│   │   ├── User.js          # User model
│   │   ├── Artist.js        # Artist model
│   │   ├── Album.js         # Album model
│   │   ├── Song.js          # Song/Track model
│   │   ├── Playlist.js      # Playlist model
│   │   ├── Category.js      # Category model
│   │   └── LikedSong.js     # Liked songs junction
│   │
│   ├── controllers/          # Business logic
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── artist.controller.js
│   │   ├── album.controller.js
│   │   ├── song.controller.js
│   │   ├── playlist.controller.js
│   │   ├── category.controller.js
│   │   ├── spotify.controller.js
│   │   └── sync.controller.js
│   │
│   ├── routes/               # API route definitions
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── artist.routes.js
│   │   ├── album.routes.js
│   │   ├── song.routes.js
│   │   ├── playlist.routes.js
│   │   ├── category.routes.js
│   │   ├── spotify.routes.js
│   │   └── sync.routes.js
│   │
│   ├── middlewares/          # Express middlewares
│   │   ├── auth.js          # JWT authentication
│   │   └── admin.js         # Admin authorization
│   │
│   └── scripts/              # Utility scripts
│       ├── spotify-sync.js  # Spotify data sync
│       ├── scheduler.js     # Scheduled tasks
│       └── fix-database.js  # DB maintenance
│
├── index.js                  # Express server entry point
└── package.json
```

---

## 🔄 Data Flow

### **1. Authentication Flow**

```
User Action (Login/Signup)
    │
    ▼
Frontend: LoginPage.jsx
    │
    ▼
API Service: api.js → POST /api/auth/login
    │
    ▼
Backend: auth.routes.js → auth.controller.js
    │
    ▼
Database: User Model → Verify credentials
    │
    ▼
Generate JWT Token (access + refresh)
    │
    ▼
Return token + user data
    │
    ▼
Frontend: Store token in localStorage
    │
    ▼
Update MusicContext with user state
```

### **2. Music Playback Flow**

```
User Clicks Song
    │
    ▼
Component calls: playTrack(track)
    │
    ▼
MusicContext.playTrack()
    │
    ▼
useAudioPlayer.playTrack()
    │
    ▼
Create HTML5 Audio Element
    │
    ▼
Load audio URL (from track.audio_url or preview_url)
    │
    ▼
Audio Element Events:
  - loadedmetadata → Set duration
  - timeupdate → Update progress
  - play/pause → Update playing state
    │
    ▼
Sync state back to MusicContext
    │
    ▼
Update UI (NowPlayingFooter, Vinyl animation)
```

### **3. Spotify Data Sync Flow**

```
Admin/Scheduler triggers sync
    │
    ▼
POST /api/sync/sync { query: "Artist Name" }
    │
    ▼
sync.controller.js
    │
    ▼
SpotifySyncService.completeSync()
    │
    ├─→ Search Spotify API for artists
    ├─→ Sync artist data → MongoDB
    ├─→ For each artist: Sync albums → MongoDB
    ├─→ For each album: Sync tracks → MongoDB
    └─→ Optionally: Sync audio features → MongoDB
    │
    ▼
Store all data in MongoDB with spotify_id references
    │
    ▼
Return sync statistics
```

### **4. Search Flow**

```
User Types Search Query
    │
    ▼
SearchResultsPage.jsx
    │
    ▼
API Service: GET /api/songs?search=query
    │
    ▼
Backend: song.routes.js → song.controller.js
    │
    ▼
MongoDB: Query songs/artists/albums
    │
    ├─→ Text search on name/title fields
    ├─→ Filter by genre/category
    └─→ Populate artist/album relationships
    │
    ▼
Return search results
    │
    ▼
Frontend: Display results with play buttons
    │
    ▼
User clicks song → Playback flow
```

---

## 🎨 Frontend Architecture Details

### **1. State Management: MusicContext**

The `MusicContext` is the central state management system for the entire app:

**State Structure:**
```javascript
{
  currentTrack: Song | null,      // Currently playing track
  isPlaying: boolean,              // Play/pause state
  progress: number,                // Current playback position (seconds)
  duration: number,                // Total track duration (seconds)
  volume: number,                  // Volume level (0-100)
  queue: Song[],                   // Playback queue
  currentIndex: number,            // Index in queue
  user: User | null,               // Current user
  isAuthenticated: boolean,        // Auth status
  repeatMode: 'off' | 'all' | 'one',  // Repeat settings
  likedSongs: Set<string>,         // Liked song IDs
  showAuthPrompt: boolean          // Show auth modal
}
```

**Key Functions:**
- `playTrack(track)` - Play a track
- `pauseTrack()` - Pause playback
- `resumeTrack()` - Resume playback
- `nextTrack()` - Play next in queue
- `previousTrack()` - Play previous in queue
- `setProgress(seconds)` - Seek to position
- `setVolume(0-100)` - Set volume
- `toggleLike(songId)` - Like/unlike song
- `setRepeatMode(mode)` - Set repeat mode
- `login(credentials)` - User login
- `logout()` - User logout

### **2. Audio Player: useAudioPlayer Hook**

The `useAudioPlayer` hook manages the actual HTML5 audio playback:

**Features:**
- Creates and manages HTML5 `<audio>` element
- Handles browser autoplay restrictions
- Manages audio loading states
- Tracks progress and duration
- Handles errors with fallback URLs
- Volume control with mute/unmute
- CORS support for cross-origin audio

**Key Implementation:**
```javascript
// Creates audio element
const audioRef = useRef(null);
audioRef.current = new Audio();

// Loads track
audioRef.current.src = track.audio_url || track.preview_url;
await audioRef.current.play();

// Updates progress
audio.addEventListener('timeupdate', () => {
  setProgress(Math.floor(audio.currentTime));
});
```

### **3. Routing: React Router**

The app uses React Router v7 for navigation:

**Main Routes:**
- `/` - HomePage
- `/search` - SearchResultsPage
- `/artist/:id` - ArtistPage
- `/album/:id` - AlbumPage
- `/playlist/:id` - PlaylistPage
- `/liked` - LikedSongs
- `/library` - LibraryPage
- `/login` - LoginPage
- `/signup` - SignupPage
- `/settings` - SettingsPage
- `/admin/*` - Admin pages (protected)

### **4. UI Components**

**Layout Components:**
- **Navbar**: Top navigation with search, user menu
- **Sidebar**: Left navigation (Home, Search, Library, Playlists)
- **NowPlayingFooter**: Bottom player bar with controls

**UI Components:**
- **VinylPlayer**: Animated vinyl record that spins when playing
- **Button**: Reusable button component
- **Modal**: Modal dialogs for playlists, auth, etc.

---

## 🔧 Backend Architecture Details

### **1. Database Models (Mongoose)**

**User Model:**
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  avatar_url: String,
  username: String,
  googleId: String,
  emailVerified: Boolean,
  likedSongs: [ObjectId → Song],
  preferred_genres: [String],
  // ... timestamps
}
```

**Song Model:**
```javascript
{
  spotify_id: String (unique, sparse),
  name: String (required),
  artists: [ObjectId → Artist],
  album: ObjectId → Album,
  duration_ms: Number,
  preview_url: String,
  audio_url: String,
  popularity: Number,
  audio_features: {
    danceability, energy, tempo, valence, ...
  },
  play_count: Number,
  category: String,
  genre: String,
  // ... timestamps
}
```

**Artist Model:**
```javascript
{
  spotify_id: String (unique, sparse),
  name: String (required),
  images: [{ url, height, width }],
  genres: [String],
  popularity: Number,
  followers: { total: Number },
  // ... timestamps
}
```

**Album Model:**
```javascript
{
  spotify_id: String (unique, sparse),
  name: String (required),
  artists: [ObjectId → Artist],
  images: [{ url, height, width }],
  release_date: String,
  total_tracks: Number,
  // ... timestamps
}
```

**Playlist Model:**
```javascript
{
  name: String (required),
  description: String,
  user: ObjectId → User (required),
  songs: [ObjectId → Song],
  is_public: Boolean,
  cover_art_url: String,
  // ... timestamps
}
```

### **2. Authentication System**

**JWT-Based Authentication:**
- Uses `jsonwebtoken` for token generation
- Two-token system: Access token (short-lived) + Refresh token (long-lived)
- Tokens stored in HTTP-only cookies or Authorization header
- Password hashing with `bcryptjs`

**Auth Middleware (`requireAuth`):**
```javascript
// Verifies JWT token from Authorization header
const token = req.headers.authorization?.split('Bearer ')[1];
const decoded = jwt.verify(token, JWT_SECRET);
req.user = decoded; // Attach user to request
```

**Google OAuth:**
- Uses Passport.js with `passport-google-oauth20`
- Allows users to sign in with Google account
- Creates/updates user in database

### **3. API Routes**

**Authentication Routes:**
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/google` - Google OAuth callback
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email address

**Song Routes:**
- `GET /api/songs` - List songs (with pagination, search, filters)
- `GET /api/songs/:id` - Get song by ID
- `POST /api/songs` - Create song (auth required)
- `PUT /api/songs/:id` - Update song (auth required)
- `DELETE /api/songs/:id` - Delete song (auth required)
- `POST /api/songs/:id/play` - Increment play count
- `GET /api/songs/:id/lyrics` - Get song lyrics

**Artist Routes:**
- `GET /api/artists` - List artists
- `GET /api/artists/:id` - Get artist by ID
- `GET /api/artists/:id/albums` - Get artist's albums
- `GET /api/artists/:id/top-tracks` - Get top tracks
- `POST /api/artists` - Create artist (auth required)

**Playlist Routes:**
- `GET /api/playlists/me` - Get user's playlists (auth required)
- `GET /api/playlists/:id` - Get playlist by ID
- `POST /api/playlists` - Create playlist (auth required)
- `PUT /api/playlists/:id` - Update playlist (auth required)
- `DELETE /api/playlists/:id` - Delete playlist (auth required)
- `POST /api/playlists/:id/songs` - Add song to playlist
- `DELETE /api/playlists/:id/songs/:songId` - Remove song

**Sync Routes:**
- `POST /api/sync/sync` - Sync data from Spotify
- `POST /api/sync/refresh` - Refresh existing data
- `GET /api/sync/status` - Get sync status

### **4. Spotify Integration**

**SpotifySyncService** (`server/src/scripts/spotify-sync.js`):

**Features:**
- Authenticates with Spotify using Client Credentials flow
- Searches for artists, albums, and tracks
- Syncs data to MongoDB with proper relationships
- Fetches audio features for tracks
- Handles rate limiting and pagination

**Sync Process:**
1. Search Spotify for artists matching query
2. For each artist:
   - Save artist to MongoDB
   - Fetch artist's albums from Spotify
   - For each album:
     - Save album to MongoDB
     - Fetch album's tracks from Spotify
     - Save tracks to MongoDB
     - Optionally fetch audio features

**Scheduler:**
- Uses `node-cron` for scheduled tasks
- Can automatically refresh data periodically
- Runs sync jobs in background

---

## 🔐 Security Features

### **Backend Security:**
- **Helmet.js**: Security headers
- **CORS**: Configured for frontend origin
- **Rate Limiting**: Express rate limiter
- **Input Validation**: Express-validator
- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **SQL Injection Protection**: Mongoose prevents injection
- **XSS Protection**: Helmet.js headers

### **Frontend Security:**
- **Token Storage**: localStorage (consider httpOnly cookies)
- **XSS Protection**: React automatically escapes content
- **CORS**: Handled by backend
- **Input Validation**: Client-side validation

---

## 🎵 Key Features

### **1. Music Playback**
- ✅ Real HTML5 audio playback
- ✅ Play/pause controls
- ✅ Seek/scrub through tracks
- ✅ Volume control with mute
- ✅ Next/previous track
- ✅ Shuffle and repeat modes
- ✅ Progress bar with time display
- ✅ Vinyl record animation

### **2. Search**
- ✅ Real-time search
- ✅ Search songs, artists, albums
- ✅ Category filtering
- ✅ Recent searches history
- ✅ Search suggestions

### **3. Playlists**
- ✅ Create/edit/delete playlists
- ✅ Add/remove songs
- ✅ Public/private playlists
- ✅ Playlist cover art
- ✅ Play entire playlists

### **4. User Features**
- ✅ User registration/login
- ✅ Google OAuth login
- ✅ Email verification
- ✅ Password reset
- ✅ User profiles
- ✅ Liked songs
- ✅ User preferences

### **5. Admin Features**
- ✅ Admin dashboard
- ✅ Manage artists
- ✅ Manage albums
- ✅ Manage songs
- ✅ Sync Spotify data
- ✅ Admin authentication

---

## 🚀 Technology Stack

### **Frontend:**
- **React 19** - UI library
- **React Router v7** - Routing
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **HTML5 Audio API** - Audio playback

### **Backend:**
- **Node.js** - Runtime
- **Express 5** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Passport.js** - OAuth
- **bcryptjs** - Password hashing
- **Spotify Web API Node** - Spotify integration
- **node-cron** - Scheduling
- **Nodemailer** - Email service

---

## 📦 Environment Setup

### **Frontend Environment:**
```env
# No required env vars (uses proxy to backend)
REACT_APP_API_URL=http://localhost:5000
```

### **Backend Environment (.env in server/):**
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/vinyl_demo
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

---

## 🔄 Data Synchronization

### **Spotify to MongoDB Sync:**

1. **Initial Sync:**
   - Admin triggers sync with search query
   - System searches Spotify API
   - Stores data in MongoDB
   - Creates relationships (artists → albums → songs)

2. **Data Refresh:**
   - Updates existing records
   - Fetches latest popularity scores
   - Updates audio features
   - Maintains referential integrity

3. **Scheduled Sync:**
   - Can run automatically via cron
   - Keeps data up-to-date
   - Handles rate limits gracefully

---

## 📱 User Experience Flow

### **New User Journey:**
1. Visit homepage → Browse music
2. Click song → Prompted to sign in (if not authenticated)
3. Sign up/Login → Account created
4. Email verification (optional)
5. Onboarding (preferences)
6. Full access to all features

### **Existing User Journey:**
1. Login → Token stored
2. Browse/Search music
3. Play songs → Audio plays
4. Create playlists → Add songs
5. Like songs → Saved to profile
6. Manage library → Playlists, liked songs

---

## 🎯 Key Design Patterns

### **1. Context API Pattern**
- Centralized state management
- Avoids prop drilling
- Single source of truth

### **2. Custom Hooks Pattern**
- Reusable logic
- Separation of concerns
- Easy testing

### **3. Service Layer Pattern**
- API calls abstracted
- Centralized error handling
- Easy to mock for testing

### **4. MVC Pattern (Backend)**
- Models: Database schemas
- Views: JSON responses
- Controllers: Business logic

### **5. Middleware Pattern**
- Authentication middleware
- Error handling middleware
- Request logging middleware

---

## 🔍 Performance Optimizations

### **Frontend:**
- React.memo for component memoization
- useMemo/useCallback for expensive computations
- Lazy loading for routes
- Image optimization
- Efficient state updates

### **Backend:**
- MongoDB indexes for fast queries
- Pagination for large datasets
- Population optimization
- Caching strategies
- Rate limiting

---

## 🐛 Error Handling

### **Frontend:**
- Try-catch blocks in async functions
- Error boundaries for React errors
- User-friendly error messages
- Fallback UI states

### **Backend:**
- Express error middleware
- Try-catch in controllers
- Validation errors
- Database error handling
- API error responses

---

## 📈 Future Enhancements

Potential features to add:
- Social features (follow users, share playlists)
- Radio/Discovery mode
- Lyrics display
- Music recommendations
- Offline playback (service workers)
- Real-time collaboration playlists
- Music video integration
- Podcast support
- Analytics dashboard

---

## 🎓 Summary

**Vinyl Demo** is a comprehensive music streaming platform that demonstrates:

1. **Full-stack development** with React and Node.js
2. **Database design** with MongoDB and Mongoose
3. **Authentication** with JWT and OAuth
4. **Third-party API integration** with Spotify
5. **Real-time audio playback** with HTML5 Audio API
6. **Modern UI/UX** with animations and responsive design
7. **State management** with React Context API
8. **RESTful API design** with Express
9. **Security best practices**
10. **Code organization** and architecture patterns

The system is production-ready with proper error handling, security measures, and a scalable architecture that can be extended with additional features.

