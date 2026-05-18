// API service for connecting to the MongoDB-based backend
const API_BASE_URL = '/api';

const normalizeFuzzyText = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const levenshteinDistance = (left = '', right = '') => {
  const a = normalizeFuzzyText(left);
  const b = normalizeFuzzyText(right);
  if (!a) return b.length;
  if (!b) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
};

const similarityScore = (query = '', candidate = '') => {
  const normalizedQuery = normalizeFuzzyText(query);
  const normalizedCandidate = normalizeFuzzyText(candidate);
  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedCandidate.includes(normalizedQuery)) return 1;

  const distance = levenshteinDistance(normalizedQuery, normalizedCandidate);
  const base = Math.max(normalizedQuery.length, normalizedCandidate.length) || 1;
  return Math.max(0, 1 - distance / base);
};

const isVisibleArtistEntity = (artist) => artist && artist.is_visible !== false && artist.publish_status !== 'hidden';  //Visible and Hidden Artist Filter
const isVisibleAlbumEntity = (album) => album && album.is_visible !== false && album.publish_status !== 'hidden';
const isVisibleSongEntity = (song) => song && song.is_visible !== false && song.publish_status !== 'hidden';

const filterVisibleArtists = (artists) => (
  Array.isArray(artists) ? artists.filter(isVisibleArtistEntity) : []
);

const getArtistVisibilityKey = (artist) => {
  if (!artist) return '';
  if (typeof artist === 'string') return `id:${artist}`;
  const id = String(artist._id || artist.id || '').trim();
  if (id) return `id:${id}`;
  const name = String(artist.name || '').trim().toLowerCase();
  return name ? `name:${name}` : '';
};

const getArtistNameVisibilityKey = (artist) => {
  const name = typeof artist === 'string' ? artist : artist?.name;
  const normalized = String(name || '').trim().toLowerCase();
  return normalized ? `name:${normalized}` : '';
};

const songHasHiddenArtistLink = (song, hiddenArtistLookup = null) => {
  const artists = Array.isArray(song?.artists) ? song.artists : [];
  return artists.some((artist) => {
    if (hiddenArtistLookup?.size) {
      const visibilityKey = getArtistVisibilityKey(artist);
      const nameKey = getArtistNameVisibilityKey(artist);
      if ((visibilityKey && hiddenArtistLookup.has(visibilityKey)) || (nameKey && hiddenArtistLookup.has(nameKey))) {
        return true;
      }
    }
    return !isVisibleArtistEntity(artist);
  });
};

const albumHasHiddenArtistLink = (album, hiddenArtistLookup = null) => {
  const artists = Array.isArray(album?.artists) ? album.artists : [];
  return artists.some((artist) => {
    if (hiddenArtistLookup?.size) {
      const visibilityKey = getArtistVisibilityKey(artist);
      const nameKey = getArtistNameVisibilityKey(artist);
      if ((visibilityKey && hiddenArtistLookup.has(visibilityKey)) || (nameKey && hiddenArtistLookup.has(nameKey))) {
        return true;
      }
    }
    return !isVisibleArtistEntity(artist);
  });
};

const songHasUploadedAudio = (song) => {
  const audioUrl = String(song?.audio_url || '').trim();
  const filePath = String(song?.file_path || '').trim();
  return Boolean(song?.has_uploaded_audio || audioUrl || filePath);
};

const sanitizeSongEntity = (song, hiddenArtistLookup = null) => {
  if (!song) return null;
  if (!isVisibleSongEntity(song)) return null;

  const keepAudioBackedSong = songHasHiddenArtistLink(song, hiddenArtistLookup) && songHasUploadedAudio(song);
  if (songHasHiddenArtistLink(song, hiddenArtistLookup) && !keepAudioBackedSong) return null;

  const nextSong = {
    ...song,
    artists: filterVisibleArtists(song.artists)
  };

  if (song.album && typeof song.album === 'object') {
    if (albumHasHiddenArtistLink(song.album, hiddenArtistLookup)) {
      nextSong.album = null;
    } else {
      nextSong.album = {
        ...song.album,
        artists: filterVisibleArtists(song.album.artists)
      };
    }
  }

  return nextSong;
};

const sanitizeAlbumEntity = (album, hiddenArtistLookup = null) => {
  if (!album || !isVisibleAlbumEntity(album) || albumHasHiddenArtistLink(album, hiddenArtistLookup)) return null;

  const nextAlbum = {
    ...album,
    artists: filterVisibleArtists(album.artists)
  };

  if (Array.isArray(album.tracks)) {
    nextAlbum.tracks = album.tracks
      .map((track) => sanitizeSongEntity(track, hiddenArtistLookup))
      .filter(Boolean);
  }

  return nextAlbum;
};

const sanitizeArtistEntity = (artist, hiddenArtistLookup = null) => {
  if (!artist || !isVisibleArtistEntity(artist)) return null;

  const nextArtist = { ...artist };

  if (Array.isArray(artist.top_tracks)) {
    nextArtist.top_tracks = artist.top_tracks
      .map((track) => sanitizeSongEntity(track, hiddenArtistLookup))
      .filter(Boolean);
  }

  if (Array.isArray(artist.albums)) {
    nextArtist.albums = artist.albums
      .map((album) => sanitizeAlbumEntity(album, hiddenArtistLookup))
      .filter(Boolean);
  }

  return nextArtist;
};

const sanitizeSongList = (songs, hiddenArtistLookup = null) => (
  Array.isArray(songs) ? songs.map((song) => sanitizeSongEntity(song, hiddenArtistLookup)).filter(Boolean) : []
);

const sanitizeAlbumList = (albums, hiddenArtistLookup = null) => (
  Array.isArray(albums) ? albums.map((album) => sanitizeAlbumEntity(album, hiddenArtistLookup)).filter(Boolean) : []
);

const sanitizeArtistList = (artists, hiddenArtistLookup = null) => (
  Array.isArray(artists) ? artists.map((artist) => sanitizeArtistEntity(artist, hiddenArtistLookup)).filter(Boolean) : []
);

class ApiService {
  constructor() {
    this.authToken = null;
    this.adminCode = null;
    this.artistVisibilityCache = null;
    this.artistVisibilityPromise = null;
  }

  shouldSanitizePublicContent() {             //Hides unhidden content filterinf in public
    if (typeof window === 'undefined') return true;
    return !window.location.pathname.startsWith('/admin');
  }

  async getHiddenArtistLookup() {
    if (!this.shouldSanitizePublicContent()) {
      return new Set();
    }

    if (this.artistVisibilityCache) {
      return this.artistVisibilityCache;
    }

    if (!this.artistVisibilityPromise) {
      this.artistVisibilityPromise = this.fetchData('/artists?page=1&limit=5000')
        .then((response) => {
          const artists = Array.isArray(response?.artists) ? response.artists : Array.isArray(response) ? response : [];
          const hiddenKeys = new Set();
          artists.forEach((artist) => {
            if (isVisibleArtistEntity(artist)) return;
            const visibilityKey = getArtistVisibilityKey(artist);
            const nameKey = getArtistNameVisibilityKey(artist);
            if (visibilityKey) hiddenKeys.add(visibilityKey);
            if (nameKey) hiddenKeys.add(nameKey);
          });
          this.artistVisibilityCache = hiddenKeys;
          return hiddenKeys;
        })
        .catch((error) => {
          console.error('Failed to build hidden artist lookup:', error);
          return new Set();
        })
        .finally(() => {
          this.artistVisibilityPromise = null;
        });
    }

    return this.artistVisibilityPromise;
  }

  async sanitizeSongs(songs) {
    if (!this.shouldSanitizePublicContent()) return Array.isArray(songs) ? songs : [];
    const hiddenArtistLookup = await this.getHiddenArtistLookup();
    return sanitizeSongList(songs, hiddenArtistLookup);
  }

  async sanitizeAlbums(albums) {
    if (!this.shouldSanitizePublicContent()) return Array.isArray(albums) ? albums : [];
    const hiddenArtistLookup = await this.getHiddenArtistLookup();
    return sanitizeAlbumList(albums, hiddenArtistLookup);
  }

  async sanitizeArtists(artists) {
    if (!this.shouldSanitizePublicContent()) return Array.isArray(artists) ? artists : [];
    const hiddenArtistLookup = await this.getHiddenArtistLookup();
    return sanitizeArtistList(artists, hiddenArtistLookup);
  }

  async sanitizeSong(song) {
    if (!this.shouldSanitizePublicContent()) return song;
    const hiddenArtistLookup = await this.getHiddenArtistLookup();
    return sanitizeSongEntity(song, hiddenArtistLookup);
  }

  async sanitizeAlbum(album) {
    if (!this.shouldSanitizePublicContent()) return album;
    const hiddenArtistLookup = await this.getHiddenArtistLookup();
    return sanitizeAlbumEntity(album, hiddenArtistLookup);
  }

  async sanitizeArtist(artist) {
    if (!this.shouldSanitizePublicContent()) return artist;
    const hiddenArtistLookup = await this.getHiddenArtistLookup();
    return sanitizeArtistEntity(artist, hiddenArtistLookup);
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  setAdminCode(code) {
    this.adminCode = code || null;
  }

  setAdminToken(token) {
    this.setAdminCode(token);
  }

  getAuthHeader() {
    if (!this.authToken) {
      try {
        const stored = localStorage.getItem('authTokens');
        if (stored) {
          const { accessToken } = JSON.parse(stored);
          this.authToken = accessToken;
        }
      } catch (e) {
        console.error('Error loading token from localStorage:', e);
      }
    }
    return this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {};
  }
  async refreshAccessToken() {
    try {
      const stored = localStorage.getItem('authTokens');
      if (!stored) throw new Error('No tokens');
      const { refreshToken } = JSON.parse(stored);
      if (!refreshToken) throw new Error('No refresh token');
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) {
        throw new Error((data && data.message) || 'Failed to refresh');
      }
      const { accessToken, refreshToken: newRefresh } = data || {};
      if (!accessToken) throw new Error('No access token');
      this.authToken = accessToken;
      const merged = { accessToken, refreshToken: newRefresh || refreshToken };
      localStorage.setItem('authTokens', JSON.stringify(merged));
      return accessToken;
    } catch (e) {
      localStorage.removeItem('authTokens');
      this.authToken = null;
      throw e;
    }
  }

  getLyrics(songId) {                                   // Fetches lyrics for a song by its ID from the backend.
    return this.fetchData(`/lyrics/${songId}`);
  }

  updateLyrics(songId, lyrics, synced = true) {
    return this.fetchData(`/lyrics/${songId}`, {
      method: 'POST',
      body: JSON.stringify({ lyrics, synced })
    });
  }

  async getGenres(limit = 100) {
    const response = await this.fetchData('/genres');
    const genres = Array.isArray(response) ? response : (response?.genres || []);
    const names = genres
      .map((genre) => {
        if (typeof genre === 'string') return genre.trim();
        return String(genre?.name || '').trim();
      })
      .filter(Boolean);

    return names.slice(0, limit);
  }

  getGenreStats() {                                   // Fetches genre-based playback analytics.
    return this.fetchData('/songs/genre-stats');
  }

  async fetchData(endpoint, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...(this.adminCode ? { 'x-admin-code': this.adminCode } : {}),
        ...(options.headers || {})
      };

      // If body is FormData, let the browser set the Content-Type with boundary
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Read body safely once, handle both success and error
      const raw = await response.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // non-JSON response
        data = null;
      }

      if (!response.ok) {
        const message = (data && data.message) || `HTTP error ${response.status}`;
        if (response.status === 401 && (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('expired'))) {
          try {
            await this.refreshAccessToken();
            const retryHeaders = {
              'Content-Type': 'application/json',
              ...this.getAuthHeader(),
              ...(this.adminCode ? { 'x-admin-code': this.adminCode } : {}),
              ...(options.headers || {})
            };

            if (options.body instanceof FormData) {
              delete retryHeaders['Content-Type'];
            }

            const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: retryHeaders });
            const retryRaw = await retryRes.text();
            const retryData = retryRaw ? JSON.parse(retryRaw) : null;
            if (!retryRes.ok) {
              const retryMsg = (retryData && retryData.message) || `HTTP error ${retryRes.status}`;
              const retryErr = new Error(retryMsg);
              retryErr.status = retryRes.status;
              retryErr.details = retryData;
              throw retryErr;
            }
            return retryData;
          } catch (refreshErr) {
            const err = new Error(message);
            err.status = response.status;
            err.details = data;
            throw err;
          }
        } else {
          const err = new Error(message);
          err.status = response.status;
          err.details = data;
          throw err;
        }
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Artists API
  async getPopularArtists(limit = 20) {
    const response = await this.fetchData(`/artists/popular?limit=${limit}`);
    return await this.sanitizeArtists(Array.isArray(response?.artists) ? response.artists : response);
  }

  async getArtistGenres(limit = 100) {
    const response = await this.fetchData(`/artists/genres?limit=${limit}`);
    return Array.isArray(response?.genres) ? response.genres : [];
  }

  async getArtists(page = 1, limit = 20, search = '', genre = '', adminAll = false) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    if (adminAll) params.append('admin_all', '1');
    
    const response = await this.fetchData(`/artists?${params}`);
    if (Array.isArray(response?.artists)) {
      return { ...response, artists: await this.sanitizeArtists(response.artists) };
    }
    return await this.sanitizeArtists(response);
  }

  async getArtist(id) {
    const response = await this.fetchData(`/artists/${id}`);
    return await this.sanitizeArtist(response);
  }

  async createArtist(payload) {
    return this.fetchData(`/artists`, {
      method: 'POST',
      body: payload instanceof FormData ? payload : JSON.stringify(payload)
    });
  }

  async updateArtist(id, updates) {
    return this.fetchData(`/artists/${id}`, {
      method: 'PUT',
      body: updates instanceof FormData ? updates : JSON.stringify(updates)
    });
  }

  async deleteArtist(id) {
    return this.fetchData(`/artists/${id}`, { method: 'DELETE' });
  }

  async getArtistAlbums(artistId, page = 1, limit = 20) {
    const response = await this.fetchData(`/artists/${artistId}/albums?page=${page}&limit=${limit}`);
    if (Array.isArray(response?.albums)) {
      return { ...response, albums: await this.sanitizeAlbums(response.albums) };
    }
    return await this.sanitizeAlbums(response);
  }

  async getArtistTopTracks(artistId, limit = 10) {
    const response = await this.fetchData(`/artists/${artistId}/top-tracks?limit=${limit}`);
    if (Array.isArray(response?.tracks)) {
      return { ...response, tracks: await this.sanitizeSongs(response.tracks) };
    }
    return await this.sanitizeSongs(response);
  }

  async populateArtistGenres({ dryRun = false, limit = 0 } = {}) {
    return this.fetchData(`/artists/populate-genres`, {
      method: 'POST',
      body: JSON.stringify({ dryRun, limit })
    });
  }

  // Songs API
  async getPopularSongs(limit = 20) {   //Popular Songs Display
    const response = await this.fetchData(`/songs/popular?limit=${limit}`);
    return await this.sanitizeSongs(Array.isArray(response?.songs) ? response.songs : response);
  }

  async getPersonalizedRecommendations(limit = 12) {          //Recommendations based on listening history and preferences
    const response = await this.fetchData(`/songs/recommendations?limit=${limit}`);
    return {
      ...response,
      tracks: await this.sanitizeSongs(response?.tracks)
    };
  }

  async getListeningAnalytics() {
    return this.fetchData('/songs/analytics/me');
  }

  async getSongs(page = 1, limit = 20, search = '', genre = '', year = '', artist = '', album = '', sort = '-popularity', mood = '', language = '', tags = '', category = '', hasAudio = false, adminAll = false) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort,
    });
    
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    if (year) params.append('year', year);
    if (artist) params.append('artist', artist);
    if (album) params.append('album', album);
    if (mood) params.append('mood', mood);
    if (language) params.append('language', language);
    if (tags) params.append('tags', Array.isArray(tags) ? tags.join(',') : tags);
    if (category) params.append('category', category);
    if (hasAudio) params.append('has_audio', 'true');
    if (adminAll) params.append('admin_all', '1');
    
    const response = await this.fetchData(`/songs?${params}`);
    if (Array.isArray(response?.songs)) {
      return { ...response, songs: await this.sanitizeSongs(response.songs) };
    }
    return await this.sanitizeSongs(response);
  }

  async getSongsByGenre(genre, limit = 20) {          // Songs by genre
    const response = await this.fetchData(`/songs/genre?genre=${encodeURIComponent(genre)}&limit=${limit}`);
    if (Array.isArray(response?.songs)) {
      return { ...response, songs: await this.sanitizeSongs(response.songs) };
    }
    return await this.sanitizeSongs(response);
  }

  async searchSongs(query, limit = 20) {        // Search songs
    const response = await this.fetchData(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return await this.sanitizeSongs(Array.isArray(response?.songs) ? response.songs : response);
  }

  async getSong(id) {                     //Particular Search Song
    const response = await this.fetchData(`/songs/${id}`);
    return await this.sanitizeSong(response);
  }

  async getSongMoods() {              //Fetches list of moods for songs
    return this.fetchData('/songs/moods');
  }

  async getAudioInventory() {
    return this.fetchData('/songs/audio-inventory');
  }

  async playSong(songId) {
    return this.fetchData(`/songs/${songId}/play`, { method: 'POST' });
  }

  async createSong(payload) {
    const isFormData = payload instanceof FormData;
    return this.fetchData(`/songs`, {
      method: 'POST',
      body: isFormData ? payload : JSON.stringify(payload)
    });
  }

  async updateSong(id, updates) {
    const isFormData = updates instanceof FormData;
    return this.fetchData(`/songs/${id}`, {
      method: 'PUT',
      body: isFormData ? updates : JSON.stringify(updates)
    });
  }

  async deleteSong(id) {
    return this.fetchData(`/songs/${id}`, { method: 'DELETE' });
  }

  // Albums API
  async getPopularAlbums(limit = 20) {      //Poplular Albums Dispay
    const response = await this.fetchData(`/albums/popular?limit=${limit}`);
    return await this.sanitizeAlbums(Array.isArray(response?.albums) ? response.albums : response);
  }

  async getAlbums(page = 1, limit = 20, search = '', genre = '', year = '', sort = '-release_date', adminAll = false) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort,
    });
    
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    if (year) params.append('year', year);
    if (adminAll) params.append('admin_all', '1');
    
    const response = await this.fetchData(`/albums?${params}`);
    if (Array.isArray(response?.albums)) {
      return { ...response, albums: await this.sanitizeAlbums(response.albums) };
    }
    return await this.sanitizeAlbums(response);
  }

  async getAlbum(id) {
    const response = await this.fetchData(`/albums/${id}`);
    return await this.sanitizeAlbum(response);
  }

  async getAlbumTracks(albumId, page = 1, limit = 50) {
    const response = await this.fetchData(`/albums/${albumId}/tracks?page=${page}&limit=${limit}`);
    if (Array.isArray(response?.tracks)) {
      return { ...response, tracks: await this.sanitizeSongs(response.tracks) };
    }
    return await this.sanitizeSongs(response);
  }

  async createAlbum(payload) {
    const isFormData = payload instanceof FormData;
    return this.fetchData(`/albums`, {
      method: 'POST',
      body: isFormData ? payload : JSON.stringify(payload)
    });
  }

  async updateAlbum(id, updates) {
    const isFormData = updates instanceof FormData;
    return this.fetchData(`/albums/${id}`, {
      method: 'PUT',
      body: isFormData ? updates : JSON.stringify(updates)
    });
  }

  async deleteAlbum(id) {
    return this.fetchData(`/albums/${id}`, { method: 'DELETE' });
  }

  // Vinyl Store
  async getVinyls(page = 1, limit = 20, search = '', display_in_store = undefined, albumId = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.append('search', search);
    if (display_in_store !== undefined) params.append('display_in_store', String(display_in_store));
    if (albumId) params.append('albumId', albumId);
    const response = await this.fetchData(`/vinyls?${params.toString()}`);
    const vinyls = Array.isArray(response?.vinyls) ? response.vinyls : Array.isArray(response) ? response : [];
    const sanitizedVinyls = this.shouldSanitizePublicContent()
      ? vinyls.filter((vinyl) => !albumHasHiddenArtistLink(vinyl?.albumId))
      : vinyls;
    if (Array.isArray(response?.vinyls)) {
      return { ...response, vinyls: sanitizedVinyls };
    }
    return sanitizedVinyls;
  }

  async getVinyl(id) {
    const response = await this.fetchData(`/vinyls/${id}`);
    return this.shouldSanitizePublicContent() && albumHasHiddenArtistLink(response?.albumId) ? null : response;
  }

  async createVinyl(data) {
    const isFormData = data instanceof FormData;
    return this.fetchData('/vinyls', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async updateVinyl(id, updates) {
    const isFormData = updates instanceof FormData;
    return this.fetchData(`/vinyls/${id}`, {
      method: 'PUT',
      body: isFormData ? updates : JSON.stringify(updates)
    });
  }
  async deleteVinyl(id) {
    return this.fetchData(`/vinyls/${id}`, { method: 'DELETE' });
  }

  async purchaseVinyl(vinylId) {
    return this.fetchData('/users/purchase-vinyl', { method: 'POST', body: JSON.stringify({ vinylId }) });
  }

  async initiateKhaltiVinylPayment(vinylId) {
    return this.fetchData('/payments/khalti/initiate', {
      method: 'POST',
      body: JSON.stringify({ vinylId })
    });
  }

  async verifyKhaltiPayment(payload) {
    return this.fetchData('/payments/khalti/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async setActiveVinyl(vinylId) {
    return this.fetchData('/users/set-active-vinyl', {
      method: 'POST',
      body: JSON.stringify({ vinylId })
    });
  }

  // PlaylistsSearch API
  async searchAll(query, limit = 20) {
    try {
      // Ensure query is properly formatted
      const formattedQuery = query.trim();
      
      // Direct API calls with proper error handling
      let artistResults = [];
      let songResults = [];
      let albumResults = [];
      let userResults = [];
      let categoryResults = [];
      
      try {
        const artistsResponse = await this.fetchData(`/artists?search=${encodeURIComponent(formattedQuery)}&limit=${limit}`);
        artistResults = artistsResponse.artists || artistsResponse || [];
      } catch (err) {
        console.error('Artist search failed:', err);
      }
      
      try {
        songResults = await this.searchSongs(formattedQuery, limit) || [];
      } catch (err) {
        console.error('Song search failed:', err);
      }
      
      try {
        const albumsResponse = await this.fetchData(`/albums?search=${encodeURIComponent(formattedQuery)}&limit=${limit}`);
        albumResults = albumsResponse.albums || albumsResponse || [];
      } catch (err) {
        console.error('Album search failed:', err);
      }

      try {
        userResults = await this.searchUsers(formattedQuery, limit) || [];
      } catch (err) {
        console.error('User search failed:', err);
      }

      try {
        const categoriesResponse = await this.getCategories(formattedQuery);
        categoryResults = Array.isArray(categoriesResponse?.categories)
          ? categoriesResponse.categories
          : Array.isArray(categoriesResponse)
            ? categoriesResponse
            : [];
      } catch (err) {
        console.error('Category search failed:', err);
      }

      const normalizedResults = {
        artists: await this.sanitizeArtists(Array.isArray(artistResults) ? artistResults : []),
        songs: await this.sanitizeSongs(Array.isArray(songResults) ? songResults : []),
        albums: await this.sanitizeAlbums(Array.isArray(albumResults) ? albumResults : []),
        users: Array.isArray(userResults) ? userResults : [],
        categories: Array.isArray(categoryResults) ? categoryResults : []
      };

      const totalHits = normalizedResults.artists.length + normalizedResults.songs.length + normalizedResults.albums.length + normalizedResults.users.length + normalizedResults.categories.length;
      if (totalHits > 0) {
        return normalizedResults;
      }

      // Fuzzy fallback for typo-tolerant search
      const [songsFallback, artistsFallback, albumsFallback, categoriesFallback] = await Promise.all([
        this.getSongs(1, 200).catch(() => ({ songs: [] })),
        this.getArtists(1, 200).catch(() => ({ artists: [] })),
        this.getAlbums(1, 200).catch(() => ({ albums: [] })),
        this.getCategories().catch(() => []),
      ]);

      const rankItems = (items, labelGetter) => (Array.isArray(items) ? items : [])
        .map((item) => ({
          item,
          score: similarityScore(formattedQuery, labelGetter(item))
        }))
        .filter((entry) => entry.score >= 0.45)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map((entry) => entry.item);

      return {
        songs: await this.sanitizeSongs(rankItems(songsFallback?.songs || songsFallback || [], (song) => song?.name || song?.title || '')),
        artists: await this.sanitizeArtists(rankItems(artistsFallback?.artists || artistsFallback || [], (artist) => artist?.name || '')),
        albums: await this.sanitizeAlbums(rankItems(albumsFallback?.albums || albumsFallback || [], (album) => album?.name || '')),
        users: rankItems(userResults || [], (user) => user?.name || user?.username || ''),
        categories: rankItems(categoriesFallback?.categories || categoriesFallback || [], (category) => category?.name || '')
      };
    } catch (error) {
      console.error('API searchAll error:', error);
      // Return empty results instead of throwing to prevent UI errors
      return { artists: [], songs: [], albums: [], users: [], categories: [] };
    }
  }

  // Utility methods
  resolveMediaUrl(url = '') {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/src/')) return url;

    if (typeof window !== 'undefined' && /^\/(images|songs|lyrics)\//.test(url)) {
      const { protocol, hostname, port } = window.location;
      if (port === '3000') {
        return `${protocol}//${hostname}:5000${url}`;
      }
    }

    return url;
  }

  getImageUrl(images, size = 'medium') {
    if (!images || images.length === 0) {
      return '/src/assets/album_art_placeholder.svg';
    }

    // Find the best image size
    const sizeMap = {
      small: 64,
      medium: 300,
      large: 640,
    };

    const targetSize = sizeMap[size] || 300;
    const bestImage = images.find(img => img.width >= targetSize) || images[0];
    
    return this.resolveMediaUrl(bestImage.url);
  }

  // Lyrics: list existing
  async getLyricsList() {
    return this.fetchData('/lyrics');
  }

  // Lyrics: add new lyrics
  async addLyrics(songId, content, isSynced = false) {
    return this.fetchData(`/lyrics/${songId}`, {
      method: 'POST',
      body: JSON.stringify({ lyrics: content, synced: isSynced })
    });
  }

  // Lyrics: upload LRC file
  async uploadLyrics(songId, file) {
    const formData = new FormData();
    formData.append('lyrics', file);
    
    // We can't use fetchData because it sets Content-Type to application/json
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (this.adminCode) headers['x-admin-code'] = this.adminCode;

    const res = await fetch(`${API_BASE_URL}/lyrics/${songId}/import`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to upload lyrics');
    }
    return res.json();
  }

  async deleteLyrics(songId) {
    return this.fetchData(`/lyrics/${songId}`, { method: 'DELETE' });
  }

  formatDuration(durationMs) {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatDurationFromSeconds(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Likes (Liked Songs)
  async getLikedSongs() {
    const response = await this.fetchData('/users/me/likes');
    return await this.sanitizeSongs(Array.isArray(response?.songs) ? response.songs : response);
  }

  async likeSong(songId) {        //Likes the Song
    return this.fetchData('/users/me/likes', {
      method: 'POST',
      body: JSON.stringify({ songId })
    });
  }

  async unlikeSong(songId) {     //Unlikes the Song
    return this.fetchData('/users/me/likes', {
      method: 'DELETE',
      body: JSON.stringify({ songId })
    });
  }

  async getFollowedArtists() {
    return this.fetchData('/users/me/follows');
  }

  async followArtist(artistId) {
    return this.fetchData('/users/me/follows', {
      method: 'POST',
      body: JSON.stringify({ artistId })
    });
  }

  async unfollowArtist(artistId) {
    return this.fetchData('/users/me/follows', {
      method: 'DELETE',
      body: JSON.stringify({ artistId })
    });
  }

  async followUser(userId) {
    return this.fetchData('/users/me/user-follows', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async unfollowUser(userId) {
    return this.fetchData('/users/me/user-follows', {
      method: 'DELETE',
      body: JSON.stringify({ userId })
    });
  }

  // Playlists
  async getMyPlaylists() {
    const response = await this.fetchData('/playlists/me');
    const playlists = Array.isArray(response?.playlists) ? response.playlists : Array.isArray(response) ? response : [];
    return Promise.all(playlists.map(async (playlist) => ({
      ...playlist,
      songs: await this.sanitizeSongs(playlist?.songs)
    })));
  }

  async createPlaylist(payload) {     //Creates a NewPlaylist
    return this.fetchData('/playlists', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        is_public: payload?.is_public ?? (payload?.visibility === 'public')
      })
    });
  }

  async updatePlaylist(playlistId, updates) {
    return this.fetchData(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        is_public: updates?.is_public ?? (updates?.visibility === 'public')
      })
    });
  }

  async deletePlaylist(playlistId) {
    return this.fetchData(`/playlists/${playlistId}`, { method: 'DELETE' });
  }

  async getPlaylist(playlistId) {
    const response = await this.fetchData(`/playlists/${playlistId}`);
    return {
      ...response,
      songs: await this.sanitizeSongs(response?.songs)
    };
  }

  async addSongToPlaylist(playlistId, songId) {
    return this.fetchData(`/playlists/${playlistId}/songs`, {
      method: 'POST',
      body: JSON.stringify({ songId })
    });
  }

  async removeSongFromPlaylist(playlistId, songId) {
    return this.fetchData(`/playlists/${playlistId}/songs`, {
      method: 'DELETE',
      body: JSON.stringify({ songId })
    });
  }

  async getCategories(search = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return this.fetchData(`/categories?${params.toString()}`);
  }

  async getMyCategories() {
    return this.fetchData(`/categories/me`);
  }

  async createCategory(payload) {
    return this.fetchData(`/categories`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateCategory(id, updates) {
    return this.fetchData(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteCategory(id) {
    return this.fetchData(`/categories/${id}`, { method: 'DELETE' });
  }

  async addSongToCategory(id, songId) {
    return this.fetchData(`/categories/${id}/songs`, {
      method: 'POST',
      body: JSON.stringify({ songId })
    });
  }

  async removeSongFromCategory(id, songId) {
    return this.fetchData(`/categories/${id}/songs`, {
      method: 'DELETE',
      body: JSON.stringify({ songId })
    });
  }

  // Auth: Signup/Register
  async signup({ username, email, password, name }) {
    return this.fetchData(`/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: name || username,
        email,
        password,
        username
      })
    });
  }

  // Auth: Verify Email with code
  async verifyEmail({ email, code }) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || 'Verification failed');
        error.status = response.status;
        error.details = data;
        throw error;
      }
      if (data && data.accessToken) {
        this.setAuthToken(data.accessToken);
      }
      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Auth: Resend Verification Code
  async resendVerificationEmail(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          type: 'code',
          // Include any additional required fields here
        })
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const error = new Error(data.message || 'Failed to resend verification code');
        error.status = response.status;
        error.details = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  // Auth: Forgot Password
  async forgotPassword(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || 'Failed to send reset email');
        error.status = response.status;
        error.details = data;
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  // Auth: Reset Password
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || 'Failed to reset password');
        error.status = response.status;
        error.details = data;
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // Auth: Get current user
  async getCurrentUser() {
    try {
      return await this.fetchData('/users/me');
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      return null;
    }
  }

  async updateUser(id, updates) {
    return this.fetchData(`/users/id/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async getUsers() {
    return this.fetchData('/users');
  }

  async searchUsers(query, limit = 10) {
    const response = await this.fetchData(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return Array.isArray(response?.users) ? response.users : Array.isArray(response) ? response : [];
  }

  async getPublicUser(id) {
    return this.fetchData(`/users/public/${id}`);
  }

  async updateUserVinyls(id, payload) {
    return this.fetchData(`/users/id/${id}/vinyls`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // Auth: Login
  async login({ email, password }) {
    const response = await this.fetchData(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.accessToken) {
      this.setAuthToken(response.accessToken);
    }
    
    return response;
  }

  // Admin: Verify admin token
  async verifyAdminAccess(code) {
    return this.fetchData(`/auth/admin/verify`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  async loginAdmin({ username, password }) {
    const response = await this.fetchData(`/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (response.adminToken) this.setAdminToken(response.adminToken);
    return response;
  }

  async registerAdmin({ username, password, email }) {
    const normalizedUsername = String(username || '').trim();
    const response = await this.fetchData(`/auth/admin/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: normalizedUsername,
        password,
        name: normalizedUsername,
        email: email || undefined
      })
    });
    if (response.adminToken) this.setAdminToken(response.adminToken);
    return response;
  }

  async forgotAdminPassword(identifier) {
    return this.fetchData(`/auth/admin/password/forgot`, {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  }

  async resetAdminPassword(token, newPassword) {
    return this.fetchData(`/auth/admin/password/reset`, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  async populateSongCategories({ dryRun = false, limit = 1000, overwriteGenre = false, overwriteCategory = false } = {}) {
    return this.fetchData(`/songs/populate-categories`, {
      method: 'POST',
      body: JSON.stringify({ dryRun, limit, overwriteGenre, overwriteCategory })
    });
  }

  async syncFromFolders() {
    return this.fetchData(`/sync/folder-sync`, {
      method: 'POST'
    });
  }


  async getSongsByCategory(category, limit = 20) {
    const params = new URLSearchParams({ limit: String(limit), category });
    const response = await this.fetchData(`/songs?${params}`);
    if (Array.isArray(response?.songs)) {
      return { ...response, songs: await this.sanitizeSongs(response.songs) };
    }
    return await this.sanitizeSongs(response);
  }

  canonicalizeGenreList(list) {
    const normalize = (s) => String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\+/g, 'and')
      .replace(/[\s_]+/g, '-')
      .trim();
    const titleCase = (s) => String(s || '')
      .split(/[\s-]+/)
      .map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')
      .join(' ')
      .replace(/\bAnd\b/g, 'and')
      .replace(/\bRnb\b/g, 'R&B')
      .replace(/\bEdm\b/g, 'EDM')
      .replace(/\bK\b Pop/g, 'K-Pop');

    const map = {
      'hip-hop': 'Hip Hop',
      'hiphop': 'Hip Hop',
      'hip-hop-rap': 'Hip Hop',
      'rap': 'Hip Hop',
      'rai': 'Nepali',
      'nepali': 'Nepali',
      'rnb': 'R&B',
      'r-and-b': 'R&B',
      'r-b': 'R&B',
      'electronic': 'Electronic',
      'edm': 'EDM',
      'dance': 'Dance',
      'house': 'House',
      'techno': 'Techno',
      'trap': 'Trap',
      'pop': 'Pop',
      'rock': 'Rock',
      'alternative': 'Alternative',
      'alternative-rock': 'Alternative Rock',
      'indie': 'Indie',
      'indie-rock': 'Indie Rock',
      'metal': 'Metal',
      'jazz': 'Jazz',
      'classical': 'Classical',
      'country': 'Country',
      'blues': 'Blues',
      'reggae': 'Reggae',
      'folk': 'Folk',
      'k-pop': 'K-Pop',
      'kpop': 'K-Pop',
      'latin': 'Latin',
      'soul': 'Soul',
      'funk': 'Funk',
      'gospel': 'Gospel',
      'punk': 'Punk',
      'bollywood': 'Bollywood',
      'nepali-pop': 'Nepali Pop',
    };

    const seen = new Set();
    const out = [];
    for (const g of (Array.isArray(list) ? list : [])) {
      const key = normalize(g);
      const canonical = map[key] || titleCase(g);
      const uniqKey = canonical.toLowerCase();
      if (!uniqKey) continue;
      if (!seen.has(uniqKey)) {
        seen.add(uniqKey);
        out.push(canonical);
      }
    }
    return out;
  }
}

export default new ApiService();


