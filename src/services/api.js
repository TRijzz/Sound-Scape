// API service for connecting to the MongoDB-based backend
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.authToken = null;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  getAuthHeader() {
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

  async fetchData(endpoint, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...(options.headers || {})
      };

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
              ...(options.headers || {})
            };
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
    return this.fetchData(`/artists/popular?limit=${limit}`);
  }

  async getArtists(page = 1, limit = 20, search = '', genre = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    
    return this.fetchData(`/artists?${params}`);
  }

  async getArtist(id) {
    return this.fetchData(`/artists/${id}`);
  }

  async getArtistAlbums(artistId, page = 1, limit = 20) {
    return this.fetchData(`/artists/${artistId}/albums?page=${page}&limit=${limit}`);
  }

  async getArtistTopTracks(artistId, limit = 10) {
    return this.fetchData(`/artists/${artistId}/top-tracks?limit=${limit}`);
  }

  // Songs API
  async getPopularSongs(limit = 20) {
    return this.fetchData(`/songs/popular?limit=${limit}`);
  }

  async getSongs(page = 1, limit = 20, search = '', genre = '', year = '', artist = '', album = '', sort = '-popularity') {
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
    
    return this.fetchData(`/songs?${params}`);
  }

  async searchSongs(query, limit = 20) {
    return this.fetchData(`/songs/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getSong(id) {
    return this.fetchData(`/songs/${id}`);
  }

  async incrementPlayCount(songId) {
    return this.fetchData(`/songs/${songId}/play`, { method: 'POST' });
  }

  // Albums API
  async getPopularAlbums(limit = 20) {
    return this.fetchData(`/albums/popular?limit=${limit}`);
  }

  async getAlbums(page = 1, limit = 20, search = '', genre = '', year = '', sort = '-release_date') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort,
    });
    
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    if (year) params.append('year', year);
    
    return this.fetchData(`/albums?${params}`);
  }

  async getAlbum(id) {
    return this.fetchData(`/albums/${id}`);
  }

  async getAlbumTracks(albumId, page = 1, limit = 50) {
    return this.fetchData(`/albums/${albumId}/tracks?page=${page}&limit=${limit}`);
  }

  // Search API
  async searchAll(query, limit = 20) {
    try {
      // Ensure query is properly formatted
      const formattedQuery = query.trim();
      
      // Direct API calls with proper error handling
      let artistResults = [];
      let songResults = [];
      let albumResults = [];
      
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

      return {
        artists: Array.isArray(artistResults) ? artistResults : [],
        songs: Array.isArray(songResults) ? songResults : [],
        albums: Array.isArray(albumResults) ? albumResults : []
      };
    } catch (error) {
      console.error('API searchAll error:', error);
      // Return empty results instead of throwing to prevent UI errors
      return { artists: [], songs: [], albums: [] };
    }
  }

  // Utility methods
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
    
    return bestImage.url;
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
    return this.fetchData('/users/me/likes');
  }

  async likeSong(songId) {
    return this.fetchData('/users/me/likes', {
      method: 'POST',
      body: JSON.stringify({ songId })
    });
  }

  async unlikeSong(songId) {
    return this.fetchData('/users/me/likes', {
      method: 'DELETE',
      body: JSON.stringify({ songId })
    });
  }

  // Playlists
  async getMyPlaylists() {
    return this.fetchData('/playlists/me');
  }

  async createPlaylist(payload) {
    return this.fetchData('/playlists', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePlaylist(playlistId, updates) {
    return this.fetchData(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deletePlaylist(playlistId) {
    return this.fetchData(`/playlists/${playlistId}`, { method: 'DELETE' });
  }

  async getPlaylist(playlistId) {
    return this.fetchData(`/playlists/${playlistId}`);
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
}

export default new ApiService();
