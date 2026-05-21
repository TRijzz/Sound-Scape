import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../services/api';
import { useMusic } from '../../contexts/MusicContext';

const EyeIcon = ({ open }) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a17.86 17.86 0 0 1 4.06-5.94" />
        <path d="M9.9 4.24A10.91 10.91 0 0 1 12 4c6.5 0 10 7 10 7a17.4 17.4 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const ShieldCheck = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v7c0 4.5 3.2 8.5 8 10 4.8-1.5 8-5.5 8-10V5l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const evaluateStrength = (pw) => {
  if (!pw) return { score: 0, label: '—', tone: 'gray' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  const buckets = [
    /[a-z]/.test(pw),
    /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw)
  ].filter(Boolean).length;
  score += Math.min(2, Math.max(0, buckets - 2));
  if (/^(password|qwerty|12345|abcdef|letmein|welcome)/i.test(pw)) score = Math.min(score, 1);
  const labels = [
    { label: 'Too weak', tone: 'red' },
    { label: 'Weak', tone: 'red' },
    { label: 'Fair', tone: 'amber' },
    { label: 'Good', tone: 'emerald' },
    { label: 'Strong', tone: 'cyan' }
  ];
  return { score, ...labels[Math.min(score, 4)] };
};

const toneColor = (tone, fallback = 'rgba(255,255,255,0.07)') => ({
  red: '#f87171', amber: '#fbbf24', emerald: '#34d399', cyan: '#22d3ee', gray: fallback
}[tone] || fallback);

const useCountdown = (initialSeconds) => {
  const [remaining, setRemaining] = React.useState(initialSeconds);
  React.useEffect(() => {
    setRemaining(initialSeconds);
    if (!initialSeconds) return undefined;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);
  return remaining;
};

const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const OtpInput = ({ value, onChange, length = 6, autoFocus = true }) => {
  const refs = React.useRef([]);
  const digits = value.split('').slice(0, length);
  while (digits.length < length) digits.push('');

  const setAt = (idx, ch) => {
    const arr = [...digits];
    arr[idx] = ch;
    onChange(arr.join('').slice(0, length));
  };

  const handleKey = (idx) => (e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handleChange = (idx) => (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setAt(idx, '');
      return;
    }
    if (raw.length > 1) {
      // paste case
      const pasted = raw.slice(0, length - idx).split('');
      const arr = [...digits];
      pasted.forEach((c, i) => { arr[idx + i] = c; });
      onChange(arr.join('').slice(0, length));
      const nextIdx = Math.min(length - 1, idx + pasted.length);
      refs.current[nextIdx]?.focus();
      return;
    }
    setAt(idx, raw);
    if (idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text) return;
    e.preventDefault();
    const clean = text.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    const idx = Math.min(length - 1, clean.length);
    refs.current[idx]?.focus();
  };

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digits[i]}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          autoFocus={autoFocus && i === 0}
          className={`h-14 w-12 sm:w-14 rounded-xl border bg-white/[0.04] text-center text-2xl font-black text-white outline-none transition focus:ring-2 ${
            digits[i] ? 'border-cyan-400/60 ring-cyan-400/20' : 'border-white/10 focus:border-neon-blue/60 focus:ring-neon-blue/20'
          }`}
        />
      ))}
    </div>
  );
};

const StepIndicator = ({ step }) => (
  <div className="flex items-center justify-center gap-3 mb-1">
    {[1, 2, 3].map((n) => {
      const active = step === n;
      const done = step > n;
      return (
        <React.Fragment key={n}>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                backgroundColor: done ? 'rgba(52,211,153,0.18)' : active ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                borderColor: done ? 'rgba(52,211,153,0.5)' : active ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                color: done ? '#34d399' : active ? '#22d3ee' : 'rgba(255,255,255,0.4)'
              }}
              transition={{ duration: 0.3 }}
              className="flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black"
            >
              {done ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : n}
            </motion.div>
          </div>
          {n < 3 && (
            <motion.div
              animate={{ backgroundColor: step > n ? 'rgba(52,211,153,0.5)' : step === n ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.08)' }}
              transition={{ duration: 0.3 }}
              className="h-[2px] w-8 sm:w-12"
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const stepLabel = (step) => {
  switch (step) {
    case 1: return 'Verify your identity';
    case 2: return 'Check your email';
    case 3: return 'Choose a new password';
    default: return '';
  }
};

const ChangePassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useMusic();

  const [step, setStep] = React.useState(1);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);

  const [otp, setOtp] = React.useState('');
  const [maskedEmail, setMaskedEmail] = React.useState('');
  const [otpExpiresIn, setOtpExpiresIn] = React.useState(0);

  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [touched, setTouched] = React.useState({});

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const remaining = useCountdown(otpExpiresIn);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/security/change-password' } });
    }
  }, [isAuthenticated, navigate]);

  const strength = evaluateStrength(newPassword);
  const matchesConfirm = confirmPassword.length === 0 || confirmPassword === newPassword;
  const samePasswords = newPassword.length > 0 && currentPassword === newPassword;
  const newPasswordValid =
    newPassword.length >= 8 &&
    strength.score >= 3 &&
    matchesConfirm &&
    confirmPassword.length > 0 &&
    !samePasswords;

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    if (!currentPassword) return;
    try {
      setLoading(true);
      const res = await apiService.initChangePassword({ currentPassword });
      setMaskedEmail(res?.maskedEmail || '');
      setOtpExpiresIn(typeof res?.expiresInSeconds === 'number' ? res.expiresInSeconds : 600);
      setOtp('');
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setInfo('');
    try {
      setLoading(true);
      const res = await apiService.initChangePassword({ currentPassword });
      setOtp('');
      setMaskedEmail(res?.maskedEmail || maskedEmail);
      setOtpExpiresIn(typeof res?.expiresInSeconds === 'number' ? res.expiresInSeconds : 600);
      setInfo('A new code is on its way.');
    } catch (err) {
      setError(err?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpNext = (e) => {
    e?.preventDefault();
    setError('');
    if (otp.length < 6) {
      setError('Enter the full 6-digit code from your email.');
      return;
    }
    setStep(3);
  };

  const handleSubmitNewPassword = async (e) => {
    e?.preventDefault();
    setError('');
    setTouched({ next: true, confirm: true });
    if (!newPasswordValid) return;
    try {
      setLoading(true);
      await apiService.changePassword({ otp, newPassword });
      setSuccess(true);
      window.setTimeout(() => {
        try { logout && logout(); } catch { /* ignore */ }
        try { localStorage.removeItem('authTokens'); } catch { /* ignore */ }
        navigate('/login', {
          state: {
            from: '/security/change-password',
            notice: 'Password updated. Please sign in again.'
          }
        });
      }, 4500);
    } catch (err) {
      setError(err?.message || 'Failed to update password');
      // If OTP was wrong/expired, drop the user back to step 2
      if (/code|otp|verify/i.test(err?.message || '')) {
        setStep(2);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  const checks = [
    { label: 'At least 8 characters', ok: newPassword.length >= 8 },
    { label: 'Mix of letters, numbers, and symbols', ok: strength.score >= 3 },
    { label: 'Different from current password', ok: !samePasswords && newPassword.length > 0 },
    { label: 'Confirmation matches', ok: confirmPassword.length > 0 && matchesConfirm }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-purple-500/12 blur-[140px]"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg px-4 py-12 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <div className="relative px-7 py-6 border-b border-white/10">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,191,255,0.18),transparent_60%)]" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-neon-blue">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-blue">Security</p>
                <h1 className="text-xl font-black text-white">Change password</h1>
              </div>
            </div>
          </div>

          {!success && (
            <div className="px-7 pt-5">
              <StepIndicator step={step} />
              <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.22em] text-white/55">{stepLabel(step)}</p>
            </div>
          )}

          <div className="px-7 py-6">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 6, 0] }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.4)]"
                  >
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                  <h2 className="mt-4 text-xl font-bold text-white">Password updated</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    A confirmation email has been sent to your inbox — it includes a "wasn't me" recovery link if you didn't make this change.
                  </p>
                  <p className="mt-4 text-xs text-white/40">Signing you out for safety…</p>
                </motion.div>
              ) : step === 1 ? (
                <motion.form
                  key="step1"
                  onSubmit={handleSendOtp}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.18em] text-white/60 mb-2">Current password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        autoComplete="current-password"
                        autoFocus
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-white placeholder-white/30 outline-none transition focus:border-neon-blue/60 focus:ring-2 focus:ring-neon-blue/20"
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                        aria-label={showCurrent ? 'Hide password' : 'Show password'}
                      >
                        <EyeIcon open={showCurrent} />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-white/45">We'll email a one-time code to confirm it's really you before changing your password.</p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <Link to="/settings" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={!currentPassword || loading}
                      className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-wider transition shadow-lg ${
                        currentPassword && !loading
                          ? 'bg-neon-blue text-dark-bg hover:scale-[1.02] shadow-cyan-400/30'
                          : 'bg-white/[0.05] text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {loading ? 'Sending…' : 'Send verification code'}
                    </button>
                  </div>
                </motion.form>
              ) : step === 2 ? (
                <motion.form
                  key="step2"
                  onSubmit={handleOtpNext}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <p className="text-sm text-white/75">
                      We sent a 6-digit code to {maskedEmail ? <span className="font-bold text-white">{maskedEmail}</span> : 'your email'}. Enter it below to continue.
                    </p>
                  </div>

                  <OtpInput value={otp} onChange={setOtp} length={6} />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/45">
                      {remaining > 0 ? <>Code expires in <span className="font-bold text-white/70">{formatTime(remaining)}</span></> : 'Code expired'}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || remaining > 540}
                      className="font-bold uppercase tracking-wider text-neon-blue hover:text-white disabled:text-white/30 disabled:cursor-not-allowed transition"
                    >
                      Resend
                    </button>
                  </div>

                  {info && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      {info}
                    </motion.div>
                  )}
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setOtp(''); setError(''); setInfo(''); }}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={otp.length < 6 || loading}
                      className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-wider transition shadow-lg ${
                        otp.length >= 6 && !loading
                          ? 'bg-neon-blue text-dark-bg hover:scale-[1.02] shadow-cyan-400/30'
                          : 'bg-white/[0.05] text-white/40 cursor-not-allowed'
                      }`}
                    >
                      Continue
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="step3"
                  onSubmit={handleSubmitNewPassword}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.18em] text-white/60 mb-2">New password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoFocus
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, next: true }))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-white placeholder-white/30 outline-none transition focus:border-neon-blue/60 focus:ring-2 focus:ring-neon-blue/20"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                        aria-label={showNew ? 'Hide password' : 'Show password'}
                      >
                        <EyeIcon open={showNew} />
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ backgroundColor: i < strength.score ? toneColor(strength.tone) : 'rgba(255,255,255,0.07)' }}
                            transition={{ duration: 0.3 }}
                            className="h-1.5 flex-1 rounded-full"
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Strength</span>
                        <span className={`text-[11px] font-bold ${
                          strength.tone === 'cyan' ? 'text-cyan-300'
                          : strength.tone === 'emerald' ? 'text-emerald-300'
                          : strength.tone === 'amber' ? 'text-amber-300'
                          : strength.tone === 'red' ? 'text-red-300'
                          : 'text-white/40'}`}>
                          {newPassword ? strength.label : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.18em] text-white/60 mb-2">Confirm new password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 pr-12 text-white placeholder-white/30 outline-none transition focus:ring-2 ${
                          touched.confirm && confirmPassword && !matchesConfirm
                            ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20'
                            : 'border-white/10 focus:border-neon-blue/60 focus:ring-neon-blue/20'
                        }`}
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                    {touched.confirm && confirmPassword && !matchesConfirm && (
                      <p className="mt-2 text-xs text-red-300">Passwords don't match.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50 mb-3">Requirements</p>
                    <ul className="space-y-2">
                      {checks.map((c) => (
                        <li key={c.label} className="flex items-center gap-2 text-sm">
                          <motion.span
                            animate={{ scale: c.ok ? 1.1 : 1 }}
                            transition={{ duration: 0.2 }}
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${c.ok ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/40' : 'bg-white/[0.04] text-white/40 border border-white/10'}`}
                          >
                            {c.ok ? '✓' : '•'}
                          </motion.span>
                          <span className={c.ok ? 'text-white/85' : 'text-white/55'}>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setStep(2); setError(''); }}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!newPasswordValid || loading}
                      className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-wider transition shadow-lg ${
                        newPasswordValid && !loading
                          ? 'bg-neon-blue text-dark-bg hover:scale-[1.02] shadow-cyan-400/30'
                          : 'bg-white/[0.05] text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          Updating…
                        </span>
                      ) : 'Update password'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="px-7 py-4 border-t border-white/10 bg-white/[0.02]">
            <p className="text-[11px] text-white/45">
              For your safety, changing your password signs out other devices and emails you a confirmation. The email includes a one-time recovery link in case you didn't request the change.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChangePassword;
