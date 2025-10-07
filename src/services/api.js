// API service for connecting to the MongoDB-based backend
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  // Generic fetch method with error handling
  async fetchData(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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
    const [artists, songs, albums] = await Promise.all([
      this.getArtists(1, limit, query),
      this.searchSongs(query, limit),
      this.getAlbums(1, limit, query),
    ]);

    return {
      artists: artists.artists || artists,
      songs: songs,
      albums: albums.albums || albums,
    };
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
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
