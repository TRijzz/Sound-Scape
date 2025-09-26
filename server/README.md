# Vinyl Demo Backend (Node.js + Express + MongoDB)

Run a simple music streaming backend with JWT auth and CRUD for Users, Artists, Songs, and Playlists.

## Setup

1. Create `.env` inside `server/`:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/vinyl_demo
JWT_SECRET=super_secret_change_me
```

2. Install and start:

```
cd server
npm install
npm run dev
```

Health check: `GET http://localhost:5000/health`

## Folder structure

```
server/
  src/
    config/
      db.js
    controllers/
      auth.controller.js
      user.controller.js
      artist.controller.js
      song.controller.js
      playlist.controller.js
    middlewares/
      auth.js
    models/
      User.js
      Artist.js
      Song.js
      Playlist.js
    routes/
      auth.routes.js
      user.routes.js
      artist.routes.js
      song.routes.js
      playlist.routes.js
    index.js
  .env
  package.json
  README.md
```

## Database schemas (Mongoose)

- User
  - name: String (required)
  - email: String (required, unique)
  - password: String (hashed)
  - avatar_url: String

- Artist
  - name: String (required)
  - bio: String
  - image_url: String

- Song
  - title: String (required)
  - artist: ObjectId -> Artist (required)
  - album: String
  - duration: Number (seconds, required)
  - cover_art_url: String
  - audio_url: String (required)
  - lyrics: String
  - play_count: Number (default 0)

- Playlist
  - name: String (required)
  - description: String
  - user: ObjectId -> User (required)
  - songs: [ObjectId -> Song]
  - is_public: Boolean (default false)

## Auth

- POST /api/auth/signup
  - body: { name, email, password }
  - 201: { token, user }
- POST /api/auth/login
  - body: { email, password }
  - 200: { token, user }

Use `Authorization: Bearer <token>` for protected endpoints.

## Users

- GET /api/users -> list users
- GET /api/users/:id -> get user by id
- PUT /api/users/:id [auth] -> update name/avatar_url
- DELETE /api/users/:id [auth] -> delete user
- GET /api/users/me [auth] -> current user

## Artists

- POST /api/artists [auth] -> create
- GET /api/artists -> list
- GET /api/artists/:id -> get
- PUT /api/artists/:id [auth] -> update
- DELETE /api/artists/:id [auth] -> delete

## Songs

- POST /api/songs [auth] -> create
  - body: { title, artist, album?, duration, cover_art_url?, audio_url }
- GET /api/songs -> list (populates artist)
- GET /api/songs/:id -> get (populates artist)
- PUT /api/songs/:id [auth] -> update
- DELETE /api/songs/:id [auth] -> delete
- POST /api/songs/:id/play -> increment play_count
- GET /api/songs/:id/lyrics -> get song lyrics
- PUT /api/songs/:id/lyrics [auth] -> update song lyrics

## Playlists

- POST /api/playlists [auth] -> create (auto user from token)
- GET /api/playlists/me [auth] -> my playlists
- GET /api/playlists/:id [auth] -> get
- PUT /api/playlists/:id [auth] -> update
- DELETE /api/playlists/:id [auth] -> delete
- POST /api/playlists/:id/songs [auth] -> { songId }
- DELETE /api/playlists/:id/songs [auth] -> { songId }

## Example cURL

```
# signup/login
curl -sX POST http://localhost:5000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"pass1234"}'

# create artist
curl -sX POST http://localhost:5000/api/artists \
  -H 'Authorization: Bearer TOKEN' -H 'Content-Type: application/json' \
  -d '{"name":"Artist A","bio":"bio","image_url":"https://img"}'
```
