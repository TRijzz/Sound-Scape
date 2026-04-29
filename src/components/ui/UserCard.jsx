import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserIcon } from './Icons';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';
import apiService from '../../services/api';
import { useMusic } from '../../contexts/MusicContext';

const UserCard = ({ user, index = 0 }) => {
  const {
    user: currentUser,
    isAuthenticated,
    isFollowingUser,
    toggleFollowUser,
    setShowAuthPrompt
  } = useMusic();
  const profileImage = apiService.resolveMediaUrl(user?.avatar_url || albumArtPlaceholder);
  const profileUserId = String(user?._id || user?.id || '');
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  const isOwnProfile = currentUserId && profileUserId && currentUserId === profileUserId;
  const following = isFollowingUser(profileUserId);

  const handleFollow = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    toggleFollowUser(profileUserId);
  };

  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.03 }}
    >
      <div className="rounded-2xl border border-gray-700 bg-light-gray/30 p-4 transition-colors hover:border-neon-blue/40 hover:bg-light-gray/50">
        <div className="flex items-center gap-4">
          <Link to={`/user/${user?._id || user?.id}`} className="flex min-w-0 flex-1 items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-dark-gray">
              {user?.avatar_url ? (
                <img src={profileImage} alt={user?.name || 'User'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserIcon className="h-7 w-7 text-gray-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-white group-hover:text-neon-blue">
                {user?.name || 'Unknown User'}
              </h3>
              {user?.username ? (
                <p className="truncate text-xs text-gray-400">@{user.username}</p>
              ) : null}
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                {user?.bio || 'Music lover on Sound Scape.'}
              </p>
            </div>
          </Link>

          {!isOwnProfile ? (
            <button
              type="button"
              onClick={handleFollow}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                following
                  ? 'border border-neon-blue/50 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20'
                  : 'bg-neon-blue text-dark-bg hover:bg-neon-blue/90'
              }`}
            >
              {following ? 'Followed' : 'Follow'}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

export default UserCard;
