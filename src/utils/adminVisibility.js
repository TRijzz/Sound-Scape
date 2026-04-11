export const isAdminVisibleArtist = (artist) => artist && artist.is_visible !== false && artist.publish_status !== 'hidden';

export const getAdminEntityId = (entity) => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  return String(entity._id || entity.id || '');
};

export const hasHiddenArtistLink = (artists) => (
  Array.isArray(artists) && artists.some((artist) => !isAdminVisibleArtist(artist))
);

export const isAdminVisibleAlbum = (album) => (
  Boolean(album)
  && album.is_visible !== false
  && album.publish_status !== 'hidden'
  && !hasHiddenArtistLink(album.artists)
);

export const isAdminVisibleSong = (song) => {
  if (!song || song.is_visible === false || song.publish_status === 'hidden') {
    return false;
  }

  if (hasHiddenArtistLink(song.artists)) {
    return false;
  }

  if (song.album && typeof song.album === 'object' && !isAdminVisibleAlbum(song.album)) {
    return false;
  }

  return true;
};