import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, LockIcon, PaletteIcon, LogOutIcon } from '../components/ui/Icons';
import { useMusic } from '../contexts/MusicContext';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';

const SettingsPage = ({ defaultTab = 'profile' }) => {
  const { user, logout } = useMusic();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Update active tab when defaultTab prop changes (e.g., from route change)
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'account', label: 'Account', icon: LockIcon },
    { id: 'theme', label: 'Theme', icon: PaletteIcon }
  ];

  const ProfileTab = () => {
    const [profileData, setProfileData] = useState({
      name: user?.name || '',
      bio: '',
      avatar: user?.avatar || ''
    });

    const handleChange = (e) => {
      const { name, value } = e.target;
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    const handleAvatarUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfileData(prev => ({
            ...prev,
            avatar: e.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Profile Information</h3>
          
          {/* Avatar Upload */}
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

          {/* Name */}
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

          {/* Bio */}
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

          <button className="px-6 py-3 bg-neon-blue text-dark-bg rounded-xl font-medium hover:bg-neon-blue/80 transition-all duration-200 hover:scale-105">
            Save Changes
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
          
          {/* Change Password */}
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

          {/* Email Preferences */}
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
          
          {/* Theme Toggle */}
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

          {/* Accent Color */}
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'account':
        return <AccountTab />;
      case 'theme':
        return <ThemeTab />;
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
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
              
              {/* Logout Button */}
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

          {/* Content */}
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
