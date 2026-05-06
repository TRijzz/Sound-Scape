const publishStatus = (entity) => String(entity?.publish_status || 'published').toLowerCase();

export const isAdminHiddenEntity = (entity) => (
  Boolean(entity)
  && (entity.is_visible === false || publishStatus(entity) === 'hidden')
);

export const isAdminDraftEntity = (entity) => Boolean(entity) && publishStatus(entity) === 'draft';

export const isAdminPublishedEntity = (entity) => (
  Boolean(entity)
  && entity.is_visible !== false
  && publishStatus(entity) === 'published'
);

export const isAdminVisibleArtist = isAdminPublishedEntity;

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
  && isAdminPublishedEntity(album)
  && !hasHiddenArtistLink(album.artists)
);

export const isAdminVisibleSong = (song) => {
  if (!isAdminPublishedEntity(song)) {
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
