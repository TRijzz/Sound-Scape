import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SongCard from '../components/ui/SongCard';
import AlbumCard from '../components/ui/AlbumCard';
import ArtistCard from '../components/ui/ArtistCard';
import UserCard from '../components/ui/UserCard';
import { useSearch } from '../hooks/useMusicData';
import { useMusic } from '../contexts/MusicContext';
import { SearchIcon, HeartIcon, PlayIcon, MusicNoteIcon, UserIcon } from '../components/ui/Icons';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';
import apiService from '../services/api';
import useEscapeKey from '../hooks/useEscapeKey';

const normalize = (value = '') => String(value).toLowerCase().replace(/\s+/g, ' ').trim();

const getEntityId = (item) => item?._id || item?.id || '';

const getSongAlbumId = (song) => song?.album?._id || song?.album?.id || song?.albumId?._id || song?.albumId || '';

const getResultMeta = (entry) => {
  const { type, item } = entry;

  if (type === 'song') {
    const artists = Array.isArray(item?.artists) ? item.artists.map((artist) => artist?.name).filter(Boolean).join(', ') : '';
    return {
      title: item?.name || item?.title || 'Untitled song',
      subtitle: artists || 'Song',
      label: 'Song',
      image: item?.album?.images?.[0]?.url || item?.images?.[0]?.url || albumArtPlaceholder,
      path: getSongAlbumId(item) ? `/album/${getSongAlbumId(item)}` : `/search?q=${encodeURIComponent(item?.name || item?.title || '')}`,
    };
  }

  if (type === 'artist') {
    return {
      title: item?.name || 'Unknown artist',
      subtitle: 'Artist',
      label: 'Artist',
      image: item?.images?.[0]?.url || item?.image_url || albumArtPlaceholder,
      path: `/artist/${getEntityId(item)}`,
    };
  }

  if (type === 'album') {
    const artists = Array.isArray(item?.artists) ? item.artists.map((artist) => artist?.name).filter(Boolean).join(', ') : '';
    return {
      title: item?.name || 'Untitled album',
      subtitle: artists || 'Album',
      label: 'Album',
      image: item?.images?.[0]?.url || item?.image_url || albumArtPlaceholder,
      path: `/album/${getEntityId(item)}`,
    };
  }

  return {
    title: item?.name || item?.username || 'Unknown user',
    subtitle: item?.username ? `@${item.username}` : 'User',
    label: 'User',
    image: item?.avatar_url || albumArtPlaceholder,
    path: `/user/${getEntityId(item)}`,
  };
};

const scoreEntry = (entry, query) => {
  const normalizedQuery = normalize(query);
  const { title, subtitle } = getResultMeta(entry);
  const normalizedTitle = normalize(title);
  const normalizedSubtitle = normalize(subtitle);
  const typeBoost = { song: 4, artist: 3, album: 2, user: 1 }[entry.type] || 0;

  if (normalizedTitle === normalizedQuery) return 100 + typeBoost;
  if (normalizedTitle.startsWith(normalizedQuery)) return 80 + typeBoost;
  if (normalizedTitle.includes(normalizedQuery)) return 60 + typeBoost;
  if (normalizedSubtitle.includes(normalizedQuery)) return 35 + typeBoost;
  return typeBoost;
};

const SectionHeader = ({ title, count }) => (
  <div className="mb-4 flex items-center justify-between gap-4">
    <h2 className="text-xl font-bold text-white">{title}</h2>
    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-gray-400">
      {count}
    </span>
  </div>
);

const BestMatchCard = ({ match, onSongSelect }) => {
  if (!match) return null;

  const meta = getResultMeta(match);
  const imageSrc = apiService.resolveMediaUrl(meta.image);
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(0,255,255,0.16),_transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] transition hover:border-neon-blue/30"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className={`h-32 w-32 shrink-0 overflow-hidden bg-light-gray shadow-2xl ${match.type === 'artist' || match.type === 'user' ? 'rounded-full' : 'rounded-3xl'}`}>
          <img src={imageSrc} alt={meta.title} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-neon-blue">Best Match</p>
          <h1 className="mt-3 line-clamp-2 text-4xl font-black tracking-tight text-white md:text-6xl">
            {meta.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-neon-blue px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-dark-bg">
              {meta.label}
            </span>
            <span className="text-base text-gray-300">{meta.subtitle}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-blue text-dark-bg transition group-hover:scale-105">
            {match.type === 'user' ? <UserIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (match.type === 'song') {
    return (
      <button type="button" onClick={() => onSongSelect(match.item)} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link to={meta.path} className="block">
      {content}
    </Link>
  );
};

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const { playTrack, isAuthenticated } = useMusic();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { searchResults, searchLoading, searchError, search } = useSearch();

  useEscapeKey(showAuthPrompt, () => setShowAuthPrompt(false));

  useEffect(() => {
    if (query.trim()) {
      search(query, 24);
    }
  }, [query, search]);

  const allResults = useMemo(() => {
    const entries = [
      ...(searchResults.songs || []).map((item) => ({ type: 'song', item })),
      ...(searchResults.artists || []).map((item) => ({ type: 'artist', item })),
      ...(searchResults.albums || []).map((item) => ({ type: 'album', item })),
      ...(searchResults.users || []).map((item) => ({ type: 'user', item })),
    ];

    return entries.sort((left, right) => scoreEntry(right, query) - scoreEntry(left, query));
  }, [searchResults, query]);

  const bestMatch = allResults[0] || null;
  const totalResults = allResults.length;

  const handleTrackSelect = async (track) => {
    const name = String(track?.name || '').toLowerCase();
    const artists = (track?.artists || []).map((artist) => String(artist?.name || '').toLowerCase());
    const hasLocal = String(track?.audio_url || '').startsWith('/songs/');
    const isKnownPreview = name.includes('shape of you') || (name.includes('shape') && artists.includes('ed sheeran')) || name.includes('god did');

    if (!isAuthenticated && !(hasLocal || isKnownPreview)) {
      setShowAuthPrompt(true);
      return;
    }

    await playTrack(track);
  };

  const trending = ['Taylor Swift', 'Rock', 'Ed Sheeran', 'Nepali Pop', 'Jazz', 'Classical'];
  const quickCategories = [
    { label: 'Top Songs', icon: PlayIcon, query: 'Top Songs' },
    { label: 'Popular Artists', icon: HeartIcon, query: 'Popular Artists' },
    { label: 'New Albums', icon: MusicNoteIcon, query: 'New Albums' },
  ];

  const handleQuickSearch = (term) => {
    setSearchParams({ q: term });
  };

  if (!query.trim()) {
    return (
      <div className="p-6">
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-neon-blue/30 bg-neon-blue/20">
            <SearchIcon className="h-6 w-6 text-neon-blue" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Search</h1>
          <p className="text-gray-400">Start typing in the search bar to find songs, artists, albums, and users.</p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="mb-3 text-lg font-semibold text-white">Trending searches</h2>
          <div className="flex flex-wrap gap-2">
            {trending.map((term) => (
              <button
                key={term}
                onClick={() => handleQuickSearch(term)}
                className="rounded-full border border-gray-700 bg-light-gray/40 px-3 py-2 text-sm text-gray-300 transition-all hover:border-neon-blue/30 hover:bg-neon-blue/20 hover:text-white"
              >
                {term}
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="mb-3 text-lg font-semibold text-white">Browse</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {quickCategories.map(({ label, icon: Icon, query: quickQuery }, index) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center space-x-3 rounded-xl border border-gray-700 bg-gradient-to-r from-neon-blue/20 to-purple-500/20 p-5 text-left"
                onClick={() => handleQuickSearch(quickQuery)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-black/30">
                  <Icon className="h-6 w-6 text-neon-blue" />
                </div>
                <div>
                  <p className="font-medium text-white">{label}</p>
                  <p className="text-sm text-gray-400">Explore {label.toLowerCase()}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="mb-2 text-2xl font-bold text-white">Search results for "{query}"</h1>
        <p className="text-gray-400">
          {searchLoading ? 'Searching across Sound Scape...' : `Found ${totalResults} ${totalResults === 1 ? 'result' : 'results'}`}
        </p>
      </motion.div>

      {searchLoading ? (
        <div className="space-y-6">
          <div className="h-52 animate-pulse rounded-[28px] bg-light-gray/30" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-light-gray/30" />
            ))}
          </div>
        </div>
      ) : searchError ? (
        <div className="py-12 text-center text-red-400">Error: {searchError}</div>
      ) : totalResults > 0 ? (
        <div className="space-y-10">
          <BestMatchCard match={bestMatch} onSongSelect={handleTrackSelect} />

          <section>
            <SectionHeader title="Songs" count={(searchResults.songs || []).length} />
            {(searchResults.songs || []).length > 0 ? (
              <div className="space-y-2">
                {(searchResults.songs || []).slice(0, 8).map((song, index) => (
                  <SongCard
                    key={song._id || song.id}
                    song={song}
                    index={index}
                    showAlbum={true}
                    onClick={() => handleTrackSelect(song)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No songs found.</p>
            )}
          </section>

          <section>
            <SectionHeader title="Artists" count={(searchResults.artists || []).length} />
            {(searchResults.artists || []).length > 0 ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
                {(searchResults.artists || []).slice(0, 6).map((artist, index) => (
                  <ArtistCard key={artist._id || artist.id} artist={artist} index={index} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No artists found.</p>
            )}
          </section>

          <section>
            <SectionHeader title="Albums" count={(searchResults.albums || []).length} />
            {(searchResults.albums || []).length > 0 ? (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
                {(searchResults.albums || []).slice(0, 6).map((album, index) => (
                  <AlbumCard key={album._id || album.id} album={album} index={index} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No albums found.</p>
            )}
          </section>

          <section>
            <SectionHeader title="Users" count={(searchResults.users || []).length} />
            {(searchResults.users || []).length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(searchResults.users || []).slice(0, 6).map((user, index) => (
                  <UserCard key={user._id || user.id} user={user} index={index} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No users found.</p>
            )}
          </section>
        </div>
      ) : (
        <motion.div
          className="py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="mb-2 text-lg font-medium text-gray-400">No results found for "{query}"</h3>
          <p className="mb-4 text-sm text-gray-500">Try a different keyword or pick one below.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {trending.map((term) => (
              <button
                key={term}
                onClick={() => handleQuickSearch(term)}
                className="rounded-full border border-gray-700 bg-light-gray/40 px-3 py-2 text-sm text-gray-300 transition-all hover:border-neon-blue/30 hover:bg-neon-blue/20 hover:text-white"
              >
                {term}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {showAuthPrompt && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAuthPrompt(false)} />
          <motion.div
            className="relative z-10 w-full max-w-md rounded-xl border border-gray-700 bg-dark-gray p-6 text-center"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
          >
            <h3 className="mb-2 text-xl font-semibold text-white">Sign in required</h3>
            <p className="mb-4 text-gray-300">You need to sign in first to play songs.</p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="rounded-lg bg-light-gray/50 px-4 py-2 text-white hover:bg-light-gray"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/login', { state: { from: `/search?q=${encodeURIComponent(query)}` } })}
                className="rounded-lg bg-neon-blue px-4 py-2 text-dark-bg hover:bg-neon-blue/80"
              >
                Sign in
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default SearchResultsPage;
