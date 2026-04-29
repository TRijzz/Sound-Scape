import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserIcon } from '../components/ui/Icons';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';

const formatStatLabel = (count, singular, plural = `${singular}s`) => {
  const safeCount = Number(count) || 0;
  return `${safeCount} ${safeCount === 1 ? singular : plural}`;
};

const getPlaylistArtwork = (playlist) => {
  if (playlist?.image) {
    return apiService.resolveMediaUrl(playlist.image);
  }

  return (Array.isArray(playlist?.songs) ? playlist.songs : [])
    .flatMap((song) => (Array.isArray(song?.album?.images) ? song.album.images : []))
    .map((image) => image?.url)
    .filter(Boolean)
    .slice(0, 4);
};

const UserAvatar = ({ user, sizeClass = 'h-36 w-36 md:h-44 md:w-44', iconClass = 'h-16 w-16', className = '' }) => {
  const avatar = apiService.resolveMediaUrl(user?.avatar_url || albumArtPlaceholder);

  return (
    <div className={`${sizeClass} overflow-hidden rounded-full bg-[#1a1a1d] shadow-[0_30px_90px_rgba(0,0,0,0.45)] ${className}`}>
      {user?.avatar_url ? (
        <img src={avatar} alt={user?.name || 'User'} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <UserIcon className={`${iconClass} text-[#7f8796]`} />
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, canToggle, expanded, onToggle }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div>
      <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
    </div>
    {canToggle ? (
      <button
        type="button"
        onClick={onToggle}
        className="hidden text-sm font-semibold text-[#9fb6db] transition-colors hover:text-white md:inline"
      >
        {expanded ? 'Show less' : 'Show all'}
      </button>
    ) : null}
  </div>
);

const SectionShell = ({ title, subtitle, canToggle, expanded, onToggle, children }) => (
  <section className="rounded-[2rem] bg-[#141414] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:px-7">
    <SectionHeader
      title={title}
      subtitle={subtitle}
      canToggle={canToggle}
      expanded={expanded}
      onToggle={onToggle}
    />
    {children}
    {canToggle ? (
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 text-sm font-semibold text-[#9fb6db] transition-colors hover:text-white md:hidden"
      >
        {expanded ? 'Show less' : 'Show all'}
      </button>
    ) : null}
  </section>
);

const UserProfilePage = ({ selfProfile = false }) => {
  const { id } = useParams();
  const {
    user: currentUser,
    isAuthenticated,
    isFollowingUser,
    toggleFollowUser,
    setShowAuthPrompt
  } = useMusic();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ownPlaylists, setOwnPlaylists] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    playlists: false
  });

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      const targetId = selfProfile ? (currentUser?._id || currentUser?.id || '') : id;

      if (!targetId) {
        setLoading(false);
        setError(selfProfile ? 'Sign in to view your profile' : 'User not found');
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await apiService.getPublicUser(targetId);
        if (!cancelled) {
          setProfile(response || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load user');
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [currentUser?._id, currentUser?.id, id, selfProfile]);

  useEffect(() => {
    let cancelled = false;

    const loadOwnPlaylists = async () => {
      const targetId = selfProfile ? (currentUser?._id || currentUser?.id || '') : id;
      const currentUserId = currentUser?._id || currentUser?.id || '';
      const shouldLoadOwnProfileData = isAuthenticated && targetId && String(targetId) === String(currentUserId);

      if (!shouldLoadOwnProfileData) {
        setOwnPlaylists([]);
        return;
      }

      try {
        const playlists = await apiService.getMyPlaylists().catch(() => []);

        if (!cancelled) {
          setOwnPlaylists(Array.isArray(playlists) ? playlists : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error('Failed to load self profile data:', loadError);
          setOwnPlaylists([]);
        }
      }
    };

    loadOwnPlaylists();
    return () => {
      cancelled = true;
    };
  }, [currentUser?._id, currentUser?.id, id, isAuthenticated, selfProfile]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading profile...</div>;
  }

  if (error || !profile) {
    return <div className="flex min-h-screen items-center justify-center text-red-400">{error || 'User not found'}</div>;
  }

  const profileUserId = String(profile._id || profile.id || '');
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  const isOwnProfile = selfProfile || (currentUserId && profileUserId && currentUserId === profileUserId);
  const following = isFollowingUser(profileUserId);
  const preferredGenres = Array.isArray(profile.preferred_genres) ? profile.preferred_genres : [];
  const playlists = isOwnProfile
    ? ownPlaylists
    : (Array.isArray(profile.publicPlaylists) ? profile.publicPlaylists : []);

  const playlistCount = playlists.length;

  const visiblePlaylists = expandedSections.playlists ? playlists : playlists.slice(0, 6);

  const toggleSection = (section) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section]
    }));
  };

  const handleFollow = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    toggleFollowUser(profileUserId);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] px-4 pb-28 pt-4 md:px-6">
      <motion.div
        className="mx-auto max-w-[1520px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="overflow-hidden rounded-[2rem] bg-[#171717] shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
          <div className="relative overflow-hidden px-6 py-9 md:px-10 md:py-12">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,42,42,0.96),rgba(23,23,23,1)_70%)]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.22))]" />

            <div className="relative flex flex-col gap-8 md:flex-row md:items-end">
              <UserAvatar user={profile} />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/78">Profile</p>
                <h1 className="mt-3 text-5xl font-black uppercase tracking-tight text-white md:text-7xl">
                  {profile.name || 'Unknown User'}
                </h1>
                {profile.username ? (
                  <p className="mt-3 text-lg text-[#9fb6db]">@{profile.username}</p>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-white/68 md:text-base">
                  <span>{formatStatLabel(playlistCount, 'Playlist')}</span>
                </div>
                {profile.bio ? (
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-white/68 md:text-base">
                    {profile.bio}
                  </p>
                ) : null}
              </div>

              {!isOwnProfile ? (
                <div className="relative md:self-center">
                  <button
                    type="button"
                    onClick={handleFollow}
                    className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                      following
                        ? 'bg-[#2a2a2f] text-white hover:bg-[#34343b]'
                        : 'bg-white text-[#141414] hover:bg-[#f1f1f1]'
                    }`}
                  >
                    {following ? 'Followed' : 'Follow'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {preferredGenres.length > 0 ? (
            <div className="bg-[#181818] px-6 py-5 md:px-10">
              <div className="flex flex-wrap gap-3">
                {preferredGenres.map((genre) => (
                  <Link
                    key={genre}
                    to={`/genre/${encodeURIComponent(genre)}`}
                    className="rounded-full bg-[#232326] px-4 py-2 text-sm font-medium text-white/82 transition-colors hover:bg-[#2b2b30]"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 space-y-6">
          <SectionShell
            title={isOwnProfile ? 'Your playlists' : 'Public playlists'}
            subtitle={isOwnProfile ? 'All playlists from your library.' : 'Shared collections from this profile.'}
            canToggle={playlists.length > 6}
            expanded={expandedSections.playlists}
            onToggle={() => toggleSection('playlists')}
          >
            {visiblePlaylists.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-2">
                {visiblePlaylists.map((playlist) => {
                  const artwork = getPlaylistArtwork(playlist);
                  const playlistLink = `/playlist/${playlist?._id || playlist?.id}`;

                  return (
                    <Link
                      key={playlist?._id || playlist?.id}
                      to={playlistLink}
                      className="w-[210px] shrink-0 rounded-3xl bg-[#1b1b1b] p-4 transition-transform hover:-translate-y-1 hover:bg-[#202020]"
                    >
                      <div className="overflow-hidden rounded-2xl bg-[#252528]">
                        {Array.isArray(artwork) && artwork.length > 0 ? (
                          <div className="grid aspect-square grid-cols-2">
                            {artwork.map((imageUrl, imageIndex) => (
                              <img
                                key={`${playlistLink}-${imageIndex}`}
                                src={apiService.resolveMediaUrl(imageUrl)}
                                alt={playlist?.name || 'Playlist'}
                                className="h-full w-full object-cover"
                              />
                            ))}
                            {Array.from({ length: Math.max(0, 4 - artwork.length) }).map((_, fillerIndex) => (
                              <div key={`${playlistLink}-filler-${fillerIndex}`} className="bg-[#343438]" />
                            ))}
                          </div>
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-[#343438] text-6xl text-white/35">
                            ♪
                          </div>
                        )}
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-2xl font-bold tracking-tight text-white">
                        {playlist?.name || 'Untitled Playlist'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        By {playlist?.user?.name || profile.name || 'Unknown'}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        {formatStatLabel(Array.isArray(playlist?.songs) ? playlist.songs.length : 0, 'track')}
                      </p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {isOwnProfile ? 'You have not created any playlists yet.' : 'No public playlists yet.'}
              </p>
            )}
          </SectionShell>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfilePage;
