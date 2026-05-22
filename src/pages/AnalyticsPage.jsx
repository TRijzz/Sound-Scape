import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import apiService from '../services/api';
import { useMusic } from '../contexts/MusicContext';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';

// Count-up hook for hero stat numbers
function useCountUp(target, duration = 1100) {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target)) {
      setValue(0);
      return undefined;
    }
    let raf;
    const startTime = performance.now();
    const startValue = 0;
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(startValue + (target - startValue) * eased));
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => raf && cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const formatHour = (h) => {
  if (h === null || h === undefined) return '—';
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${period}`;
};

const formatRelative = (date) => {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

const PIE_COLORS = ['#00FFFF', '#A855F7', '#F472B6', '#FCD34D', '#34D399', '#60A5FA', '#FB923C'];

const HeroCard = ({ label, value, icon, accent = 'cyan', subtitle, delay = 0, suffix = '', formatter }) => {
  const count = useCountUp(typeof value === 'number' ? value : 0);
  const displayValue = typeof value === 'number'
    ? (formatter ? formatter(count) : count.toLocaleString())
    : (value || '—');
  const accentStyle = {
    cyan: 'from-[#102530] via-[#0d1620] to-[#0c0d14] border-cyan-400/30',
    purple: 'from-[#1a1330] via-[#120f20] to-[#0c0d14] border-purple-500/30',
    pink: 'from-[#281321] via-[#170f17] to-[#0c0d14] border-pink-500/30',
    amber: 'from-[#2a2011] via-[#171307] to-[#0c0d14] border-amber-400/30',
    emerald: 'from-[#0f2620] via-[#0c1813] to-[#0c0d14] border-emerald-400/30'
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accentStyle} p-5 shadow-lg shadow-black/40 hover:shadow-[0_8px_40px_rgba(0,191,255,0.18)] transition-shadow`}
    >
      <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">{label}</p>
          <p className="mt-2 text-3xl font-black text-white tracking-tight">
            {displayValue}
            {typeof value === 'number' && suffix && <span className="ml-1 text-base font-medium text-white/60">{suffix}</span>}
          </p>
          {subtitle && <p className="mt-2 text-xs text-white/60">{subtitle}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80">
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ eyebrow, title, action }) => (
  <div className="flex items-end justify-between gap-3 mb-4">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.32em] text-neon-blue">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-white">{title}</h2>
    </div>
    {action}
  </div>
);

const ChartCard = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#13141d] p-5 shadow-lg shadow-black/40 ${className}`}
  >
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(circle_at_top,rgba(0,191,255,0.12),transparent_70%)]" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const TooltipShell = ({ active, payload, label, valueLabel = 'plays' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-[#0b0c12] px-3 py-2 text-xs shadow-xl shadow-black/50">
      <div className="text-white/60">{label}</div>
      <div className="text-white font-bold">
        {payload[0].value} {valueLabel}
      </div>
    </div>
  );
};

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, playTrack } = useMusic();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiService.getListeningAnalytics();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#13141d] p-8 text-center">
          <h2 className="text-xl font-bold text-white">Sign in to see your analytics</h2>
          <p className="mt-2 text-sm text-gray-400">We track plays only for signed-in listeners.</p>
          <button
            onClick={() => navigate('/login', { state: { from: '/analytics' } })}
            className="mt-5 rounded-lg bg-neon-blue px-5 py-2.5 font-semibold text-dark-bg hover:bg-neon-blue/80 transition"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const weeklyTrend = data?.weeklyTrend || [];
  const genreDistribution = data?.genreDistribution || [];
  const hourlyDistribution = data?.hourlyDistribution || [];
  const recentlyPlayed = data?.recentlyPlayed || [];

  const timelineCards = [];
  if (data?.favoriteGenre) {
    const hours = Math.round((data.totalListeningMinutes || 0) / 60 * 10) / 10;
    timelineCards.push({
      title: `You listened to ${data.favoriteGenre.name} for ${hours} hours`,
      sub: `${data.favoriteGenre.count} plays across your history`,
      accent: 'cyan'
    });
  }
  if (data?.peakHour !== null && data?.peakHour !== undefined) {
    timelineCards.push({
      title: `Your peak listening time was ${formatHour(data.peakHour)}`,
      sub: `${data.peakHourPlays} plays during that hour`,
      accent: 'purple'
    });
  }
  if (data?.topArtistThisWeek) {
    timelineCards.push({
      title: `Most played this week: ${data.topArtistThisWeek.name}`,
      sub: `${data.topArtistThisWeek.count} plays in the last 7 days`,
      accent: 'pink'
    });
  }
  if (data?.listeningStreak > 0) {
    timelineCards.push({
      title: `${data.listeningStreak}-day listening streak`,
      sub: data.listeningStreak === 1 ? 'You listened today' : `Don't break it tomorrow`,
      accent: 'amber'
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Floating background gradients (kept behind content; modest blur to avoid
          GPU compositing artefacts seen with very large blur radii). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0.28 }}
          animate={{ opacity: [0.28, 0.45, 0.28] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0.22 }}
          animate={{ opacity: [0.22, 0.4, 0.22] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0.18 }}
          animate={{ opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 p-6 lg:p-8 space-y-10">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-neon-blue">Listening atlas</p>
          <h1 className="mt-2 text-4xl font-black text-white tracking-tight lg:text-5xl">Your sound, by the numbers.</h1>
          <p className="mt-3 text-gray-400 max-w-xl">A cinematic look at what you've been spinning — top genres, the hours you live in, and the streak that's keeping you here.</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>
        ) : (
          <>
            {/* Hero stats */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <HeroCard
                  label="Total listening hours"
                  value={data ? Math.round((data.totalListeningMinutes || 0) / 60 * 10) / 10 : 0}
                  suffix="hrs"
                  delay={0.05}
                  accent="cyan"
                  formatter={(n) => n.toLocaleString()}
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" strokeLinecap="round" />
                    </svg>
                  }
                />
                <HeroCard
                  label="Total songs played"
                  value={data?.totalPlays || 0}
                  delay={0.1}
                  accent="purple"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  }
                />
                <HeroCard
                  label="Favorite genre"
                  value={data?.favoriteGenre?.name || '—'}
                  subtitle={data?.favoriteGenre ? `${data.favoriteGenre.count} plays` : 'Start listening to discover'}
                  delay={0.15}
                  accent="pink"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <HeroCard
                  label="Favorite artist"
                  value={data?.favoriteArtist?.name || '—'}
                  subtitle={data?.favoriteArtist ? `${data.favoriteArtist.count} plays` : 'Listen more to unlock'}
                  delay={0.2}
                  accent="emerald"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
                    </svg>
                  }
                />
                <HeroCard
                  label="Weekly activity"
                  value={weeklyTrend.reduce((sum, d) => sum + (d.plays || 0), 0)}
                  suffix="plays"
                  subtitle="Last 7 days"
                  delay={0.25}
                  accent="amber"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12h4l3-9 4 18 3-9h4" />
                    </svg>
                  }
                />
                <HeroCard
                  label="Listening streak"
                  value={data?.listeningStreak || 0}
                  suffix="days"
                  subtitle={data?.listeningStreak > 0 ? 'Keep it alive!' : 'Listen today to start'}
                  delay={0.3}
                  accent="cyan"
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
                    </svg>
                  }
                />
              </div>
            </section>

            {/* Charts row */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <ChartCard delay={0.05} className="lg:col-span-2">
                <SectionHeader eyebrow="Weekly trend" title="Plays over the last 7 days" />
                <div className="h-72 min-w-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weeklyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00FFFF" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#00FFFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={11}
                        tickFormatter={(d) => {
                          const dd = new Date(d);
                          return dd.toLocaleDateString(undefined, { weekday: 'short' });
                        }}
                      />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                      <Tooltip content={<TooltipShell />} cursor={{ stroke: 'rgba(0,255,255,0.3)', strokeWidth: 1 }} />
                      <Area
                        type="monotone"
                        dataKey="plays"
                        stroke="#00FFFF"
                        strokeWidth={2.5}
                        fill="url(#weeklyGrad)"
                        animationDuration={900}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard delay={0.1}>
                <SectionHeader eyebrow="Genres" title="Top breakdown" />
                {genreDistribution.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-sm text-gray-500">No genre data yet</div>
                ) : (
                  <div className="h-72 flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genreDistribution}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          stroke="rgba(0,0,0,0.4)"
                          animationDuration={800}
                        >
                          {genreDistribution.map((entry, idx) => (
                            <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<TooltipShell />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {genreDistribution.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {genreDistribution.slice(0, 6).map((g, idx) => (
                      <div key={g.name} className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-white/80 truncate">{g.name}</span>
                        <span className="text-white/40 ml-auto">{g.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </section>

            {/* Hourly bar chart */}
            <section>
              <ChartCard delay={0.05}>
                <SectionHeader eyebrow="When you listen" title="Plays by hour of day" />
                <div className="h-64 min-w-0 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A855F7" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#00FFFF" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="hour"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={11}
                        tickFormatter={(h) => (h % 3 === 0 ? formatHour(h) : '')}
                      />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <TooltipShell active={active} payload={payload} label={formatHour(label)} />
                        )}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                      <Bar
                        dataKey="plays"
                        fill="url(#hourGrad)"
                        radius={[6, 6, 0, 0]}
                        animationDuration={900}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </section>

            {/* Recently played */}
            <section>
              <SectionHeader eyebrow="History" title="Recently played" />
              {recentlyPlayed.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#13141d] p-6 text-center text-sm text-gray-500">
                  No recent plays yet
                </div>
              ) : (
                <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 px-1 [scrollbar-width:thin]">
                  {recentlyPlayed.map((entry, idx) => {
                    const cover = entry.song.album?.images?.[0]?.url || entry.song.cover_art_url || albumArtPlaceholder;
                    return (
                      <motion.button
                        key={`${entry.song._id}-${entry.played_at}-${idx}`}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.04 }}
                        whileHover={{ y: -4, transition: { duration: 0.15 } }}
                        type="button"
                        onClick={() => playTrack && playTrack(entry.song)}
                        className="group w-44 shrink-0 rounded-xl border border-white/10 bg-[#13141d] p-3 text-left hover:border-neon-blue/40 hover:bg-[#181a25] transition"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg bg-black/40">
                          <img
                            src={apiService.resolveMediaUrl ? apiService.resolveMediaUrl(cover) : cover}
                            alt={entry.song.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.target.src = albumArtPlaceholder; }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">Play</div>
                          </div>
                        </div>
                        <p className="mt-3 truncate text-sm font-bold text-white">{entry.song.name}</p>
                        <p className="truncate text-xs text-gray-400">{(entry.song.artists || []).map((a) => a.name).join(', ') || 'Unknown'}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">{formatRelative(entry.played_at)}</p>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Timeline insights */}
            {timelineCards.length > 0 && (
              <section>
                <SectionHeader eyebrow="Activity feed" title="What stands out" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {timelineCards.map((card, idx) => (
                      <motion.div
                        key={card.title}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        className="relative rounded-2xl border border-white/10 bg-[#13141d] p-5 overflow-hidden"
                      >
                        <div
                          aria-hidden
                          className={`pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full blur-3xl ${
                            { cyan: 'bg-cyan-400/20', purple: 'bg-purple-500/20', pink: 'bg-pink-500/20', amber: 'bg-amber-400/20' }[card.accent]
                          }`}
                        />
                        <div className="relative z-10">
                          <p className="text-base font-bold text-white">{card.title}</p>
                          <p className="mt-1 text-xs text-white/60">{card.sub}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
