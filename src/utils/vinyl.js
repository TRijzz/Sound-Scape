import apiService from '../services/api';

const toArtistObject = (artist) => {
  if (!artist) return null;
  if (typeof artist === 'string') {
    return { name: artist };
  }
  if (artist.name) {
    return artist;
  }
  return null;
};

const coerceSeconds = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value > 10000) {
    return Math.floor(value / 1000);
  }
  return Math.floor(value);
};

export const formatVinylDuration = (track) => {
  if (!track) return '0:00';
  if (typeof track.duration === 'string' && track.duration.includes(':')) {
    return track.duration;
  }

  const seconds = coerceSeconds(track.duration_ms || track.duration_seconds || track.duration);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
};

export const getVinylImageSrc = (vinyl, fallback = null) => {
  if (!vinyl) return fallback;
  if (vinyl.image_base64) {
    return `data:${vinyl.mime_type || 'image/png'};base64,${vinyl.image_base64}`;
  }
  return vinyl.image_url || fallback;
};

export const normalizeVinylTrack = (track, vinyl = null, fallback = {}) => {
  const source = track?.songId && typeof track.songId === 'object' && !Array.isArray(track.songId)
    ? track.songId
    : track;

  const name = source?.name || source?.title || fallback?.name || fallback?.title || 'Untitled Track';
  const artistNames = Array.isArray(source?.artists)
    ? source.artists.map(toArtistObject).filter(Boolean)
    : [];

  const fallbackArtist = vinyl?.artist ? [{ name: vinyl.artist }] : [];
  const artists = artistNames.length > 0 ? artistNames : fallbackArtist;

  const vinylImage = getVinylImageSrc(vinyl, null);
  const albumFromSource = source?.album && typeof source.album === 'object' ? source.album : null;
  const albumFromVinyl = vinyl?.albumId && typeof vinyl.albumId === 'object'
    ? vinyl.albumId
    : {
        name: vinyl?.name,
        images: vinylImage ? [{ url: vinylImage }] : []
      };

  return {
    ...fallback,
    ...source,
    name,
    title: name,
    _id: source?._id || fallback?._id || fallback?.songId?._id || fallback?.songId || fallback?.id,
    id: source?.id || source?._id || fallback?.id || fallback?._id || fallback?.songId,
    artists,
    album: albumFromSource || albumFromVinyl,
    durationLabel: formatVinylDuration({ ...fallback, ...source }),
    duration_ms: source?.duration_ms || (typeof source?.duration === 'number' && source.duration > 10000 ? source.duration : undefined),
    duration: source?.duration || fallback?.duration || formatVinylDuration({ ...fallback, ...source }),
    _vinylId: vinyl?._id || vinyl?.id || null,
    _vinylName: vinyl?.name || null,
    _vinylArtist: vinyl?.artist || null,
    _vinylImage: vinylImage,
  };
};

const resolveTracklistEntry = async (entry, vinyl) => {
  if (!entry) return null;

  if (entry.songId && typeof entry.songId === 'object' && !Array.isArray(entry.songId)) {
    return normalizeVinylTrack(entry.songId, vinyl, entry);
  }

  if (entry.songId) {
    try {
      const song = await apiService.getSong(entry.songId);
      return normalizeVinylTrack(song, vinyl, entry);
    } catch (error) {
      console.error('Failed to resolve vinyl track entry:', error);
    }
  }

  return normalizeVinylTrack(entry, vinyl, entry);
};

export const resolveVinylTracks = async (vinyl) => {
  if (!vinyl) return [];

  if (vinyl.albumId) {
    const albumId = vinyl.albumId._id || vinyl.albumId;
    const albumTracksRes = await apiService.getAlbumTracks(albumId);
    const albumTracks = albumTracksRes?.songs || albumTracksRes?.tracks || [];
    return albumTracks.map((track) => normalizeVinylTrack(track, vinyl));
  }

  if (vinyl.songId) {
    const song = vinyl.songId._id || vinyl.songId.name
      ? vinyl.songId
      : await apiService.getSong(vinyl.songId);
    return [normalizeVinylTrack(song, vinyl)];
  }

  if (Array.isArray(vinyl.tracklist) && vinyl.tracklist.length > 0) {
    const tracks = await Promise.all(vinyl.tracklist.map((entry) => resolveTracklistEntry(entry, vinyl)));
    return tracks.filter(Boolean);
  }

  return [];
};

export const vinylContainsTrack = (vinyl, track) => {
  if (!vinyl || !track) return false;

  const trackId = String(track._id || track.id || '');
  const albumId = String(track.album?._id || track.album?.id || track.album || '');

  if (trackId) {
    if (String(vinyl.songId?._id || vinyl.songId || '') === trackId) return true;
    if (Array.isArray(vinyl.tracklist) && vinyl.tracklist.some((entry) => String(entry.songId?._id || entry.songId || entry._id || '') === trackId)) {
      return true;
    }
  }

  if (albumId && String(vinyl.albumId?._id || vinyl.albumId || '') === albumId) {
    return true;
  }

  const trackName = (track.name || track.title || '').toLowerCase();
  return Array.isArray(vinyl.tracklist)
    ? vinyl.tracklist.some((entry) => (entry.name || entry.title || entry.songId?.name || '').toLowerCase() === trackName)
    : false;
};
