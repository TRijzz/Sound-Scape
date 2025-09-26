import express from 'express';
import * as spotifyController from '../controllers/spotify.controller.js';

const router = express.Router();

// Comprehensive search endpoint
router.get('/search', spotifyController.search);

// Specific search routes
router.get('/search/tracks', spotifyController.searchTracks);
router.get('/search/artists', spotifyController.searchArtists);
router.get('/search/albums', spotifyController.searchAlbums);

// Track routes
router.get('/tracks/:id', spotifyController.getTrack);

// Artist routes
router.get('/artists/:id', spotifyController.getArtist);
router.get('/artists/:id/top-tracks', spotifyController.getArtistTopTracks);

// Album routes
router.get('/albums/:id', spotifyController.getAlbum);
router.get('/albums/:id/tracks', spotifyController.getAlbumTracks);

// Recommendations
router.get('/recommendations', spotifyController.getRecommendations);

export default router;