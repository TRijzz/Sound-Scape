import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useMusic } from '../../contexts/MusicContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, setUser } = useMusic();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [genres, setGenres] = React.useState([]);
  const [moods, setMoods] = React.useState([]);
  const [languages, setLanguages] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const [artists, setArtists] = React.useState([]); // selected artist IDs
  const [artistOptions, setArtistOptions] = React.useState([]);
  const [artistsLoading, setArtistsLoading] = React.useState(false);
  const [artistSearch, setArtistSearch] = React.useState('');

  React.useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const me = await api.getCurrentUser();
        if (me) {
          setUser(me);
          setGenres(me.preferred_genres || []);
          setMoods(me.preferred_moods || []);
          setLanguages(me.preferred_languages || []);
          setTags(me.preferred_tags || []);
          const followed = me.followed_artists || me.followedArtists || [];
          setArtists(followed.map(a => (typeof a === 'string' ? a : a?._id || a?.id)).filter(Boolean));
        }
      } catch (e) {
        // continue silently
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setUser]);

  React.useEffect(() => {
    const loadArtists = async () => {
      try {
        setArtistsLoading(true);
        const list = await api.getPopularArtists(40);
        setArtistOptions(Array.isArray(list) ? list : []);
      } catch (e) {
        setArtistOptions([]);
      } finally {
        setArtistsLoading(false);
      }
    };
    loadArtists();
  }, []);

  const toggle = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const toggleArtist = (artistId) => {
    if (!artistId) return;
    setArtists(prev => prev.includes(artistId) ? prev.filter(id => id !== artistId) : [...prev, artistId]);
  };

  const save = async () => {
    try {
      setLoading(true);
      setError('');
      let me = user;
      if (!me?._id && !me?.id) {
        me = await api.getCurrentUser();
      }
      if (me) {
        setUser(me);
      }
      const userId = me?._id || me?.id;
      if (!userId) throw new Error('User not found');
      await api.updateUser(userId, {
        onboarded: true,
        preferred_genres: genres,
        preferred_moods: moods,
        preferred_languages: languages,
        preferred_tags: tags,
        followed_artists: artists,
      });
      if (me) {
        setUser({
          ...me,
          onboarded: true,
          preferred_genres: genres,
          preferred_moods: moods,
          preferred_languages: languages,
          preferred_tags: tags,
          followed_artists: artists,
        });
      }
      navigate('/home');
    } catch (e) {
      setError(e.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const presetGenres = ['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'EDM'];
  const presetMoods = ['Chill', 'Happy', 'Energetic', 'Sad'];
  const presetLanguages = ['English', 'Nepali', 'Hindi', 'Spanish', 'French'];
  const presetTags = ['explicit', 'high-energy', 'low-energy', '2010s', '2020s'];

  const Pill = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border ${active ? 'bg-neon-blue text-dark-bg border-neon-blue' : 'bg-light-gray/50 text-white border-gray-700'}`}
    >{label}</button>
  );

  const filteredArtists = React.useMemo(() => {
    const q = artistSearch.trim().toLowerCase();
    if (!q) return artistOptions;
    return artistOptions.filter(a => (a?.name || '').toLowerCase().includes(q));
  }, [artistOptions, artistSearch]);

  const ArtistCard = ({ artist }) => {
    const id = artist?._id || artist?.id;
    const active = artists.includes(id);
    const img = artist?.profile_image_url || artist?.image_url || artist?.cover_image_url || '/api/placeholder/120/120';
    return (
      <button
        onClick={() => toggleArtist(id)}
        className={`group relative flex flex-col items-center text-center p-3 rounded-xl border transition ${active ? 'border-neon-blue bg-neon-blue/10' : 'border-gray-700 bg-light-gray/30 hover:border-gray-500'}`}
      >
        <div className={`relative w-20 h-20 rounded-full overflow-hidden ring-2 ${active ? 'ring-neon-blue' : 'ring-transparent'}`}>
          <img
            src={img}
            alt={artist?.name || 'Artist'}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = '/api/placeholder/120/120'; }}
          />
          {active && (
            <div className="absolute inset-0 bg-neon-blue/30 flex items-center justify-center">
              <span className="text-dark-bg font-bold text-lg">✓</span>
            </div>
          )}
        </div>
        <span className="mt-2 text-sm text-white line-clamp-2">{artist?.name || 'Unknown'}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-3xl bg-light-gray/30 border border-gray-700 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold mb-2">Tell us what you like</h1>
        <p className="text-gray-400 mb-6">Choose a few to personalize your homepage.</p>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Genres</h2>
            <div className="flex flex-wrap gap-2">
              {presetGenres.map(g => (
                <Pill key={g} label={g} active={genres.includes(g)} onClick={() => toggle(genres, setGenres, g)} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Moods</h2>
            <div className="flex flex-wrap gap-2">
              {presetMoods.map(m => (
                <Pill key={m} label={m} active={moods.includes(m)} onClick={() => toggle(moods, setMoods, m)} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Languages</h2>
            <div className="flex flex-wrap gap-2">
              {presetLanguages.map(l => (
                <Pill key={l} label={l} active={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {presetTags.map(t => (
                <Pill key={t} label={t} active={tags.includes(t)} onClick={() => toggle(tags, setTags, t)} />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Favourite Artists</h2>
                <p className="text-sm text-gray-400">Pick a few — we'll surface their songs and albums on your home.</p>
              </div>
              <span className="text-sm text-gray-400">{artists.length} selected</span>
            </div>
            <input
              type="text"
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              placeholder="Search artists..."
              className="w-full mb-3 px-3 py-2 rounded-lg bg-dark-bg border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
            />
            {artistsLoading ? (
              <div className="text-gray-400 text-sm py-6 text-center">Loading artists...</div>
            ) : filteredArtists.length === 0 ? (
              <div className="text-gray-400 text-sm py-6 text-center">No artists found.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto pr-1">
                {filteredArtists.map(a => (
                  <ArtistCard key={a?._id || a?.id} artist={a} />
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="text-red-400 mt-4">{error}</div>}

        <div className="mt-6 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="px-4 py-2 rounded-lg bg-gray-700">Skip</button>
          <button onClick={save} disabled={loading} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50">{loading ? 'Saving...' : 'Save preferences'}</button>
        </div>
      </motion.div>
    </div>
  );
}
