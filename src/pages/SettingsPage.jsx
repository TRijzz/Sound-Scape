import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, LockIcon, PaletteIcon, LogOutIcon, MusicNoteIcon } from '../components/ui/Icons';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';

const SettingsPage = ({ defaultTab = 'profile' }) => {
  const { user, logout, syncCurrentUser } = useMusic();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const data = await apiService.getListeningAnalytics();
        if (mounted) {
          setAnalytics(data || null);
        }
      } catch (error) {
        if (mounted) {
          setAnalytics(null);
        }
      } finally {
        if (mounted) {
          setAnalyticsLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'account', label: 'Account', icon: LockIcon },
    { id: 'theme', label: 'Theme', icon: PaletteIcon },
    { id: 'listening-data', label: 'Listening Data', icon: MusicNoteIcon }
  ];

  const weeklyPeak = Math.max(...(analytics?.weeklyTrend || []).map((point) => point.plays || 0), 0);

  const ProfileTab = () => {
    const [profileData, setProfileData] = useState({
      name: user?.name || '',
      bio: user?.bio || '',
      avatar: user?.avatar_url || user?.avatar || ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
      setProfileData({
        name: user?.name || '',
        bio: user?.bio || '',
        avatar: user?.avatar_url || user?.avatar || ''
      });
      setAvatarFile(null);
    }, []);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setProfileData((prev) => ({
        ...prev,
        [name]: value
      }));
    };

    const handleAvatarUpload = (e) => {
      const file = e.target.files?.[0] || null;
      setAvatarFile(file);
      setMessage('');
      setError('');

      if (!file) {
        setProfileData((prev) => ({
          ...prev,
          avatar: user?.avatar_url || user?.avatar || ''
        }));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setProfileData((prev) => ({
        ...prev,
        avatar: objectUrl
      }));
    };

    const handleSave = async () => {
      const userId = user?._id || user?.id;
      if (!userId) {
        setError('You need to be logged in to update your profile.');
        return;
      }

      try {
        setIsSaving(true);
        setMessage('');
        setError('');

        const formData = new FormData();
        formData.append('name', profileData.name.trim());
        formData.append('bio', profileData.bio.trim());
        if (avatarFile) {
          formData.append('profileImage', avatarFile);
        }

        await apiService.updateUser(userId, formData);
        await syncCurrentUser();
        setMessage('Profile updated successfully.');
      } catch (saveError) {
        console.error('Failed to save profile:', saveError);
        setError(saveError?.message || 'Failed to save changes.');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Profile Information</h3>

          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <img
                src={profileData.avatar || albumArtPlaceholder}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div>
              <h4 className="text-white font-medium">Profile Picture</h4>
              <p className="text-gray-400 text-sm">Click to upload a new image</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-dark-gray border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-neon-blue transition-all duration-200"
              placeholder="Enter your display name"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={profileData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-dark-gray border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-neon-blue transition-all duration-200 resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          {message ? <p className="mb-3 text-sm text-green-400">{message}</p> : null}
          {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-neon-blue text-dark-bg rounded-xl font-medium hover:bg-neon-blue/80 transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  };

  const AccountTab = () => {
    const [passwordData, setPasswordData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    const handleChange = (e) => {
      const { name, value } = e.target;
      setPasswordData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Account Security</h3>

          <div className="mb-6">
            <h4 className="text-lg font-medium text-white mb-4">Change Password</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-gray border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-neon-blue transition-all duration-200"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-gray border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-neon-blue transition-all duration-200"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-gray border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-neon-blue transition-all duration-200"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <button className="mt-4 px-6 py-3 bg-neon-blue text-dark-bg rounded-xl font-medium hover:bg-neon-blue/80 transition-all duration-200 hover:scale-105">
              Update Password
            </button>
          </div>

          <div>
            <h4 className="text-lg font-medium text-white mb-4">Email Preferences</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-neon-blue bg-dark-gray border-gray-600 rounded focus:ring-neon-blue focus:ring-2"
                />
                <span className="text-gray-300">Receive email notifications</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-neon-blue bg-dark-gray border-gray-600 rounded focus:ring-neon-blue focus:ring-2"
                />
                <span className="text-gray-300">Receive marketing emails</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ThemeTab = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Appearance</h3>

          <div className="mb-6">
            <h4 className="text-lg font-medium text-white mb-4">Theme</h4>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDarkMode(true)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-neon-blue text-dark-bg'
                    : 'bg-light-gray text-gray-300 hover:bg-light-gray/80'
                }`}
              >
                Dark Mode
              </button>
              <button
                onClick={() => setIsDarkMode(false)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  !isDarkMode
                    ? 'bg-neon-blue text-dark-bg'
                    : 'bg-light-gray text-gray-300 hover:bg-light-gray/80'
                }`}
              >
                Light Mode
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-white mb-4">Accent Color</h4>
            <div className="flex space-x-3">
              {['#00FFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'].map((color) => (
                <button
                  key={color}
                  className="w-12 h-12 rounded-full border-2 border-gray-600 hover:border-white transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ListeningDataTab = () => {
    if (analyticsLoading) {
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Your listening insights</h3>
          <p className="text-gray-400">Loading your listening data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Your listening insights</h3>
          <p className="text-gray-400">A quick personal analytics snapshot from your listening history.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-700 bg-black/20 p-5 text-center">
            <div className="text-sm text-gray-400">Total plays</div>
            <div className="text-4xl font-bold text-white mt-3">{analytics?.totalPlays || 0}</div>
            <div className="text-sm text-gray-500 mt-3">{analytics?.totalListeningMinutes || 0} minutes listened</div>
          </div>
          <div className="rounded-xl border border-gray-700 bg-black/20 p-5 text-center">
            <div className="text-sm text-gray-400">Favorite artist</div>
            <div className="text-3xl font-bold text-white mt-3">{analytics?.favoriteArtist?.name || 'No data yet'}</div>
            <div className="text-sm text-gray-500 mt-3">Play more music to build this insight</div>
          </div>
          <div className="rounded-xl border border-gray-700 bg-black/20 p-5 text-center">
            <div className="text-sm text-gray-400">Favorite song</div>
            <div className="text-3xl font-bold text-white mt-3">{analytics?.favoriteSong?.name || 'No data yet'}</div>
            <div className="text-sm text-gray-500 mt-3">
              {analytics?.favoriteSong?.count ? `${analytics.favoriteSong.count} plays` : 'Start listening to see your top track'}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-700 bg-black/20 p-5">
          <div className="text-center text-sm text-gray-400 mb-6">Weekly trend</div>
          <div className="flex items-end gap-3 h-44">
            {(analytics?.weeklyTrend || []).map((point) => (
              <div key={point.date} className="flex-1 flex flex-col items-center justify-end gap-3">
                <div className="text-sm text-gray-400">{point.plays || 0}</div>
                <div
                  className="w-full rounded-md bg-neon-blue"
                  style={{ height: `${Math.max(24, ((point.plays || 0) / (weeklyPeak || 1)) * 100)}%` }}
                />
                <div className="text-sm text-gray-500">{String(point.date || '').slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'account':
        return <AccountTab />;
      case 'theme':
        return <ThemeTab />;
      case 'listening-data':
        return <ListeningDataTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <div className="p-6">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64">
            <div className="bg-light-gray/30 rounded-xl p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-neon-blue text-dark-bg'
                          : 'text-gray-300 hover:text-white hover:bg-light-gray/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                >
                  <LogOutIcon className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <motion.div
              className="bg-light-gray/30 rounded-xl p-6"
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;

