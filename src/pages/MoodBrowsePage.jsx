import React from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import SongCard from '../components/ui/SongCard';
import apiService from '../services/api';
import { useMusic } from '../contexts/MusicContext';

const moodAccent = (mood = '', index = 0) => {
  const palettes = [
    'from-amber-400 to-orange-500',
    'from-blue-400 to-indigo-600',
    'from-rose-500 to-red-600',
    'from-emerald-400 to-cyan-500',
    'from-fuchsia-500 to-pink-600',
    'from-lime-400 to-green-500'
  ];
  const seed = Array.from(String(mood)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[(seed + index) % palettes.length];
};

export default function MoodBrowsePage() {
  const { playTrack } = useMusic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [moods, setMoods] = React.useState([]);
  const [songs, setSongs] = React.useState([]);
  const [loadingMoods, setLoadingMoods] = React.useState(false);
  const [loadingSongs, setLoadingSongs] = React.useState(false);
  const selectedMood = searchParams.get('mood') || '';

  React.useEffect(() => {
    let cancelled = false;

    const loadMoods = async () => {
      try {
        setLoadingMoods(true);
        const response = await apiService.getSongMoods();
        const nextMoods = Array.isArray(response?.moods) ? response.moods : [];
        if (cancelled) return;
        setMoods(nextMoods);
        if (!selectedMood && nextMoods.length > 0) {
          setSearchParams({ mood: nextMoods[0] }, { replace: true });
        }
      } catch (error) {
        console.error('Failed to load mood list:', error);
        if (!cancelled) setMoods([]);
      } finally {
        if (!cancelled) setLoadingMoods(false);
      }
    };

    loadMoods();
    return () => {
      cancelled = true;
    };
  }, [selectedMood, setSearchParams]);

  React.useEffect(() => {
    let cancelled = false;

    const loadSongs = async () => {
      if (!selectedMood) {
        setSongs([]);
        return;
      }

      try {
        setLoadingSongs(true);
        const response = await apiService.getSongs(1, 100, '', '', '', '', '', '-popularity', selectedMood);
        if (!cancelled) {
          setSongs(Array.isArray(response?.songs) ? response.songs : Array.isArray(response) ? response : []);
        }
      } catch (error) {
        console.error('Failed to load mood songs:', error);
        if (!cancelled) setSongs([]);
      } finally {
        if (!cancelled) setLoadingSongs(false);
      }
    };

    loadSongs();
    return () => {
      cancelled = true;
    };
  }, [selectedMood]);

  return (
    <div className="p-6 space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.16),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Mood Browser</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Browse by mood</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">Explore every mood currently in your catalog, then jump straight into the songs tagged for it.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
            {loadingMoods ? 'Loading moods...' : `${moods.length} mood${moods.length !== 1 ? 's' : ''} available`}
          </div>
        </div>
      </motion.section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">All moods</h2>
            <p className="mt-1 text-sm text-gray-400">Every mood here is pulled from the live song data.</p>
          </div>
        </div>

        {loadingMoods ? (
          <div className="rounded-2xl bg-light-gray/40 p-6 text-center text-gray-400">Loading moods...</div>
        ) : moods.length === 0 ? (
          <div className="rounded-2xl bg-light-gray/40 p-6 text-center text-gray-400">No moods have been added to the system yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {moods.map((mood, index) => (
              <motion.button
                key={mood}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSearchParams({ mood })}
                className={`rounded-2xl border p-5 text-left transition-all ${selectedMood === mood ? 'border-white/40 shadow-lg' : 'border-gray-800'} bg-gradient-to-br ${moodAccent(mood, index)}`}
              >
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-black/60">Mood</div>
                <div className="mt-2 text-2xl font-black text-black">{mood}</div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">{selectedMood || 'Mood'} songs</h2>
          <p className="mt-1 text-sm text-gray-400">Songs currently tagged with this mood.</p>
        </div>

        <div className="rounded-2xl bg-light-gray/40 p-4">
          {loadingSongs ? (
            <div className="py-8 text-center text-gray-400">Loading {selectedMood.toLowerCase()} songs...</div>
          ) : songs.length > 0 ? (
            songs.map((song, index) => (
              <SongCard
                key={song._id || song.id}
                song={song}
                index={index}
                showAlbum={true}
                onClick={() => playTrack(song)}
              />
            ))
          ) : (
            <div className="py-8 text-center text-gray-400">
              {selectedMood ? `No songs tagged for the ${selectedMood.toLowerCase()} mood yet.` : 'Pick a mood to see songs.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
