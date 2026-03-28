import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import SongCard from '../components/ui/SongCard';
import apiService from '../services/api';
import { useMusic } from '../contexts/MusicContext';

export default function MoodBrowsePage() {
  const { playTrack } = useMusic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [moods, setMoods] = React.useState([]);
  const [songs, setSongs] = React.useState([]);
  const [loadingMoods, setLoadingMoods] = React.useState(false);
  const [loadingSongs, setLoadingSongs] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [moodSearch, setMoodSearch] = React.useState('');
  const selectedMood = searchParams.get('mood') || '';
  const pickerRef = React.useRef(null);
  const songsPanelRef = React.useRef(null);

  const filteredMoods = React.useMemo(() => {
    const query = moodSearch.trim().toLowerCase();
    if (!query) return moods;
    return moods.filter((mood) => String(mood || '').toLowerCase().includes(query));
  }, [moods, moodSearch]);

  React.useEffect(() => {
    const handleOutside = (event) => {
      if (!pickerRef.current?.contains(event.target)) {
        setPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  React.useEffect(() => {
    if (!selectedMood) return;
    songsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedMood]);

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
            <h2 className="text-xl font-bold text-white">Choose a mood</h2>
            <p className="mt-1 text-sm text-gray-400">Pick any mood from the live catalog to see its songs below.</p>
          </div>
        </div>

        {loadingMoods ? (
          <div className="rounded-2xl bg-light-gray/40 p-6 text-center text-gray-400">Loading moods...</div>
        ) : moods.length === 0 ? (
          <div className="rounded-2xl bg-light-gray/40 p-6 text-center text-gray-400">No moods have been added to the system yet.</div>
        ) : (
          <div ref={pickerRef} className="relative rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.12),_transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Mood Dropdown</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{selectedMood || 'Select a mood'}</h3>
                <p className="mt-2 text-sm text-gray-300">
                  {selectedMood ? `Showing songs tagged with "${selectedMood}".` : 'Open the picker to browse every mood in the catalog.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen((current) => {
                    const next = !current;
                    if (!next) setMoodSearch('');
                    return next;
                  });
                }}
                className="group inline-flex min-w-[220px] items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-left text-white shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition hover:border-neon-blue/40 hover:bg-white/10"
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Current mood</div>
                  <div className="mt-2 text-lg font-semibold text-white">{selectedMood || 'Choose one'}</div>
                </div>
                <motion.span
                  animate={{ rotate: pickerOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-2xl text-neon-blue"
                >
                  ▾
                </motion.span>
              </button>
            </div>

            <AnimatePresence>
              {pickerOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-5 right-5 top-[calc(100%-8px)] z-20 mt-3 rounded-[24px] border border-white/10 bg-[#0b0d14]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">All moods</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{moods.length} total</p>
                  </div>
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                    <label className="flex-1">
                      <span className="sr-only">Search moods</span>
                      <input
                        type="text"
                        value={moodSearch}
                        onChange={(event) => setMoodSearch(event.target.value)}
                        placeholder="Search moods"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-neon-blue/50 focus:bg-white/10"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setMoodSearch('')}
                      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mb-4 text-sm text-gray-400">
                    {filteredMoods.length === moods.length
                      ? `Showing all ${moods.length} moods`
                      : `Showing ${filteredMoods.length} of ${moods.length} moods`}
                  </div>
                  <div className="grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                    {filteredMoods.map((mood) => {
                      const active = mood === selectedMood;
                      return (
                        <button
                          key={mood}
                          type="button"
                          onClick={() => {
                            setSearchParams({ mood });
                            setMoodSearch('');
                            setPickerOpen(false);
                          }}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            active
                              ? 'border-neon-blue/50 bg-neon-blue/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]'
                              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500">Mood</div>
                          <div className="mt-2 text-base font-semibold text-white">{mood}</div>
                        </button>
                      );
                    })}
                  </div>
                  {filteredMoods.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-gray-400">
                      No moods match "{moodSearch}".
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section ref={songsPanelRef} className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">{selectedMood || 'Mood'} songs</h2>
          <p className="mt-1 text-sm text-gray-400">Click any mood card above to drop its song list into this section.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-light-gray/40 p-4">
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
