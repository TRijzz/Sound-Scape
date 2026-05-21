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
        }
      } catch (e) {
        // continue silently
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setUser]);

  const toggle = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
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
      });
      if (me) {
        setUser({
          ...me,
          onboarded: true,
          preferred_genres: genres,
          preferred_moods: moods,
          preferred_languages: languages,
          preferred_tags: tags,
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
  const presetLanguages = ['English', 'Hindi', 'Spanish', 'French'];
  const presetTags = ['explicit', 'high-energy', 'low-energy', '2010s', '2020s'];

  const Pill = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border ${active ? 'bg-neon-blue text-dark-bg border-neon-blue' : 'bg-light-gray/50 text-white border-gray-700'}`}
    >{label}</button>
  );

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
